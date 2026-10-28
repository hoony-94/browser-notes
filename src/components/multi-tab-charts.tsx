import type { CSSProperties } from "react";

// Numbers from the 2026-10-28 multi-tab lab (Chrome 156.0.8078.48 headless, puppeteer-core).
// Ten tabs: 1–3 dashboards (no room), 4 A, 5 B, 6 C, 7 D, 8 A, 9 B, 10 C. The harness lives outside the repo.

const format = (n: number) => Math.round(n).toLocaleString("en-US");

function scaleFor(scale: number, tickStep: number) {
  const percent = (value: number) => `${(Math.min(value, scale) / scale) * 100}%`;
  const ticks = Array.from({ length: Math.floor(scale / tickStep) + 1 }, (_, index) => index * tickStep);
  const style = { "--tick-step": percent(tickStep) } as CSSProperties;
  return { percent, ticks, style };
}

function Axis({ ticks, percent, unit }: { ticks: number[]; percent: (value: number) => string; unit: string }) {
  const lastTick = ticks.at(-1);
  return <div className="measured-axis" aria-hidden="true">{ticks.map(tick => <span key={tick} style={{ left: percent(tick) }}>{tick === lastTick ? `${format(tick)} ${unit}` : format(tick)}</span>)}</div>;
}

function Chrome({ name, tag }: { name: string; tag: string }) {
  return <div className="demo-chrome"><span className="window-dots" aria-hidden="true"><i /><i /><i /></span><span>{name}</span><span className="mono">{tag}</span></div>;
}

// 1. Share of time each tab had a long poll open at the server (95 s window, 10 tabs).
const presenceRows = [
  { tab: "탭 1", room: "대시보드", h1: 91 }, { tab: "탭 2", room: "대시보드", h1: 67 }, { tab: "탭 3", room: "대시보드", h1: 65 },
  { tab: "탭 4", room: "대화방 A", h1: 35 }, { tab: "탭 5", room: "대화방 B", h1: 66 }, { tab: "탭 6", room: "대화방 C", h1: 57 }, { tab: "탭 7", room: "대화방 D", h1: 59 },
  { tab: "탭 8", room: "대화방 A", h1: 43 }, { tab: "탭 9", room: "대화방 B", h1: 43 }, { tab: "탭 10", room: "대화방 C", h1: 74 },
];

export function MultiTabPresenceChart() {
  const { percent, ticks, style } = scaleFor(100, 20);
  return <figure className="hint-demo measured-chart" style={style}>
    <Chrome name="connected to the server" tag="EXP. 005 · 실험 1" />
    <div className="measured-body">
      <ul className="measured-legend">
        <li><span className="legend-swatch legend-css" aria-hidden="true" />HTTP/1.1 · 서버 연결을 유지한 시간 비율</li>
        <li><span className="legend-hint" aria-hidden="true" />HTTP/2 · 모든 탭 100%</li>
      </ul>
      <Axis ticks={ticks} percent={percent} unit="%" />
      {presenceRows.map(row => <div className="measured-row" key={row.tab}>
        <div className="measured-label"><strong>{row.tab}</strong><span>{row.room}</span></div>
        <div className="measured-track" role="img" aria-label={`${row.tab}: HTTP/1.1 ${row.h1}%, HTTP/2 100%`}>
          <span className="measured-css" style={{ left: 0, width: percent(row.h1) }} />
          <span className="measured-hint" style={{ left: percent(100) }} />
        </div>
        <p className="measured-values"><span className="value-part">HTTP/1.1 {row.h1}%</span><span className="value-part"> · HTTP/2 100%</span></p>
      </div>)}
    </div>
    <figcaption className="demo-disclaimer">탭 10개를 연 뒤 95초 동안 측정한 연결 유지 비율 · HTTP/1.1에서는 여섯 탭만 동시에 연결되고, 나머지 탭은 브라우저 안에서 기다린다</figcaption>
  </figure>;
}

// 2. How long an ordinary request waited, by how many tabs were long polling the same host.
const waitRows = [
  { label: "탭 1개", detail: "같은 호스트", wait: 2 },
  { label: "탭 5개", detail: "같은 호스트", wait: 2 },
  { label: "탭 6개", detail: "같은 호스트 · 소켓 6개 모두 사용 중", wait: 27969 },
  { label: "탭 10개", detail: "같은 호스트", wait: 29999 },
  { label: "탭 10개", detail: "다른 호스트(일반 API)", wait: 2 },
  { label: "탭 10개", detail: "같은 호스트 · HTTP/2", wait: 1 },
];

export function MultiTabWaitChart() {
  const { percent, ticks, style } = scaleFor(30000, 5000);
  return <figure className="hint-demo measured-chart" style={style}>
    <Chrome name="ordinary request · time to response" tag="EXP. 005 · 실험 1" />
    <div className="measured-body">
      <ul className="measured-legend"><li><span className="legend-swatch legend-wait" aria-hidden="true" />응답을 기다린 시간 (거의 전부 소켓 대기)</li></ul>
      <Axis ticks={ticks} percent={percent} unit="ms" />
      {waitRows.map((row, index) => <div className="measured-row" key={index}>
        <div className="measured-label"><strong>{row.label}</strong><span>{row.detail}</span></div>
        <div className="measured-track" role="img" aria-label={`${row.label} ${row.detail}: ${format(row.wait)} ms`}>
          <span className="measured-wait" style={{ width: percent(Math.max(row.wait, 60)) }} />
        </div>
        <p className="measured-values"><span className="value-part">{format(row.wait)} ms</span></p>
      </div>)}
    </div>
    <figcaption className="demo-disclaimer">롱폴링 실행 중 한 탭에서 보낸 fetch 요청의 응답 시간 · 같은 호스트에서는 빈 소켓을 기다리느라 최대 30초가 걸렸다</figcaption>
  </figure>;
}

// 3. Delay of a room-specific event reaching the tab that views that room, by method.
const delayRows: { label: string; detail: string; delay: number | null; note?: string }[] = [
  { label: "탭마다 연결 · HTTP/1.1", detail: "기다리던 탭", delay: 27205 },
  { label: "탭마다 연결 · HTTP/1.1", detail: "연결돼 있던 탭", delay: 2 },
  { label: "탭마다 연결 · HTTP/2", detail: "탭 10개 모두 연결", delay: 4 },
  { label: "대표 탭 하나", detail: "BroadcastChannel로 전달", delay: 4 },
  { label: "대화방마다 대표 탭", detail: "BroadcastChannel로 전달", delay: 2 },
  { label: "SharedWorker", detail: "포트 메시지로 전달", delay: 7 },
  { label: "대표 탭이 동결됨", detail: "복구 처리 없음 · 실행 재개까지", delay: 24059 },
  { label: "대표 탭이 동결됨", detail: "생존 신호가 끊기면 대표 교체", delay: 3725 },
];

export function MultiTabDelayChart() {
  const { percent, ticks, style } = scaleFor(30000, 5000);
  return <figure className="hint-demo measured-chart" style={style}>
    <Chrome name="room event · publish to receive" tag="EXP. 005 · 실험 1~3" />
    <div className="measured-body">
      <ul className="measured-legend"><li><span className="legend-swatch legend-css" aria-hidden="true" />서버가 이벤트를 만든 뒤 탭이 받기까지</li></ul>
      <Axis ticks={ticks} percent={percent} unit="ms" />
      {delayRows.map((row, index) => <div className="measured-row" key={index}>
        <div className="measured-label"><strong>{row.label}</strong><span>{row.detail}</span></div>
        <div className="measured-track" role="img" aria-label={`${row.label} ${row.detail}: ${row.delay === null ? row.note : `${format(row.delay)} ms`}`}>
          {row.delay !== null && <span className="measured-css" style={{ left: 0, width: percent(Math.max(row.delay, 60)) }} />}
          {row.delay === null && <span className="measured-wait" style={{ width: "100%" }} />}
        </div>
        <p className="measured-values"><span className="value-part">{row.delay === null ? row.note : `${format(row.delay)} ms`}</span></p>
      </div>)}
    </div>
    <figcaption className="demo-disclaimer">대화방 A 이벤트가 해당 대화방을 보는 탭에 도착하기까지 걸린 시간 · 연결 방식과 대표 탭의 동결 여부에 따라 비교했다</figcaption>
  </figure>;
}
