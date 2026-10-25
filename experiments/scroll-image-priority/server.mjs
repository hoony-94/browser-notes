// 실험 1 서버: 쇼핑몰처럼 이미지가 많은 긴 페이지를 HTTP/2로 내려주고,
// 연결 하나의 대역폭을 흉내 내 응답들이 그 대역폭을 나눠 쓰게 한다.
//
//   node server.mjs [--net slow] [--sched fair] [--log]
//
// 페이지 URL의 net·sched 쿼리가 있으면 그 연결은 해당 값을 따른다.

import http2 from "node:http2";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  CONDITIONS,
  DEFAULT_AT,
  HERO,
  PER_SECTION,
  PORT,
  PRODUCT,
  PROFILES,
  SCHEDULERS,
  SECTIONS,
} from "./config.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const { values: args } = parseArgs({
  options: {
    net: { type: "string", default: "none" },
    sched: { type: "string", default: "fair" },
    log: { type: "boolean", default: false },
  },
});

function ensureCert() {
  const dir = join(here, ".certs");
  const key = join(dir, "key.pem");
  const cert = join(dir, "cert.pem");
  if (!existsSync(cert)) {
    mkdirSync(dir, { recursive: true });
    execFileSync("openssl", [
      "req", "-x509", "-newkey", "rsa:2048", "-nodes",
      "-keyout", key, "-out", cert, "-days", "365",
      "-subj", "/CN=localhost",
      "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1",
    ], { stdio: "ignore" });
  }
  return { key: readFileSync(key), cert: readFileSync(cert) };
}

// 크기만 맞춘 SVG. 앞쪽 주석으로 용량을 채우므로 다 받아야 그려진다.
function makeSvg(label, { width, height, bytes }, hue) {
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><!-- `;
  const tail = ` --><rect width="${width}" height="${height}" fill="hsl(${hue} 55% 82%)"/>`
    + `<text x="${width / 2}" y="${height / 2}" font-family="sans-serif" font-size="${Math.round(width / 7)}" `
    + `text-anchor="middle" dominant-baseline="central" fill="hsl(${hue} 45% 28%)">${label}</text></svg>`;
  const pad = Math.max(0, bytes - Buffer.byteLength(head) - Buffer.byteLength(tail));
  return Buffer.from(head + "x".repeat(pad) + tail);
}

const images = new Map([["hero", makeSvg("HERO", HERO, 210)]]);
for (let s = 1; s <= SECTIONS; s++) {
  for (let p = 1; p <= PER_SECTION; p++) {
    images.set(`p-${s}-${p}`, makeSvg(`${s}-${p}`, PRODUCT, (s * 47 + p * 11) % 360));
  }
}

// Chrome은 HTTP/2 우선순위를 priority 헤더(RFC 9218)와 PRIORITY 프레임의 weight로 함께 알린다.
// weight는 Chrome의 내부 우선순위 0(가장 높음)~7을 1~256으로 바꾼 값이라 다시 0~7로 되돌린다.
function urgencyFromWeight(weight) {
  return Math.min(7, Math.max(0, Math.round(7 - (weight - 1) / (255.9 / 7))));
}

function parsePriorityHeader(value) {
  const urgency = /u=(\d)/.exec(value ?? "");
  return {
    urgency: urgency ? Number(urgency[1]) : 3,
    incremental: /(^|[\s,])i(\s*(,|$)|=\?1)/.test(value ?? ""),
  };
}

// 연결 하나의 내려받기 대역폭. 응답 조각을 정해진 속도로만 내보낸다.
class Pipe {
  constructor() {
    this.jobs = [];
    this.log = [];
    this.timer = null;
    this.configure("none", "fair");
  }

  configure(net, sched) {
    this.net = PROFILES[net] ? net : "none";
    this.sched = SCHEDULERS[sched] ? sched : "fair";
    this.bytesPerMs = PROFILES[this.net].kbps / 8;
    this.latency = PROFILES[this.net].latency;
    if (!this.bytesPerMs && this.jobs.length) {
      for (const job of this.jobs) {
        if (!job.stream.destroyed) job.stream.end(job.body.subarray(job.offset));
        job.onEnd();
      }
      this.jobs = [];
    }
  }

  add(job) {
    if (!this.bytesPerMs) {
      job.stream.end(job.body);
      job.onEnd();
      return;
    }
    job.offset = 0;
    this.jobs.push(job);
    if (!this.timer) {
      this.last = performance.now();
      this.budget = 0;
      this.timer = setInterval(() => this.pump(), 4);
    }
  }

  pick(jobs) {
    if (this.sched === "fair") return jobs;
    const top = Math.min(...jobs.map((job) => job.urgency));
    const level = jobs.filter((job) => job.urgency === top);
    const sequential = level.filter((job) => !job.incremental);
    return sequential.length ? [sequential[0]] : level;
  }

  pump() {
    const now = performance.now();
    this.budget += (now - this.last) * this.bytesPerMs;
    this.last = now;
    this.jobs = this.jobs.filter((job) => !job.stream.destroyed);

    while (this.budget >= 1 && this.jobs.length) {
      const targets = this.pick(this.jobs);
      const share = Math.max(1, Math.floor(this.budget / targets.length));
      for (const job of targets) {
        const size = Math.min(share, job.body.length - job.offset, Math.floor(this.budget));
        if (size <= 0) continue;
        job.stream.write(job.body.subarray(job.offset, job.offset + size));
        job.offset += size;
        this.budget -= size;
        if (job.offset >= job.body.length) {
          job.stream.end();
          job.onEnd();
        }
      }
      this.jobs = this.jobs.filter((job) => job.offset < job.body.length);
    }

    // 쉬는 동안 쌓인 몫을 한꺼번에 쓰지 않도록 20ms 분량까지만 남긴다.
    this.budget = Math.min(this.budget, this.bytesPerMs * 20);
    if (!this.jobs.length) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

const pipes = new WeakMap();
function pipeFor(session) {
  if (!pipes.has(session)) {
    const pipe = new Pipe();
    pipe.configure(args.net, args.sched);
    pipe.startedAt = performance.now();
    pipes.set(session, pipe);
  }
  return pipes.get(session);
}

function send(stream, headers, pipe, body, contentType) {
  const priority = parsePriorityHeader(headers.priority);
  const elapsed = () => Math.round(performance.now() - pipe.startedAt);
  // 서버가 실제로 받은 우선순위 신호를 남긴다. /__log로 측정 스크립트가 가져간다.
  const record = { path: headers[":path"], start: elapsed(), urgency: priority.urgency, changes: [], done: null };
  pipe.log.push(record);
  const job = {
    stream,
    body,
    urgency: priority.urgency,
    incremental: priority.incremental,
    onEnd: () => {
      record.done = elapsed();
      if (args.log) console.log(`${String(record.done).padStart(6)} ms  done  #${stream.id} ${record.path}`);
    },
  };
  // 브라우저가 우선순위를 바꾸면(예: 화면 안에 들어온 이미지를 High로 올림) 바로 반영한다.
  stream.on("priority", (_id, _parent, weight) => {
    const urgency = urgencyFromWeight(weight);
    if (urgency === job.urgency) return;
    record.changes.push([elapsed(), urgency]);
    if (args.log) console.log(`${String(elapsed()).padStart(6)} ms  prio  #${stream.id} ${record.path} u=${job.urgency} -> u=${urgency}`);
    job.urgency = urgency;
  });
  if (args.log) {
    console.log(`${String(record.start).padStart(6)} ms  start #${stream.id} ${record.path}  priority="${headers.priority ?? ""}" weight=${stream.state.weight}`);
  }

  setTimeout(() => {
    if (stream.destroyed) return;
    stream.respond({
      ":status": 200,
      "content-type": contentType,
      "cache-control": "no-store",
      "timing-allow-origin": "*",
    });
    pipe.add(job);
  }, pipe.latency);
}

function attr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

// 실험 2의 <head> 스크립트. 해시가 없으면 히어로를, 있으면 도착 화면 이미지를 먼저 받게 하고
// 필요하면 도착 위치의 요소가 파싱될 때까지 첫 렌더를 미룬다.
// 도착 화면은 "그 섹션 + 다음 섹션 첫 줄"로 어림한다(390px 화면에서 2열).
function hashScript(cond) {
  const map = {};
  for (let s = 1; s <= SECTIONS; s++) {
    const ids = Array.from({ length: PER_SECTION }, (_, i) => `p-${s}-${i + 1}`);
    if (s < SECTIONS) ids.push(`p-${s + 1}-1`, `p-${s + 1}-2`);
    map[`section-${s}`] = ids.map((id) => `/img/${id}.svg`);
  }
  return `(() => {
  const add = (attrs) => {
    const link = document.createElement("link");
    for (const name in attrs) link.setAttribute(name, attrs[name]);
    document.head.append(link);
  };
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) {
    add({ rel: "preload", as: "image", href: "/img/hero.svg", fetchpriority: "high" });
    return;
  }
  const map = ${JSON.stringify(map)};${cond.preload ? `
  for (const href of map[id] || []) add({ rel: "preload", as: "image", href, fetchpriority: "high" });` : ""}${cond.expect ? `
  add({ rel: "expect", href: ${cond.expect === "end" ? `"#page-end"` : "location.hash"}, blocking: "render" });` : ""}
})();`;
}

function shopPage(params) {
  const condKey = CONDITIONS[params.get("cond")] ? params.get("cond") : "A";
  const cond = CONDITIONS[condKey];
  const at = Number(params.get("at")) || DEFAULT_AT;
  const cards = params.get("cards") === "eager" ? "eager" : "lazy";
  const heroHigh = cond.hero === "high";

  let sections = "";
  for (let s = 1; s <= SECTIONS; s++) {
    const boosted = cond.target === "high" && s === at;
    let items = "";
    for (let p = 1; p <= PER_SECTION; p++) {
      const id = `p-${s}-${p}`;
      const loading = boosted ? ` loading="eager" fetchpriority="high"` : cards === "lazy" ? ` loading="lazy"` : "";
      items += `<li><img src="/img/${id}.svg" width="${PRODUCT.width}" height="${PRODUCT.height}" alt="" elementtiming="${id}"${loading}>`
        + `<p>상품 ${s}-${p}</p><p class="price">${(19 + s + p) * 1000}원</p></li>`;
    }
    // 각 섹션이 파싱된 시각을 남겨, 해시 이동이 대상 파싱 직후인지 문서 파싱이 끝난 뒤인지 본다.
    sections += `<section id="section-${s}"><h2>섹션 ${s}</h2><ul class="grid">${items}</ul></section>`
      + `<script>__exp.parsed["section-${s}"] = performance.now()</script>\n`;
  }

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>실험 · ${condKey}</title>
<link rel="icon" href="data:,">
<script>${measureScript}</script>
${cond.hero === "preload" ? `<link rel="preload" as="image" href="/img/hero.svg" fetchpriority="high">` : ""}
${cond.hero === "script" ? `<script>${hashScript(cond)}</script>` : ""}
${params.get("expect") ? `<link rel="expect" href="#${attr(params.get("expect"))}" blocking="render">` : ""}
${params.has("vt") ? `<style>@view-transition { navigation: auto; }</style>` : ""}
<style>
  body { margin: 0; font: 15px/1.4 system-ui, sans-serif; color: #111; background: #fff; }
  .wrap { max-width: 480px; margin: 0 auto; }
  header { height: 52px; display: flex; align-items: center; padding: 0 16px; font-weight: 700; border-bottom: 1px solid #ddd; }
  .hero { display: block; width: 100%; height: auto; background: #dde; }
  section { padding: 20px 16px 8px; }
  h2 { margin: 0 0 12px; font-size: 20px; }
  .grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 16px 12px; }
  .grid img { display: block; width: 100%; height: auto; background: #eee; }
  .grid p { margin: 6px 0 0; }
  .grid .price { margin-top: 2px; font-weight: 700; }
  #exp-panel { position: fixed; left: 8px; right: 8px; bottom: 8px; padding: 8px 10px; font: 12px/1.5 ui-monospace, monospace; background: rgba(0,0,0,.82); color: #fff; border-radius: 6px; white-space: pre-wrap; }
</style>
</head>
<body>
<div class="wrap">
<header>조건 ${condKey} · ${attr(cond.label)}</header>
<img class="hero" src="/img/hero.svg" width="${HERO.width}" height="${HERO.height}" alt="" elementtiming="hero"${heroHigh ? ` fetchpriority="high"` : ""}>
<main>
${sections}</main>
</div>
${Number(params.get("tail")) > 0 ? `<script type="application/json" id="tail">${"x".repeat(Number(params.get("tail")) * 1000)}</script>` : ""}
<div id="page-end"></div>
<script>__exp.parsed["page-end"] = performance.now()</script>
</body>
</html>`;
}

// 페이지 맨 앞에서 실행되어, 이미지가 언제 요청·도착·표시됐는지와 스크롤 이동 시점을 기록한다.
const measureScript = `(() => {
  const exp = window.__exp = { scroll: [], loads: {}, el: {}, lcp: [], parsed: {} };
  const now = () => performance.now();
  let lastY = -1;
  const watchScroll = () => {
    if (scrollY !== lastY) { lastY = scrollY; exp.scroll.push([Math.round(now()), Math.round(scrollY)]); }
    if (now() < 6000) requestAnimationFrame(watchScroll);
  };
  requestAnimationFrame(watchScroll);
  document.addEventListener("load", (e) => {
    const img = e.target;
    if (img.tagName !== "IMG") return;
    const loadedAt = now();
    requestAnimationFrame(() => { exp.loads[img.getAttribute("elementtiming")] = { load: loadedAt, frame: now() }; });
  }, true);
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) exp.el[e.identifier] = { render: e.renderTime || e.loadTime, load: e.loadTime };
    }).observe({ type: "element", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) exp.lcp.push({ t: e.startTime, id: e.element && e.element.getAttribute("elementtiming") });
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}

  const idOf = (url) => (/\\/img\\/([\\w-]+)\\.svg/.exec(url) || [])[1];
  const shown = (id) => exp.el[id] ? exp.el[id].render : exp.loads[id] ? exp.loads[id].frame : null;
  window.__summary = () => {
    const res = {};
    for (const e of performance.getEntriesByType("resource")) {
      const id = idOf(e.name);
      if (id) res[id] = { start: e.startTime, end: e.responseEnd, bytes: e.encodedBodySize };
    }
    const visible = [...document.images].filter((img) => {
      const r = img.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight && r.width > 0;
    }).map((img) => img.getAttribute("elementtiming"));
    const visibleShown = visible.map(shown);
    const shownTimes = visibleShown.filter((t) => t !== null);
    const firstMove = exp.scroll.find(([, y]) => y > 0);
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    return {
      fcp: fcp ? fcp.startTime : null,
      firstFrame: exp.scroll[0] || null,
      parsed: exp.parsed,
      url: location.href,
      scrollY: Math.round(scrollY),
      viewport: [innerWidth, innerHeight],
      effectiveType: navigator.connection ? navigator.connection.effectiveType : null,
      visible,
      viewportDone: visibleShown.includes(null) ? null : Math.max(...visibleShown),
      viewportFirst: shownTimes.length ? Math.min(...shownTimes) : null,
      heroShown: shown("hero"),
      lcp: exp.lcp[exp.lcp.length - 1] || null,
      firstScroll: firstMove ? firstMove[0] : null,
      requested: Object.keys(res).length,
      requestedBytes: Object.values(res).reduce((sum, r) => sum + r.bytes, 0),
      res, el: exp.el, loads: exp.loads, scroll: exp.scroll,
    };
  };

  const ms = (t) => t == null ? "-" : Math.round(t) + " ms";
  addEventListener("load", () => setTimeout(() => {
    const s = window.__summary();
    const lines = [
      "도착 화면 이미지 모두 표시: " + ms(s.viewportDone),
      "도착 화면 첫 이미지 표시:  " + ms(s.viewportFirst),
      "히어로 표시:               " + ms(s.heroShown),
      "LCP:                       " + ms(s.lcp && s.lcp.t) + " (" + (s.lcp && s.lcp.id) + ")",
      "첫 화면 표시(FCP):         " + ms(s.fcp),
      "첫 프레임의 스크롤 위치:   " + (s.firstFrame ? s.firstFrame[1] + "px (" + ms(s.firstFrame[0]) + ")" : "-"),
      "해시 위치로 처음 이동:     " + ms(s.firstScroll),
      "요청한 이미지:             " + s.requested + "개 · " + Math.round(s.requestedBytes / 1000) + " KB",
    ];
    console.log("[실험 1]\\n" + lines.join("\\n"));
    console.table(s.visible.map((id) => ({ id, 요청: Math.round((s.res[id] || {}).start), 도착: Math.round((s.res[id] || {}).end), 표시: Math.round(shown(id)) })));
    if (new URLSearchParams(location.search).has("panel")) {
      const panel = document.createElement("div");
      panel.id = "exp-panel";
      panel.textContent = lines.join("\\n");
      document.body.append(panel);
    }
  }, 3000));
})();`;

function indexPage(params) {
  const tail = Number(params.get("tail")) || 0;
  const combos = [["none", "fair"], ["fast", "fair"], ["fast", "priority"], ["slow", "fair"], ["slow", "priority"]];
  const head = combos.map(([net, sched]) => `<th>${net === "none" ? "none" : `${net}<br>${sched}`}</th>`).join("");
  const rows = Object.entries(CONDITIONS).map(([key, c]) => {
    const cells = combos.map(([net, sched]) => {
      const query = `cond=${key}&net=${net}&sched=${sched}&tail=${tail}&panel`;
      return `<td><a href="/shop?${query}#section-${DEFAULT_AT}">중간</a> · <a href="/shop?${query}">맨 위</a></td>`;
    }).join("");
    return `<tr><td><b>${key}</b></td><td>${attr(c.label)}</td>${cells}</tr>`;
  }).join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>실험 1</title><style>body{font:14px/1.6 system-ui,sans-serif;max-width:960px;margin:24px auto;padding:0 16px}th,td{padding:4px 10px 4px 0;text-align:left;vertical-align:top}</style></head>
<body><h1>중간 진입 시 이미지 우선순위 실험</h1>
<p>"중간"은 <code>#section-${DEFAULT_AT}</code>로 바로 들어갑니다. 다시 잴 때는 새로고침하지 말고 이 목록에서 링크를 다시 누르세요.
새로고침은 해시 위치가 아니라 이전 스크롤 위치를 복원합니다.</p>
<p>페이지 끝 데이터: ${tail ? `<a href="/?tail=0">0 KB(실험 1)</a> · <b>100 KB(실험 2)</b>` : `<b>0 KB(실험 1)</b> · <a href="/?tail=100">100 KB(실험 2)</a>`}</p>
<table><tr><th>조건</th><th></th>${head}</tr>${rows}</table></body></html>`;
}

const server = http2.createSecureServer(ensureCert());
server.on("stream", (stream, headers) => {
  const url = new URL(headers[":path"], "https://localhost");
  const pipe = pipeFor(stream.session);

  if (url.pathname === "/shop") {
    pipe.configure(url.searchParams.get("net") ?? args.net, url.searchParams.get("sched") ?? args.sched);
    pipe.startedAt = performance.now();
    pipe.log = [];
    if (args.log) console.log(`\n--- ${url.search}  (${pipe.net}, ${pipe.sched})`);
    send(stream, headers, pipe, Buffer.from(shopPage(url.searchParams)), "text/html; charset=utf-8");
  } else if (url.pathname.startsWith("/img/")) {
    const body = images.get(url.pathname.slice(5).replace(/\.svg$/, ""));
    if (!body) return stream.respond({ ":status": 404 }, { endStream: true });
    send(stream, headers, pipe, body, "image/svg+xml");
  } else if (url.pathname === "/__log") {
    // 같은 연결에서 마지막으로 연 페이지의 요청 기록.
    stream.respond({ ":status": 200, "content-type": "application/json", "cache-control": "no-store" });
    stream.end(JSON.stringify(pipe.log));
  } else if (url.pathname === "/") {
    stream.respond({ ":status": 200, "content-type": "text/html; charset=utf-8" });
    stream.end(indexPage(url.searchParams));
  } else {
    stream.respond({ ":status": 404 }, { endStream: true });
  }
});
server.on("session", (session) => session.on("error", () => {}));
server.listen(PORT, () => {
  console.log(`실험 1 서버: https://localhost:${PORT}  (기본 net=${args.net}, sched=${args.sched})`);
});
