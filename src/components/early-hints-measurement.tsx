import type { CSSProperties } from "react";

type Bar = { start: number; end: number; unused?: boolean };
type Row = { label: string; detail: string; page: number; hint: number | null; bars: Bar[]; lcp?: number };
type TimelineProps = { name: string; tag: string; rows: Row[]; scale: number; tickStep: number; caption: string };

const format = (ms: number) => (ms < 10 ? String(ms) : Math.round(ms).toLocaleString("en-US"));

function MeasuredTimeline({ name, tag, rows, scale, tickStep, caption }: TimelineProps) {
  const percent = (ms: number) => `${(ms / scale) * 100}%`;
  const ticks = Array.from({ length: Math.floor(scale / tickStep) + 1 }, (_, index) => index * tickStep);
  const lastTick = ticks.at(-1);
  const hasUnused = rows.some(row => row.bars.some(bar => bar.unused));
  const hasLcp = rows.some(row => row.lcp !== undefined);
  const style = { "--tick-step": percent(tickStep) } as CSSProperties;

  return <figure className="hint-demo measured-chart" style={style}>
    <div className="demo-chrome"><span className="window-dots" aria-hidden="true"><i /><i /><i /></span><span>{name}</span><span className="mono">{tag}</span></div>
    <div className="measured-body">
      <ul className="measured-legend">
        <li><span className="legend-swatch legend-wait" aria-hidden="true" />200 응답 대기</li>
        <li><span className="legend-swatch legend-hint" aria-hidden="true" />103 전송</li>
        <li><span className="legend-swatch legend-css" aria-hidden="true" />CSS 요청~수신 완료</li>
        {hasUnused && <li><span className="legend-swatch legend-unused" aria-hidden="true" />쓰지 않는 CSS</li>}
        {hasLcp && <li><span className="legend-lcp" aria-hidden="true" />LCP</li>}
      </ul>
      <div className="measured-axis" aria-hidden="true">{ticks.map(tick => <span key={tick} style={{ left: percent(tick) }}>{tick === lastTick ? `${format(tick)} ms` : format(tick)}</span>)}</div>
      {rows.map(row => {
        const parts = [
          row.hint === null ? "103 없음" : `103 ${format(row.hint)} ms`,
          ...row.bars.map(bar => `${bar.unused ? "쓰지 않는 CSS" : "CSS"} ${format(bar.start)}–${format(bar.end)} ms`),
          `200 ${format(row.page)} ms`,
          ...(row.lcp === undefined ? [] : [`LCP ${format(row.lcp)} ms`]),
        ];
        const summary = parts.join(" · ");
        const stacked = row.bars.length > 1;
        return <div className="measured-row" key={row.label}>
          <div className="measured-label"><strong>{row.label}</strong><span>{row.detail}</span></div>
          <div className="measured-track" role="img" aria-label={`${row.label}: ${summary}`}>
            <span className="measured-wait" style={{ width: percent(row.page) }} title={`200 헤더 ${format(row.page)} ms`} />
            {row.hint !== null && <span className="measured-hint" style={{ left: percent(row.hint) }} title={`103 ${format(row.hint)} ms`} />}
            {row.bars.map((bar, index) => <span key={index} className={bar.unused ? "measured-css measured-unused" : "measured-css"} style={{ left: percent(bar.start), width: percent(bar.end - bar.start), ...(stacked ? { top: 3 + index * 10, height: 8 } : {}) }} title={`${bar.unused ? "쓰지 않는 CSS" : "CSS"} ${format(bar.start)}–${format(bar.end)} ms`} />)}
            {row.lcp !== undefined && <span className="measured-lcp" style={{ left: percent(row.lcp) }} title={`LCP ${format(row.lcp)} ms`} />}
          </div>
          <p className="measured-values">{parts.map((part, index) => <span key={part} className="value-part">{index > 0 && " · "}{part}</span>)}</p>
        </div>;
      })}
    </div>
    <figcaption className="demo-disclaimer">{caption}</figcaption>
  </figure>;
}

// Q1 medians from the edge proxy logs of the 2026-10-23 experiment (5 runs each).
// Times are ms after the edge proxy received the document request.
const q1Rows: Row[] = [
  { label: "103 중계", detail: "런타임이 보낸 103을 프록시가 전달", hint: 0.6, bars: [{ start: 3.4, end: 6.8 }], page: 1008.2 },
  { label: "103 버림", detail: "런타임이 보낸 103을 프록시가 버림", hint: null, bars: [{ start: 1010.6, end: 1012.1 }], page: 1005.1 },
  { label: "학습 · 1회째", detail: "프록시가 기억한 Link 없음", hint: null, bars: [{ start: 1018.2, end: 1025.9 }], page: 1010.6 },
  { label: "학습 · 2~5회째", detail: "이전 200의 Link로 프록시가 103 생성", hint: 0.2, bars: [{ start: 3.6, end: 8.5 }], page: 1010.3 },
  { label: "정적 페이지", detail: "103 중계, 서버 대기 없음", hint: 0.8, bars: [{ start: 4.9, end: 7 }], page: 2.6 },
];

export function EarlyHintsMeasurement() {
  return <MeasuredTimeline name="measured at the edge" tag="EXP. 001 · Q1" rows={q1Rows} scale={1050} tickStep={250} caption="프록시가 문서 요청을 받은 시점이 0 · 각 조건 5회의 중앙값 · 같은 컴퓨터 안의 측정이라 CSS 전송 시간은 실제 네트워크보다 짧습니다." />;
}

// Q2 and Q4 medians from the second experiment (10 runs each). CSS and 200 are
// edge times; LCP is the browser's time. Both start at the document request.
const throttledCaption = "CSS·200은 프록시, LCP는 브라우저가 기록한 시각 · 각 조건 10회의 중앙값 · CSS 하나를 받는 데 약 400 ms가 걸리도록 프록시에서 대역폭을 제한했습니다.";

const q2Rows: Row[] = [
  { label: "103 OFF", detail: "200의 Link와 HTML로 CSS 발견", hint: null, bars: [{ start: 1014.4, end: 1426.6 }], page: 1006.5, lcp: 1448 },
  { label: "103 ON", detail: "103으로 CSS 발견", hint: 0.5, bars: [{ start: 3.6, end: 414.4 }], page: 1005.3, lcp: 1040 },
];

export function EarlyHintsLcpTimeline() {
  return <MeasuredTimeline name="server wait 1,000 ms" tag="EXP. 002 · Q2" rows={q2Rows} scale={1600} tickStep={400} caption={throttledCaption} />;
}

const q4Rows: Row[] = [
  { label: "103 OFF", detail: "힌트 없음", hint: null, bars: [{ start: 311.6, end: 724.5 }], page: 304.9, lcp: 748 },
  { label: "맞는 힌트", detail: "쓰는 CSS만 103으로", hint: 0.5, bars: [{ start: 3.5, end: 413.5 }], page: 304.9, lcp: 432 },
  { label: "틀린 힌트", detail: "쓰지 않는 CSS만 103으로", hint: 0.7, bars: [{ start: 3.9, end: 548.4, unused: true }, { start: 310.4, end: 829.5 }], page: 305.8, lcp: 856 },
  { label: "둘 다", detail: "쓰지 않는 CSS와 쓰는 CSS를 함께", hint: 1.3, bars: [{ start: 5.2, end: 816.6, unused: true }, { start: 5.5, end: 814 }], page: 308.2, lcp: 838 },
];

export function EarlyHintsWrongHintTimeline() {
  return <MeasuredTimeline name="server wait 300 ms" tag="EXP. 002 · Q4" rows={q4Rows} scale={1000} tickStep={250} caption={throttledCaption} />;
}
