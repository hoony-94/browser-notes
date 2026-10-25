// DevTools Network 패널이 열린 실험 화면을 Chrome 창만 골라 캡처한다. macOS 전용이며 화면 기록 권한이 필요하다.
// 서버를 먼저 띄운 뒤 실행한다.
//
//   node tools/capture-devtools.mjs --tail 100 --out results/devtools \
//     --shot "b-slow-priority=cond=B&net=slow&sched=priority#section-5" \
//     --shot "e3-slow-priority=cond=E3&net=slow&sched=priority#section-5"
//
// 화면에 Chrome 창이 잠깐 떴다 닫힌다. 캡처는 그 창만 찍으므로 다른 창은 들어가지 않는다.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { ORIGIN, VIEWPORT } from "../config.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const { values: args } = parseArgs({
  options: {
    shot: { type: "string", multiple: true, default: [] },
    tail: { type: "string", default: "0" },
    out: { type: "string", default: "results/devtools" },
    wait: { type: "string", default: "1500" },
    // Network 패널 필터. 문서, 히어로, 맨 위 섹션, 도착 화면 이미지만 남긴다.
    filter: { type: "string", default: "/shop|hero|p-1-|p-5-|p-6-[12]\\./" },
  },
});
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function windowsBinary() {
  const bin = join(here, ".bin", "windows");
  if (!existsSync(bin)) {
    mkdirSync(dirname(bin), { recursive: true });
    execFileSync("swiftc", ["-O", join(here, "windows.swift"), "-o", bin], { stdio: "inherit" });
  }
  return bin;
}

// DevTools 설정을 미리 넣어 둔다: Network 패널, 아래쪽 도킹, 큰 요청 행, Priority·Initiator 열.
function seedProfile(profile) {
  mkdirSync(join(profile, "Default"), { recursive: true });
  const columns = {
    name: { visible: true, title: "Name" },
    status: { visible: false, title: "Status" },
    type: { visible: false, title: "Type" },
    initiator: { visible: true, title: "Initiator" },
    size: { visible: true, title: "Size" },
    time: { visible: true, title: "Time" },
    priority: { visible: true, title: "Priority" },
    waterfall: { visible: true, title: "" },
  };
  const preferences = {
    "panel-selected-tab": JSON.stringify("network"),
    currentDockState: JSON.stringify("right"),
    "inspector-view.split-view-state": JSON.stringify({ vertical: { size: 1380 } }),
    "network-log-large-rows": "true",
    "network-log-show-overview": "false",
    "network-log-columns": JSON.stringify(columns),
    "disable-locale-info-bar": "true",
    inspectorVersion: "40",
  };
  writeFileSync(join(profile, "Default", "Preferences"), JSON.stringify({ devtools: { preferences } }));
}

class Cdp {
  static open(url) {
    return new Promise((resolveOpen, reject) => {
      const ws = new WebSocket(url);
      ws.addEventListener("open", () => resolveOpen(new Cdp(ws)));
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
    return new Promise((resolveSend, reject) => this.pending.set(id, { resolve: resolveSend, reject, method }));
  }

  on(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

async function devtoolsTargets() {
  const { targetInfos } = await cdp.send("Target.getTargets");
  return targetInfos.filter((t) => t.url.startsWith("devtools://devtools/bundled/devtools_app.html"));
}

// DevTools 화면도 CDP 대상이라, 그 안에서 DevTools 자체 모듈을 불러 설정과 필터를 바꾼다.
// 이번 촬영 창의 DevTools만 고르려고, 창을 열기 전에 있던 DevTools는 뺀다.
async function setUpDevTools(before) {
  const devtools = (await devtoolsTargets()).find((t) => !before.has(t.targetId));
  if (!devtools) throw new Error("DevTools 화면을 찾지 못했습니다.");
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId: devtools.targetId, flatten: true });
  const { result, exceptionDetails } = await cdp.send("Runtime.evaluate", {
    expression: `(async () => {
      const Common = await import("./core/common/common.js");
      const Network = await import("./panels/network/network.js");
      // 큰 요청 행은 Network 패널이 createSetting으로 만드는 설정이라 같은 이름으로 가져와 켠다.
      Common.Settings.Settings.instance().createSetting("network-log-large-rows", false).set(true);
      await Network.NetworkPanel.NetworkPanel.revealAndFilter([{ filterType: null, filterValue: ${JSON.stringify(args.filter)} }]);
      return "ok";
    })()`,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);
  if (exceptionDetails) throw new Error(`DevTools 설정 실패: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
  await cdp.send("Target.detachFromTarget", { sessionId });
  return result.value;
}

const bin = windowsBinary();
const outDir = resolve(here, "..", args.out);
mkdirSync(outDir, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), "exp-devtools-"));
seedProfile(profile);
const chrome = spawn(CHROME, [
  "--remote-debugging-port=0",
  `--user-data-dir=${profile}`,
  "--ignore-certificate-errors",
  // 자동화 도구처럼 "지원되지 않는 명령줄 플래그" 경고 바와 로그인·기능 안내 말풍선을 띄우지 않는다.
  "--test-type",
  "--propagate-iph-for-testing",
  "--disable-sync",
  // 자동 측정(run.mjs)과 같은 옵션. 실험 중 다른 요청이 끼지 않게 한다.
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-component-update",
  "--no-first-run",
  "--no-default-browser-check",
  "--auto-open-devtools-for-tabs",
  "about:blank",
], { stdio: "ignore" });

let cdp;
for (let i = 0; i < 100 && !cdp; i++) {
  await sleep(100);
  try {
    const [port, path] = readFileSync(join(profile, "DevToolsActivePort"), "utf8").trim().split("\n");
    cdp = await Cdp.open(`ws://127.0.0.1:${port}${path}`);
  } catch {}
}

try {
  // 처음 뜬 빈 창은 작게 줄여, 캡처할 때 가장 큰 창이 촬영 창이 되게 한다.
  await sleep(1000);
  for (const t of (await cdp.send("Target.getTargets")).targetInfos.filter((t) => t.type === "page" && t.url === "about:blank")) {
    const { windowId } = await cdp.send("Browser.getWindowForTarget", { targetId: t.targetId });
    await cdp.send("Browser.setWindowBounds", { windowId, bounds: { left: 0, top: 30, width: 300, height: 300 } });
  }

  for (const spec of args.shot) {
    const [label, query] = spec.split(/=(.*)/s);
    const [search, hash = ""] = query.split("#");
    const url = `${ORIGIN}/shop?${search}&tail=${args.tail}${hash ? `#${hash}` : ""}`;

    // 자동 측정과 같게, 촬영마다 새 브라우저 컨텍스트(빈 캐시, 새 연결)의 새 창에서 연다.
    const before = new Set((await devtoolsTargets()).map((t) => t.targetId));
    const { browserContextId } = await cdp.send("Target.createBrowserContext");
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank", browserContextId, newWindow: true });
    const { windowId } = await cdp.send("Browser.getWindowForTarget", { targetId });
    await cdp.send("Browser.setWindowBounds", { windowId, bounds: { left: 40, top: 30, width: 1840, height: 1030 } });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    const page = (method, params) => cdp.send(method, params, sessionId);
    await page("Network.enable");
    await page("Page.enable");
    await page("Emulation.setDeviceMetricsOverride", VIEWPORT);
    // DevTools가 열리고 Network 패널이 준비될 때까지 기다린 뒤, 큰 요청 행과 필터를 건다.
    await sleep(3000);
    await setUpDevTools(before);

    let loaded = false;
    let sawDocument = false;
    let lastActivity = Date.now();
    const inflight = new Set();
    const stop = cdp.on(({ method, params, sessionId: from }) => {
      if (from !== sessionId) return;
      if (method === "Network.requestWillBeSent") {
        if (params.type === "Document") sawDocument = true;
        inflight.add(params.requestId);
        lastActivity = Date.now();
      }
      if (method === "Network.loadingFinished" || method === "Network.loadingFailed") { inflight.delete(params.requestId); lastActivity = Date.now(); }
      if (method === "Page.loadEventFired" && sawDocument) loaded = true;
    });
    await page("Page.navigate", { url });
    const startedAt = Date.now();
    while (Date.now() - startedAt < 30_000) {
      await sleep(100);
      if (loaded && inflight.size === 0 && Date.now() - lastActivity > Number(args.wait)) break;
    }
    stop();
    console.log(`${label}: ${((Date.now() - startedAt) / 1000).toFixed(1)}초 기다린 뒤 캡처`);
    // 실험용 Chrome 프로세스의 창 중 가장 큰 창을 찍는다. 창 단위 캡처가 안 되면 그 창 영역을 찍는다.
    const [windowNumber, , rect] = execFileSync(bin, { encoding: "utf8" }).split("\n")
      .map((row) => row.split("\t"))
      .filter(([, pid]) => Number(pid) === chrome.pid)
      .sort((a, b) => {
        const area = (r) => r[2].split(",").slice(2).reduce((x, y) => x * y, 1);
        return area(b) - area(a);
      })[0] ?? [];
    if (!windowNumber) throw new Error("실험용 Chrome 창을 찾지 못했습니다.");
    const file = join(outDir, `${label}.png`);
    try {
      execFileSync("screencapture", ["-x", "-o", `-l${windowNumber}`, file], { stdio: "ignore" });
    } catch {
      execFileSync("screencapture", ["-x", `-R${rect}`, file]);
    }
    // 같은 탐색의 측정값과 서버 기록도 남긴다. 이 요청이 Network 기록에 끼지 않게 캡처한 뒤에 가져온다.
    const { result: record } = await page("Runtime.evaluate", {
      expression: `fetch('/__log').then((r) => r.json()).then((server) => {
        const { res, el, loads, ...summary } = window.__summary();
        return { summary, server };
      })`,
      awaitPromise: true,
      returnByValue: true,
    });
    writeFileSync(join(outDir, `${label}.json`), JSON.stringify(record.value, null, 2));

    console.log(`캡처: ${file}`);
    await cdp.send("Target.disposeBrowserContext", { browserContextId });
  }
} finally {
  chrome.kill();
  await sleep(500);
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
