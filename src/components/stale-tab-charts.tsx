import type { CSSProperties } from "react";

type Row = { label: string; detail: string; document: number | null; content: number | null; note?: string };

const format = (ms: number) => Math.round(ms).toLocaleString("en-US");

// Medians from the 2026-10-26 deploy lab runs (Chrome 155). The server delays HTML and data by 300 ms each.
const rows: Row[] = [
  { label: "평소의 SPA 이동", detail: "비교 기준. 배포와 무관", document: null, content: 317 },
  { label: "다음 이동 때 전체 이동", detail: "이동할 때 새 문서를 받음", document: 317, content: 629 },
  { label: "즉시 새로고침", detail: "새 버전을 알자마자", document: 319, content: 628 },
  { label: "뒤로 가기 뒤 확인", detail: "이전 버전이면 새로고침", document: 329, content: 638 },
  { label: "미리 그려 두고 교체", detail: "Chrome, Speculation Rules", document: 15, content: 15 },
  { label: "탭이 숨겨졌을 때", detail: "사용자가 보지 않을 때 끝남", document: null, content: null, note: "기다림 없음 (돌아오면 이미 v2)" },
];

export function StaleTabWaitChart() {
  const scale = 700;
  const tickStep = 100;
  const percent = (ms: number) => `${(ms / scale) * 100}%`;
  const ticks = Array.from({ length: scale / tickStep + 1 }, (_, index) => index * tickStep);
  const style = { "--tick-step": percent(tickStep) } as CSSProperties;

  return <figure className="hint-demo measured-chart" style={style}>
    <div className="demo-chrome"><span className="window-dots" aria-hidden="true"><i /><i /><i /></span><span>waiting for v2</span><span className="mono">EXP. 004</span></div>
    <div className="measured-body">
      <ul className="measured-legend">
        <li><span className="legend-swatch legend-wait" aria-hidden="true" />이전 화면이나 빈 화면</li>
        <li><span className="legend-swatch legend-hint" aria-hidden="true" />v2 문서가 시작된 시각</li>
        <li><span className="legend-lcp" aria-hidden="true" />v2 화면이 다 그려진 시각</li>
      </ul>
      <div className="measured-axis" aria-hidden="true">{ticks.map(tick => <span key={tick} style={{ left: percent(tick) }}>{tick === scale ? `${format(tick)} ms` : format(tick)}</span>)}</div>
      {rows.map(row => {
        const parts = row.note ? [row.note] : [
          ...(row.document === null ? [] : [`문서 ${format(row.document)} ms`]),
          `화면 ${format(row.content ?? 0)} ms`,
        ];
        return <div className="measured-row" key={row.label}>
          <div className="measured-label"><strong>{row.label}</strong><span>{row.detail}</span></div>
          <div className="measured-track" role="img" aria-label={`${row.label}: ${parts.join(" · ")}`}>
            {row.content !== null && <span className="measured-wait" style={{ width: percent(row.content) }} />}
            {row.document !== null && <span className="measured-hint" style={{ left: percent(row.document) }} />}
            {row.content !== null && <span className="measured-lcp" style={{ left: percent(row.content) }} />}
          </div>
          <p className="measured-values">{parts.map((part, index) => <span key={part} className="value-part">{index > 0 && " · "}{part}</span>)}</p>
        </div>;
      })}
    </div>
    <figcaption className="demo-disclaimer">새 버전으로 넘어가는 순간이 0 · 각 3~5회의 중앙값 · 서버가 HTML과 데이터를 각각 0.3초 늦게 보냄</figcaption>
  </figure>;
}
