import type { CSSProperties } from "react";

// Medians (10 runs each) from the 2026-10-25 experiments, in ms after the
// document request. The experiment code and raw data were removed after the
// note was written; see commit 0f4ed19 (experiments/scroll-image-priority).
// "Complete" is when every image in the landing viewport was painted and the
// viewport had actually moved there: max(image render, hash scroll, FCP).

const format = (ms: number) => Math.round(ms).toLocaleString("en-US");

function scaleFor(scale: number, tickStep: number) {
  const percent = (ms: number) => `${(Math.min(ms, scale) / scale) * 100}%`;
  const ticks = Array.from({ length: Math.floor(scale / tickStep) + 1 }, (_, index) => index * tickStep);
  const style = { "--tick-step": percent(tickStep) } as CSSProperties;
  return { percent, ticks, style };
}

function Axis({ ticks, percent }: { ticks: number[]; percent: (ms: number) => string }) {
  const lastTick = ticks.at(-1);
  return <div className="measured-axis" aria-hidden="true">{ticks.map(tick => <span key={tick} style={{ left: percent(tick) }}>{tick === lastTick ? `${format(tick)} ms` : format(tick)}</span>)}</div>;
}

type ServerRow = { label: string; detail: string; priority: number; fair: number };
type ServerChartProps = { name: string; tag: string; rows: ServerRow[]; caption: string };

function ServerComparisonChart({ name, tag, rows, caption }: ServerChartProps) {
  const { percent, ticks, style } = scaleFor(10000, 2000);

  return <figure className="hint-demo measured-chart" style={style}>
    <div className="demo-chrome"><span className="window-dots" aria-hidden="true"><i /><i /><i /></span><span>{name}</span><span className="mono">{tag}</span></div>
    <div className="measured-body">
      <ul className="measured-legend">
        <li><span className="legend-dot legend-dot-on" aria-hidden="true" />우선순위를 따르는 서버</li>
        <li><span className="legend-dot legend-dot-off" aria-hidden="true" />우선순위를 무시하는 서버</li>
      </ul>
      <Axis ticks={ticks} percent={percent} />
      {rows.map(row => {
        const parts = [`따르는 서버 ${format(row.priority)} ms`, `무시하는 서버 ${format(row.fair)} ms`];
        return <div className="measured-row" key={row.label}>
          <div className="measured-label"><strong>{row.label}</strong><span>{row.detail}</span></div>
          <div className="measured-track" role="img" aria-label={`${row.label}: ${parts.join(" · ")}`}>
            <span className="wait-link" style={{ left: percent(Math.min(row.priority, row.fair)), width: percent(Math.abs(row.fair - row.priority)) }} />
            <span className="wait-dot wait-dot-off" style={{ left: percent(row.fair) }} title={`무시하는 서버 ${format(row.fair)} ms`} />
            <span className="wait-dot wait-dot-on" style={{ left: percent(row.priority) }} title={`따르는 서버 ${format(row.priority)} ms`} />
          </div>
          <p className="measured-values">{parts.map((part, index) => <span key={part} className="value-part">{index > 0 && " · "}{part}</span>)}</p>
        </div>;
      })}
    </div>
    <figcaption className="demo-disclaimer">{caption}</figcaption>
  </figure>;
}

const resultCaption = "문서 요청 시점이 0 · 각 조건 10회의 중앙값 · 1.6 Mbps와 응답마다 150 ms 지연을 서버에서 흉내 냈습니다.";

const exp1Rows: ServerRow[] = [
  { label: "A 힌트 없음", detail: "히어로·상품 모두 기본값", priority: 2388, fair: 8964 },
  { label: "B 히어로 high", detail: "<img fetchpriority=high>", priority: 2778, fair: 8964 },
  { label: "P 히어로 preload", detail: "<link rel=preload> + high", priority: 2780, fair: 8960 },
  { label: "C 도착 섹션 high", detail: "서버가 위치를 안다고 가정", priority: 2392, fair: 8960 },
  { label: "D 둘 다 high", detail: "히어로 + 도착 섹션", priority: 2686, fair: 8958 },
];

export function ScrollPriorityExp1Chart() {
  return <ServerComparisonChart name="landing viewport complete" tag="EXP. 003 · 실험 1" rows={exp1Rows} caption={resultCaption} />;
}

const exp2Rows: ServerRow[] = [
  { label: "A 힌트 없음", detail: "기준", priority: 2760, fair: 9898 },
  { label: "B 히어로 high", detail: "흔한 설정", priority: 3064, fair: 9900 },
  { label: "C 도착 섹션 high", detail: "서버가 위치를 안다고 가정", priority: 2766, fair: 9898 },
  { label: "E1 preload", detail: "해시면 도착 화면 preload", priority: 2756, fair: 5558 },
  { label: "E2t 도착 요소까지 보류", detail: "rel=expect #section-5", priority: 2676, fair: 9914 },
  { label: "E2 문서 끝까지 보류", detail: "rel=expect #page-end", priority: 9404, fair: 9932 },
  { label: "E3 preload + 보류", detail: "E1 + E2", priority: 2360, fair: 2776 },
];

export function ScrollPriorityExp2Chart() {
  return <ServerComparisonChart name="landing viewport complete" tag="EXP. 004 · 실험 2" rows={exp2Rows} caption={`${resultCaption} HTML 끝에 100 KB를 붙였습니다.`} />;
}

type Span = { start: number; end: number };
type TimelineRow = { label: string; detail: string; fcp: number; scroll: number; topImages: Span; landing: Span; complete: number };
type TimelineProps = { name: string; tag: string; rows: TimelineRow[]; caption: string };

function LoadingTimeline({ name, tag, rows, caption }: TimelineProps) {
  const { percent, ticks, style } = scaleFor(10500, 2000);
  const width = (span: Span) => percent(span.end - span.start);

  return <figure className="hint-demo measured-chart" style={style}>
    <div className="demo-chrome"><span className="window-dots" aria-hidden="true"><i /><i /><i /></span><span>{name}</span><span className="mono">{tag}</span></div>
    <div className="measured-body">
      <ul className="measured-legend">
        <li><span className="legend-swatch legend-wait" aria-hidden="true" />맨 위가 보인 시간</li>
        <li><span className="legend-swatch legend-hint" aria-hidden="true" />해시 위치로 이동</li>
        <li><span className="legend-swatch legend-unused" aria-hidden="true" />맨 위 이미지(섹션 1~2)</li>
        <li><span className="legend-swatch legend-css" aria-hidden="true" />도착 화면 이미지</li>
        <li><span className="legend-lcp" aria-hidden="true" />도착 화면 완성</li>
      </ul>
      <Axis ticks={ticks} percent={percent} />
      {rows.map(row => {
        const topVisible = row.fcp < row.scroll ? { start: row.fcp, end: row.scroll } : null;
        const parts = [
          `첫 화면 ${format(row.fcp)} ms`,
          `해시 이동 ${format(row.scroll)} ms`,
          `맨 위 이미지 ${format(row.topImages.start)}–${format(row.topImages.end)} ms`,
          `도착 화면 이미지 ${format(row.landing.start)}–${format(row.landing.end)} ms`,
          `완성 ${format(row.complete)} ms`,
        ];
        return <div className="measured-row" key={row.label}>
          <div className="measured-label"><strong>{row.label}</strong><span>{row.detail}</span></div>
          <div className="measured-track" role="img" aria-label={`${row.label}: ${parts.join(" · ")}`}>
            {topVisible && <span className="measured-wait" style={{ left: percent(topVisible.start), width: width(topVisible) }} title={`맨 위가 보인 시간 ${format(topVisible.start)}–${format(topVisible.end)} ms`} />}
            <span className="measured-css measured-unused" style={{ left: percent(row.topImages.start), width: width(row.topImages), top: 3, height: 8 }} title={`맨 위 이미지 ${format(row.topImages.start)}–${format(row.topImages.end)} ms`} />
            <span className="measured-css" style={{ left: percent(row.landing.start), width: width(row.landing), top: 13, height: 8 }} title={`도착 화면 이미지 ${format(row.landing.start)}–${format(row.landing.end)} ms`} />
            <span className="measured-hint" style={{ left: percent(row.scroll) }} title={`해시 이동 ${format(row.scroll)} ms`} />
            <span className="measured-lcp" style={{ left: percent(row.complete) }} title={`도착 화면 완성 ${format(row.complete)} ms`} />
          </div>
          <p className="measured-values">{parts.map((part, index) => <span key={part} className="value-part">{index > 0 && " · "}{part}</span>)}</p>
        </div>;
      })}
    </div>
    <figcaption className="demo-disclaimer">{caption}</figcaption>
  </figure>;
}

const timelineCaption = "문서 요청 시점이 0 · 각 조건 10회의 중앙값 · 이미지 막대는 첫 요청부터 마지막 완료까지 · 1.6 Mbps, HTML 끝에 100 KB를 붙였습니다.";

const priorityTimeline: TimelineRow[] = [
  { label: "B 히어로 high", detail: "흔한 설정", fcp: 214, scroll: 747, topImages: { start: 203, end: 10083 }, landing: { start: 749, end: 3064 }, complete: 3064 },
  { label: "E2 문서 끝까지 보류", detail: "렌더만 미룸", fcp: 782, scroll: 772, topImages: { start: 770, end: 9444 }, landing: { start: 773, end: 9404 }, complete: 9404 },
  { label: "E3 preload + 보류", detail: "도착 화면을 먼저 받고 렌더를 미룸", fcp: 780, scroll: 769, topImages: { start: 766, end: 9298 }, landing: { start: 190, end: 2360 }, complete: 2360 },
];

export function ScrollPriorityTimelinePriority() {
  return <LoadingTimeline name="priority-aware server" tag="EXP. 004 · 실험 2" rows={priorityTimeline} caption={timelineCaption} />;
}

const fairTimeline: TimelineRow[] = [
  { label: "B 히어로 high", detail: "흔한 설정", fcp: 212, scroll: 3944, topImages: { start: 203, end: 3561 }, landing: { start: 3947, end: 9900 }, complete: 9900 },
  { label: "E1 preload", detail: "도착 화면만 먼저 받음", fcp: 218, scroll: 5558, topImages: { start: 213, end: 5153 }, landing: { start: 190, end: 5088 }, complete: 5558 },
  { label: "E3 preload + 보류", detail: "도착 화면을 먼저 받고 렌더를 미룸", fcp: 2776, scroll: 2766, topImages: { start: 2763, end: 9859 }, landing: { start: 190, end: 2776 }, complete: 2776 },
];

export function ScrollPriorityTimelineFair() {
  return <LoadingTimeline name="priority-ignoring server" tag="EXP. 004 · 실험 2" rows={fairTimeline} caption={timelineCaption} />;
}
