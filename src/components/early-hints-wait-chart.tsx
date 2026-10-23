import type { CSSProperties } from "react";

// Q3 medians (10 runs each) from the 2026-10-23 experiment, in ms after
// navigation start as the browser measured them.
type Row = { label: string; detail: string; page: number; off: number; on: number };

const rows: Row[] = [
  { label: "대기 0 ms", detail: "첫 화면 전 대기 없음", page: 7, off: 446, on: 438 },
  { label: "대기 100 ms", detail: "첫 화면 전 100 ms", page: 106.5, off: 546, on: 442 },
  { label: "대기 300 ms", detail: "첫 화면 전 300 ms", page: 306.5, off: 748, on: 432 },
  { label: "대기 600 ms", detail: "첫 화면 전 600 ms", page: 609, off: 1050, on: 644 },
  { label: "대기 1,000 ms", detail: "첫 화면 전 1,000 ms", page: 1008, off: 1448, on: 1040 },
  { label: "스트리밍", detail: "첫 화면은 바로, 본문만 1,000 ms 뒤", page: 6, off: 1024, on: 1024 },
];
const scale = 1600;
const tickStep = 400;
const percent = (ms: number) => `${(ms / scale) * 100}%`;
const format = (ms: number) => Math.round(ms).toLocaleString("en-US");

export function EarlyHintsWaitChart() {
  const ticks = Array.from({ length: scale / tickStep + 1 }, (_, index) => index * tickStep);
  const style = { "--tick-step": percent(tickStep) } as CSSProperties;

  return <figure className="hint-demo measured-chart" style={style}>
    <div className="demo-chrome"><span className="window-dots" aria-hidden="true"><i /><i /><i /></span><span>LCP by server wait</span><span className="mono">EXP. 002 · Q3</span></div>
    <div className="measured-body">
      <ul className="measured-legend">
        <li><span className="legend-dot legend-dot-off" aria-hidden="true" />103 OFF의 LCP</li>
        <li><span className="legend-dot legend-dot-on" aria-hidden="true" />103 ON의 LCP</li>
        <li><span className="legend-swatch legend-hint" aria-hidden="true" />200 도착</li>
      </ul>
      <div className="measured-axis" aria-hidden="true">{ticks.map(tick => <span key={tick} style={{ left: percent(tick) }}>{tick === scale ? `${format(tick)} ms` : format(tick)}</span>)}</div>
      {rows.map(row => {
        const saved = row.off - row.on;
        const parts = [`200 ${format(row.page)} ms`, `OFF ${format(row.off)} ms → ON ${format(row.on)} ms`, saved > 0 ? `${format(saved)} ms 빨라짐` : "차이 없음"];
        const summary = parts.join(" · ");
        return <div className="measured-row" key={row.label}>
          <div className="measured-label"><strong>{row.label}</strong><span>{row.detail}</span></div>
          <div className="measured-track" role="img" aria-label={`${row.label}: ${summary}`}>
            <span className="measured-hint" style={{ left: percent(row.page) }} title={`200 도착 ${format(row.page)} ms`} />
            <span className="wait-link" style={{ left: percent(Math.min(row.on, row.off)), width: percent(Math.abs(saved)) }} />
            <span className="wait-dot wait-dot-on" style={{ left: percent(row.on) }} title={`103 ON LCP ${format(row.on)} ms`} />
            <span className="wait-dot wait-dot-off" style={{ left: percent(row.off) }} title={`103 OFF LCP ${format(row.off)} ms`} />
          </div>
          <p className="measured-values">{parts.map((part, index) => <span key={part} className="value-part">{index > 0 && " · "}{part}</span>)}</p>
        </div>;
      })}
    </div>
    <figcaption className="demo-disclaimer">브라우저가 페이지 이동을 시작한 시점이 0 · 각 조건 10회의 중앙값 · CSS 하나를 받는 데 약 400 ms가 걸리도록 프록시에서 대역폭을 제한했습니다.</figcaption>
  </figure>;
}
