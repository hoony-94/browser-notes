// 자동 측정. 서버를 먼저 띄운 뒤 실행한다.
//
//   node run.mjs [--repeat 10] [--nets none,fast,slow] [--scheds fair,priority]
//                [--conds A,B,P,C,D] [--top A,B] [--cards lazy] [--tail 0]
//                [--name exp1] [--film] [--headed]
//
// Chrome을 띄워 측정마다 새 브라우저 컨텍스트(빈 캐시, 새 연결)에서 페이지를 연다.
// --film은 조건마다 한 번씩 화면을 녹화해, 같은 시각의 화면을 나란히 놓은 이미지를 만든다.

import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { CONDITIONS, DEFAULT_AT, ORIGIN, PORT, PROFILES, SCHEDULERS, VIEWPORT } from "./config.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const { values: args } = parseArgs({
  options: {
    repeat: { type: "string", default: "10" },
    nets: { type: "string", default: "none,fast,slow" },
    scheds: { type: "string", default: "fair,priority" },
    conds: { type: "string", default: "A,B,P,C,D" },
    top: { type: "string", default: "A,B" },
    cards: { type: "string", default: "lazy" },
    // 페이지 끝에 붙일 데이터 크기(KB). Next.js의 RSC payload처럼 본문 뒤에 오는 HTML을 흉내 낸다.
    tail: { type: "string", default: "0" },
    name: { type: "string", default: "exp" },
    film: { type: "boolean", default: false },
    // 필름스트립에 놓을 시각(초). 비우면 결과에 맞춰 정한다.
    times: { type: "string", default: "" },
    // 노트 본문 폭(700px)에 맞춘 작은 필름스트립.
    compact: { type: "boolean", default: false },
    // 저장한 결과 JSON으로 표만 다시 만든다.
    report: { type: "string", default: "" },
    headed: { type: "boolean", default: false },
  },
});
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

class Cdp {
  static open(url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.addEventListener("open", () => resolve(new Cdp(ws)));
      ws.addEventListener("error", reject);
    });
  }

  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = new Set();
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id) {
        const call = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) call.reject(new Error(`${call.method}: ${msg.error.message}`));
        else call.resolve(msg.result);
      } else {
        for (const listener of this.listeners) listener(msg);
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.nextId;
    this.ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject, method }));
  }

  on(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

function serverIsUp() {
  return new Promise((resolve) => {
    const socket = connect(PORT, "127.0.0.1", () => { socket.end(); resolve(true); });
    socket.on("error", () => resolve(false));
  });
}

async function launchChrome() {
  const profile = mkdtempSync(join(tmpdir(), "exp1-chrome-"));
  const chrome = spawn(CHROME, [
    ...(args.headed ? [] : ["--headless"]),
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--ignore-certificate-errors",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "about:blank",
  ], { stdio: "ignore" });

  for (let i = 0; i < 100; i++) {
    await sleep(100);
    try {
      const [port, path] = readFileSync(join(profile, "DevToolsActivePort"), "utf8").trim().split("\n");
      const cdp = await Cdp.open(`ws://127.0.0.1:${port}${path}`);
      const { product } = await cdp.send("Browser.getVersion");
      const close = async () => {
        const exited = new Promise((resolve) => chrome.once("exit", resolve));
        chrome.kill();
        await exited;
        rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      };
      return { cdp, product, close };
    } catch {}
  }
  chrome.kill();
  throw new Error("Chrome의 DevTools 포트를 찾지 못했습니다.");
}

const imageId = (url) => /\/img\/([\w-]+)\.svg/.exec(url)?.[1];

// 사용자가 도착 화면을 이미지까지 다 본 시각. 이미지가 먼저 끝나도 아직 맨 위를 보고 있거나
// 첫 화면 전이면 보이지 않으므로, 이미지 표시·해시 이동·첫 화면 중 가장 늦은 시각으로 본다.
function viewportSeen(run) {
  const { viewportDone, firstScroll, fcp } = run.summary;
  if (viewportDone === null || (run.entry === "mid" && firstScroll === null)) return null;
  return Math.max(viewportDone, run.entry === "mid" ? firstScroll : 0, fcp ?? 0);
}

// 중간 진입에서 해시 위치로 이동하기 전까지 맨 위가 보인 시간.
function topVisibleFor(run) {
  const { firstScroll, fcp } = run.summary;
  if (run.entry !== "mid" || firstScroll === null || fcp === null) return null;
  return Math.max(0, firstScroll - fcp);
}

async function measure(cdp, url, { film = false } = {}) {
  const { browserContextId } = await cdp.send("Target.createBrowserContext");
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank", browserContextId });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const page = (method, params) => cdp.send(method, params, sessionId);

  const requests = new Map();
  const frames = [];
  let base = null;
  let baseWall = null;
  let loaded = false;
  let lastActivity = Date.now();
  const stop = cdp.on(({ method, params, sessionId: from }) => {
    if (from !== sessionId) return;
    if (method === "Page.screencastFrame") {
      frames.push({ wall: params.metadata.timestamp, data: params.data });
      page("Page.screencastFrameAck", { sessionId: params.sessionId });
    } else if (method === "Network.requestWillBeSent") {
      if (base === null && params.type === "Document") {
        base = params.timestamp;
        baseWall = params.wallTime;
      }
      requests.set(params.requestId, {
        url: params.request.url,
        initial: params.request.initialPriority,
        start: params.timestamp,
        changes: [],
      });
      lastActivity = Date.now();
    } else if (method === "Network.resourceChangedPriority") {
      requests.get(params.requestId)?.changes.push([params.timestamp, params.newPriority]);
    } else if (method === "Network.responseReceived") {
      const request = requests.get(params.requestId);
      if (request) {
        request.protocol = params.response.protocol;
        // requestWillBeSent는 렌더러가 요청을 만든 시각, sendStart는 네트워크로 실제 보낸 시각이다.
        const { timing } = params.response;
        if (timing) request.sent = timing.requestTime + timing.sendStart / 1000;
      }
    } else if (method === "Network.loadingFinished" || method === "Network.loadingFailed") {
      const request = requests.get(params.requestId);
      if (request) request.end = params.timestamp;
      lastActivity = Date.now();
    } else if (method === "Page.loadEventFired") {
      loaded = true;
    }
  });

  await page("Network.enable");
  await page("Network.setCacheDisabled", { cacheDisabled: true });
  await page("Page.enable");
  await page("Emulation.setDeviceMetricsOverride", VIEWPORT);
  if (film) await page("Page.startScreencast", { format: "jpeg", quality: 80, everyNthFrame: 1 });
  await page("Page.navigate", { url });

  const startedAt = Date.now();
  while (Date.now() - startedAt < 30_000) {
    await sleep(100);
    const pending = [...requests.values()].filter((r) => r.end === undefined).length;
    if (loaded && pending === 0 && Date.now() - lastActivity > 1000) break;
  }

  if (film) await page("Page.stopScreencast");
  const { result } = await page("Runtime.evaluate", { expression: "window.__summary()", returnByValue: true });
  const { result: serverLog } = await page("Runtime.evaluate", {
    expression: "fetch('/__log').then((r) => r.json())",
    awaitPromise: true,
    returnByValue: true,
  });
  stop();
  await cdp.send("Target.disposeBrowserContext", { browserContextId });

  const rel = (t) => (t === undefined ? null : Math.round((t - base) * 1000));
  const images = {};
  let protocol = null;
  for (const r of requests.values()) {
    const id = imageId(r.url);
    if (!id) {
      if (r.url.includes("/shop")) protocol = r.protocol;
      continue;
    }
    images[id] = {
      initial: r.initial,
      start: rel(r.start),
      sent: rel(r.sent),
      end: rel(r.end),
      changes: r.changes.map(([t, p]) => [rel(t), p]),
    };
  }
  // 서버 기록: 서버가 요청을 받은 시각, 처음 받은 urgency, PRIORITY 프레임으로 바뀐 urgency, 응답 완료 시각.
  const server = {};
  for (const r of serverLog.value) {
    const id = imageId(r.path);
    if (id) server[id] = { start: r.start, urgency: r.urgency, changes: r.changes, done: r.done };
  }
  const { res, el, loads, ...summary } = result.value;
  // 화면 녹화 프레임의 시각도 문서 요청 기준 ms로 바꾼다. 새 프레임은 화면이 바뀔 때만 온다.
  const filmFrames = frames
    .map((f) => ({ t: Math.round((f.wall - baseWall) * 1000), data: f.data }))
    .filter((f) => f.t >= 0);
  return { protocol, summary, images, server, ...(film && { frames: filmFrames }) };
}

const median = (values) => {
  const sorted = values.filter((v) => v !== null && v !== undefined && Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return Math.round(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2);
};
const mostCommon = (values) => {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
};

function summarize(runs) {
  const groups = new Map();
  for (const run of runs) {
    const key = `${run.net}|${run.sched}|${run.entry}|${run.cond}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(run);
  }
  const rows = [];
  for (const [key, list] of groups) {
    const [net, sched, entry, cond] = key.split("|");
    const visibleImages = list.flatMap((run) => run.summary.visible.filter((id) => id !== "hero").map((id) => run.images[id]).filter(Boolean));
    const boosts = visibleImages.map((img) => img.changes.find(([, p]) => p === "High" || p === "VeryHigh")?.[0] ?? null);
    const visibleServer = list.flatMap((run) => run.summary.visible.filter((id) => id !== "hero").map((id) => run.server[id]).filter(Boolean));
    const serverBoosts = visibleServer.map((r) => (r.urgency <= 1 ? r.start : r.changes.find(([, u]) => u <= 1)?.[0] ?? null));
    rows.push({
      net, sched, entry, cond, n: list.length,
      viewportDone: median(list.map((r) => r.summary.viewportDone)),
      viewportSeen: median(list.map(viewportSeen)),
      viewportSeenRange: (() => {
        const values = list.map(viewportSeen).filter(Number.isFinite);
        return values.length ? `${Math.round(Math.min(...values))}–${Math.round(Math.max(...values))}` : "-";
      })(),
      topVisible: median(list.map(topVisibleFor)),
      viewportFirst: median(list.map((r) => r.summary.viewportFirst)),
      heroShown: median(list.map((r) => r.summary.heroShown)),
      lcp: median(list.map((r) => r.summary.lcp?.t)),
      lcpId: mostCommon(list.map((r) => r.summary.lcp?.id)),
      firstScroll: median(list.map((r) => r.summary.firstScroll)),
      fcp: median(list.map((r) => r.summary.fcp)),
      // 해시 위치로 이동하기 전에 첫 화면이 그려졌는가 = 사용자가 맨 위를 먼저 봤는가.
      topPainted: entry === "mid"
        ? `${list.filter((r) => r.summary.fcp !== null && r.summary.firstScroll !== null && r.summary.fcp < r.summary.firstScroll).length}/${list.length}`
        : "-",
      targetParsed: median(list.map((r) => r.summary.parsed?.[`section-${DEFAULT_AT}`])),
      endParsed: median(list.map((r) => r.summary.parsed?.["page-end"])),
      topRequested: median(list.map((r) => Object.keys(r.images).filter((id) => /^p-[12]-/.test(id)).length)),
      requested: median(list.map((r) => r.summary.requested)),
      kb: median(list.map((r) => r.summary.requestedBytes / 1000)),
      heroPriority: mostCommon(list.map((r) => r.images.hero?.initial)),
      targetStart: median(visibleImages.map((img) => img.start)),
      targetSent: median(visibleImages.map((img) => img.sent)),
      targetPriority: mostCommon(visibleImages.map((img) => img.initial)),
      targetBoost: median(boosts),
      targetServerHigh: median(serverBoosts),
      serverHighRate: `${serverBoosts.filter((t) => t !== null).length}/${serverBoosts.length}`,
    });
  }
  return rows;
}

function toMarkdown(rows, meta) {
  const ms = (v) => (v === null ? "-" : `${v}`);
  const lines = [
    `# ${meta.name ?? "실험"} 결과 (${meta.date})`,
    "",
    `- 브라우저: ${meta.product} (헤드리스), 뷰포트 ${VIEWPORT.width}×${VIEWPORT.height} @${VIEWPORT.deviceScaleFactor}x`,
    `- 반복: 조건마다 ${meta.repeat}회, 값은 중앙값(ms). 시각은 문서 요청 기준`,
    `- 상품 이미지 loading: ${meta.cards}, 도착 위치: #section-${DEFAULT_AT}, 페이지 끝 데이터: ${meta.tail ?? 0} KB`,
    "",
    "## 결과",
    "",
    "| 네트워크 | 서버 | 진입 | 조건 | 도착 화면 완성 (범위) | 이미지 표시 끝 | 첫 화면(FCP) | 맨 위가 먼저 그려짐 | 맨 위가 보인 시간 | LCP (요소) | 요청 이미지 (그중 섹션 1~2) |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const r of rows) {
    lines.push(`| ${r.net} | ${r.sched} | ${r.entry} | ${r.cond} | ${ms(r.viewportSeen)} (${r.viewportSeenRange}) | ${ms(r.viewportDone)} | ${ms(r.fcp)} | ${r.topPainted} | ${ms(r.topVisible)} | ${ms(r.lcp)} (${r.lcpId}) | ${r.requested}개 · ${r.kb} KB (${r.topRequested}) |`);
  }
  lines.push(
    "",
    "## 과정",
    "",
    "| 네트워크 | 서버 | 진입 | 조건 | 도착 섹션 파싱 | 문서 파싱 끝 | 해시 이동 | 히어로 표시 | 히어로 우선순위 | 도착 이미지 우선순위 | 도착 이미지 요청 → 브라우저 High 승격 | 서버가 High로 받은 시각 (비율) |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
  );
  for (const r of rows) {
    lines.push(`| ${r.net} | ${r.sched} | ${r.entry} | ${r.cond} | ${ms(r.targetParsed)} | ${ms(r.endParsed)} | ${ms(r.firstScroll)} | ${ms(r.heroShown)} | ${r.heroPriority} | ${r.targetPriority} | ${ms(r.targetStart)} → ${ms(r.targetBoost)} | ${ms(r.targetServerHigh)} (${r.serverHighRate}) |`);
  }
  return lines.join("\n") + "\n";
}

// 같은 시각의 화면을 조건별로 나란히 놓은 필름스트립 이미지를 만든다.
// 화면 녹화 프레임은 화면이 바뀔 때만 오므로, 각 시각에는 그 시각 이전의 마지막 프레임을 쓴다.
async function composeFilm(cdp, title, groupRuns, dir, pngPath) {
  mkdirSync(dir, { recursive: true });
  let times = args.times.split(",").filter(Boolean).map((s) => Math.round(Number(s) * 1000));
  if (!times.length) {
    const maxT = Math.max(...groupRuns.map((r) => r.summary.viewportDone ?? 0)) + 200;
    const step = Math.max(250, Math.ceil((maxT - 1000) / 6 / 250) * 250);
    times = [250, 500, 750];
    for (let t = 1000; times.length < 10; t += step) times.push(t);
  }

  const sec = (ms) => (ms === null || ms === undefined ? "-" : `${(ms / 1000).toFixed(2)}초`);
  const rows = groupRuns.map((run) => {
    const s = run.summary;
    const cells = times.map((t) => {
      // 첫 화면 전 프레임은 헤드리스에서 검게 나오지만 실제로는 아무것도 그려지지 않은 상태다.
      const frame = run.frames.filter((f) => f.t <= t).at(-1);
      if (!frame || s.fcp === null || t < s.fcp) return `<td><div class="blank">첫 화면 전</div></td>`;
      const file = join(dir, `${run.cond}-${frame.t}.jpg`);
      writeFileSync(file, Buffer.from(frame.data, "base64"));
      const seen = viewportSeen(run);
      const done = seen !== null && t >= seen;
      return `<td class="${done ? "done" : ""}"><img class="shot" src="${relative(dirname(pngPath), file)}"></td>`;
    }).join("");
    const done = `${run.entry === "mid" ? "도착 화면" : "첫 화면 이미지"} 완성 ${sec(viewportSeen(run))}`;
    const details = args.compact
      ? `첫 화면 ${sec(s.fcp)}<br>${done}`
      : `첫 화면 ${sec(s.fcp)} · 해시 이동 ${sec(s.firstScroll)}<br>${done}<br>요청 이미지 ${s.requested}개`;
    return `<tr><th class="row"><b>${run.cond}</b> ${CONDITIONS[run.cond].label}<small>${details}</small></th>${cells}</tr>`;
  }).join("\n");

  const size = args.compact
    ? { font: 12, title: 14, label: 112, shot: 112, gap: 6 }
    : { font: 13, title: 17, label: 170, shot: 150, gap: 8 };
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
body { margin: 0; background: #fff; color: #111; font: ${size.font}px/1.45 -apple-system, system-ui, sans-serif; }
.wrap { display: inline-block; padding: ${args.compact ? "14px 12px" : "20px 24px"}; }
h1 { margin: 0 0 4px; font-size: ${size.title}px; }
.sub { margin: 0 0 ${args.compact ? 4 : 12}px; color: #555; }
table { border-collapse: separate; border-spacing: ${size.gap}px ${size.gap + 4}px; }
thead th { color: #555; font-weight: 600; }
th.row { width: ${size.label}px; text-align: left; vertical-align: top; font-weight: 400; }
th.row small { display: block; margin-top: 6px; color: #555; }
.shot, .blank { display: block; width: ${size.shot}px; height: ${Math.round((size.shot * VIEWPORT.height) / VIEWPORT.width)}px; border: 3px solid #ddd; border-radius: 8px; box-sizing: border-box; }
.shot { object-fit: cover; object-position: top; }
.done .shot { border-color: #1f9d55; }
.blank { display: flex; align-items: center; justify-content: center; border-style: dashed; color: #999; }
</style></head><body><div class="wrap">
<h1>${title}</h1>
<p class="sub">같은 시각의 실제 화면(390×844). 초록 테두리는 화면 안의 이미지가 모두 보인 뒤, 점선은 첫 화면(FCP) 전.</p>
<table><thead><tr><th></th>${times.map((t) => `<th>${sec(t)}</th>`).join("")}</tr></thead>
${rows}
</table></div></body></html>`;
  const htmlPath = pngPath.replace(/\.png$/, ".html");
  writeFileSync(htmlPath, html);

  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const page = (method, params) => cdp.send(method, params, sessionId);
  await page("Page.enable");
  await page("Page.navigate", { url: pathToFileURL(htmlPath).href });
  await sleep(1000);
  const { cssContentSize } = await page("Page.getLayoutMetrics");
  await page("Emulation.setDeviceMetricsOverride", {
    width: Math.ceil(cssContentSize.width),
    height: Math.ceil(cssContentSize.height),
    deviceScaleFactor: 2,
    mobile: false,
  });
  await sleep(300);
  const { data } = await page("Page.captureScreenshot", { format: "png" });
  writeFileSync(pngPath, Buffer.from(data, "base64"));
  await cdp.send("Target.closeTarget", { targetId });
}

if (args.report) {
  const { meta, runs } = JSON.parse(readFileSync(args.report, "utf8"));
  const markdown = toMarkdown(summarize(runs), meta);
  writeFileSync(args.report.replace(/\.json$/, ".md"), markdown);
  console.log(markdown);
  process.exit(0);
}

if (!(await serverIsUp())) {
  console.error(`서버가 꺼져 있습니다. 다른 터미널에서 먼저 실행하세요: node server.mjs`);
  process.exit(1);
}

const repeat = args.film ? 1 : Number(args.repeat);
const nets = args.nets.split(",").filter((n) => PROFILES[n]);
const scheds = args.scheds.split(",").filter((s) => SCHEDULERS[s]);
const conds = args.conds.split(",").filter((c) => CONDITIONS[c]);
const topConds = args.top ? args.top.split(",").filter((c) => CONDITIONS[c]) : [];
const configs = [
  ...conds.map((cond) => ({ cond, entry: "mid" })),
  ...topConds.map((cond) => ({ cond, entry: "top" })),
];

const chrome = await launchChrome();
console.log(`${chrome.product} · 조건 ${configs.length}개 · 반복 ${repeat}회`);
const runs = [];
try {
  // 브라우저를 띄운 직후의 첫 탐색은 느리므로 기록하지 않고 한 번 열어 둔다.
  await measure(chrome.cdp, `${ORIGIN}/shop?cond=A&net=none#section-${DEFAULT_AT}`);
  for (const net of nets) {
    // 대역폭 제한이 없으면 서버가 순서를 정할 일이 없으므로 한 번만 잰다.
    for (const sched of net === "none" ? ["fair"] : scheds) {
      for (let rep = 1; rep <= repeat; rep++) {
        // 반복마다 조건 순서를 돌려, 시간에 따른 차이가 한 조건에 몰리지 않게 한다.
        const order = args.film ? configs : configs.map((_, i) => configs[(i + rep) % configs.length]);
        for (const { cond, entry } of order) {
          const hash = entry === "mid" ? `#section-${DEFAULT_AT}` : "";
          const url = `${ORIGIN}/shop?cond=${cond}&net=${net}&sched=${sched}&at=${DEFAULT_AT}&cards=${args.cards}&tail=${args.tail}${hash}`;
          const result = await measure(chrome.cdp, url, { film: args.film });
          runs.push({ net, sched, entry, cond, rep, ...result });
          const s = result.summary;
          console.log(`${net}/${sched} ${entry} ${cond} #${rep}  도착 화면 ${s.viewportDone ?? "-"} ms · 첫 화면 ${s.fcp === null ? "-" : Math.round(s.fcp)} ms · 해시 이동 ${s.firstScroll ?? "-"} ms · ${result.protocol}`);
        }
      }
    }
  }

  const date = new Date();
  const stamp = date.toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-");
  const base = join(here, "results", `${args.name}-${stamp}${args.film ? "-film" : ""}`);
  mkdirSync(join(here, "results"), { recursive: true });

  if (args.film) {
    const groups = Map.groupBy(runs, (r) => `${r.net}-${r.sched}-${r.entry}`);
    for (const [group, groupRuns] of groups) {
      const [net, sched, entry] = group.split("-");
      const title = `${PROFILES[net].label} · ${SCHEDULERS[sched]} 서버 · ${entry === "mid" ? `#section-${DEFAULT_AT}로 진입` : "맨 위로 진입"}`
        + (Number(args.tail) ? ` · 페이지 끝 데이터 ${args.tail} KB` : "");
      await composeFilm(chrome.cdp, title, groupRuns, `${base}/${group}`, `${base}/${group}.png`);
      console.log(`필름스트립: ${relative(here, `${base}/${group}.png`)}`);
    }
  }

  const meta = { name: args.name, date: date.toISOString(), product: chrome.product, repeat, cards: args.cards, tail: Number(args.tail) };
  const rows = summarize(runs);
  const stripped = runs.map(({ frames, ...run }) => ({ ...run, ...(frames && { frameTimes: frames.map((f) => f.t) }) }));
  writeFileSync(`${base}.json`, JSON.stringify({ meta, rows, runs: stripped }));
  writeFileSync(`${base}.md`, toMarkdown(rows, meta));
  console.log(`\n${toMarkdown(rows, meta)}`);
  console.log(`저장: ${relative(here, base)}.json, .md`);
} finally {
  await chrome.close();
}
