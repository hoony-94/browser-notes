"use client";

import { useEffect, useId, useRef, useState } from "react";
import { replayRuns, type ReplayCondition, type ReplayImage, type ReplayServer } from "@/lib/scroll-priority-replay";

const conditions: { key: ReplayCondition; label: string; detail: string }[] = [
  { key: "B", label: "B 히어로 high", detail: "흔한 설정" },
  { key: "E2", label: "E2 렌더 보류", detail: "문서 끝까지 첫 렌더를 미룸" },
  { key: "E3", label: "E3 preload + 보류", detail: "도착 화면을 먼저 받고 렌더를 미룸" },
];
const servers: { key: ReplayServer; label: string }[] = [
  { key: "priority", label: "우선순위를 따르는 서버" },
  { key: "fair", label: "우선순위를 무시하는 서버" },
];
const scale = 10500;
const ticks = [0, 2000, 4000, 6000, 8000, 10000];
const topViewIds = ["p-1-1", "p-1-2", "p-1-3", "p-1-4"];
const percent = (ms: number) => `${(Math.min(ms, scale) / scale) * 100}%`;
const format = (ms: number) => Math.round(ms).toLocaleString("en-US");
const loadedBy = (images: ReplayImage[], time: number) => images.filter(([, , end]) => end <= time).length;
const spanOf = (images: ReplayImage[]) => ({ start: Math.min(...images.map(([, start]) => start)), end: Math.max(...images.map(([, , end]) => end)) });

export function ScrollPriorityReplay() {
  const id = useId();
  const [condition, setCondition] = useState<ReplayCondition>("B");
  const [server, setServer] = useState<ReplayServer>("priority");
  const [time, setTime] = useState(500);
  const [playing, setPlaying] = useState(false);
  const frame = useRef(0);

  // 재생은 실제 시간과 같은 속도로 흐른다. 끝에 닿으면 멈춘다.
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const step = (now: number) => {
      const elapsed = now - last;
      last = now;
      setTime(current => Math.min(scale, current + elapsed));
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [playing]);

  useEffect(() => {
    if (playing && time >= scale) setPlaying(false);
  }, [playing, time]);

  const run = replayRuns[server][condition];
  const view = time < run.fcp ? "blank" : time < run.scroll ? "top" : "landing";
  const viewLabel = { blank: "첫 화면 전", top: "맨 위 (엉뚱한 화면)", landing: "섹션 5 (도착 화면)" }[view];
  const landingLoaded = loadedBy(run.landing, time);
  const topRequested = run.top.filter(([, start]) => start <= time).length;
  const topLoaded = loadedBy(run.top, time);
  const complete = time >= run.complete;
  const topImages = spanOf(run.top);
  const landingImages = spanOf(run.landing);
  const topView = run.fcp < run.scroll ? { start: run.fcp, end: run.scroll } : null;
  const isLoaded = (imageId: string) => (run.top.find(([name]) => name === imageId)?.[2] ?? Infinity) <= time;
  const phoneLabel = view === "blank" ? "아직 아무것도 그려지지 않은 화면"
    : view === "top" ? `맨 위 화면. 히어로 ${run.hero[1] <= time ? "표시됨" : "받는 중"}, 섹션 1 이미지 ${topViewIds.filter(isLoaded).length}/4`
      : `섹션 5 화면. 도착 화면 이미지 ${landingLoaded}/8`;

  const togglePlay = () => {
    if (!playing && time >= scale) setTime(0);
    setPlaying(!playing);
  };

  return <div className="hint-demo replay-demo">
    <div className="demo-chrome"><span className="window-dots" aria-hidden="true"><i /><i /><i /></span><span>the landing</span><span className="mono">EXP. 004</span></div>
    <div className="demo-body">
      <div className="demo-topline"><span className="eyebrow">MEASURED REPLAY</span><span className="demo-live"><i className="status-dot" /> 1.6 Mbps · #section-5로 진입</span></div>

      <div className="replay-options" role="group" aria-label="조건">
        {conditions.map(item => <button key={item.key} type="button" aria-pressed={condition === item.key} onClick={() => setCondition(item.key)} title={item.detail}>{item.label}</button>)}
      </div>
      <div className="replay-options" role="group" aria-label="서버">
        {servers.map(item => <button key={item.key} type="button" aria-pressed={server === item.key} onClick={() => setServer(item.key)}>{item.label}</button>)}
      </div>

      <div className="replay-stage">
        <div className="replay-phone" role="img" aria-label={`${format(time)} ms의 화면: ${phoneLabel}`}>
          {view === "blank" && <div className="replay-blank">첫 화면 전</div>}
          {view === "top" && <>
            <div className="replay-header" />
            <div className={run.hero[1] <= time ? "replay-hero is-loaded" : "replay-hero"}>HERO</div>
            <p className="replay-section">섹션 1</p>
            <div className="replay-grid">{topViewIds.map(name => <span key={name} className={isLoaded(name) ? "replay-tile is-top is-loaded" : "replay-tile"} />)}</div>
          </>}
          {view === "landing" && <>
            <p className="replay-section">섹션 5</p>
            <div className="replay-grid">{run.landing.slice(0, 6).map(([name, , end]) => <span key={name} className={end <= time ? "replay-tile is-landing is-loaded" : "replay-tile"}>{name.slice(2)}</span>)}</div>
            <p className="replay-section">섹션 6</p>
            <div className="replay-grid">{run.landing.slice(6).map(([name, , end]) => <span key={name} className={end <= time ? "replay-tile is-landing is-loaded" : "replay-tile"}>{name.slice(2)}</span>)}</div>
          </>}
        </div>

        <dl className="demo-timings replay-readout">
          <div><dt>지금 보는 화면</dt><dd>{viewLabel}</dd></div>
          <div><dt>도착 화면 이미지</dt><dd>{landingLoaded} / 8장</dd></div>
          <div><dt>안 보이는 맨 위 이미지</dt><dd>{topLoaded} / {topRequested}장 받음</dd></div>
          <div><dt>첫 화면 · 해시 이동</dt><dd>{format(run.fcp)} · {format(run.scroll)} ms</dd></div>
        </dl>
      </div>

      <div className="replay-timeline" aria-hidden="true">
        <div className="replay-axis">{ticks.map(tick => <span key={tick} style={{ left: percent(tick) }}>{tick / 1000}{tick === ticks.at(-1) ? "초" : ""}</span>)}</div>
        <div className="replay-row"><span>보이는 화면</span><div className="replay-track">
          {topView && <i className="replay-span replay-span-top" style={{ left: percent(topView.start), width: percent(topView.end - topView.start) }} />}
          <i className="replay-span replay-span-landing" style={{ left: percent(Math.max(run.fcp, run.scroll)), width: percent(scale - Math.max(run.fcp, run.scroll)) }} />
          <i className="replay-cursor" style={{ left: percent(time) }} />
        </div></div>
        <div className="replay-row"><span>맨 위 이미지 14장</span><div className="replay-track">
          <i className="replay-span replay-span-unused" style={{ left: percent(topImages.start), width: percent(topImages.end - topImages.start) }} />
          <i className="replay-cursor" style={{ left: percent(time) }} />
        </div></div>
        <div className="replay-row"><span>도착 화면 이미지 8장</span><div className="replay-track">
          <i className="replay-span replay-span-images" style={{ left: percent(landingImages.start), width: percent(landingImages.end - landingImages.start) }} />
          <i className="replay-cursor" style={{ left: percent(time) }} />
        </div></div>
      </div>

      <div className="range-label"><label htmlFor={`${id}-time`}>시간</label><output htmlFor={`${id}-time`}>{format(time)} ms</output></div>
      <div className="replay-scrub">
        <button type="button" className="replay-play" onClick={togglePlay} aria-label={playing ? "일시 정지" : "실제 속도로 재생"}>{playing ? "❚❚" : "▶"}</button>
        <input id={`${id}-time`} type="range" min="0" max={scale} step="10" value={time} onChange={event => { setPlaying(false); setTime(Number(event.target.value)); }} />
      </div>

      <div className="demo-result"><span>도착 화면 완성</span><strong>{format(run.complete)}<small> ms</small>{complete && <span> ✓</span>}</strong></div>
      <p className="demo-assumptions">이미지 칸은 응답을 다 받은 시각에 채워집니다. 도착 화면 완성은 화면 안 이미지 8장이 그려지고 사용자가 그 화면을 보고 있는 시각입니다.</p>
    </div>
    <p className="demo-disclaimer">측정 재생 · 실험 2에서 조건마다 10회 중 중앙값에 가장 가까운 1회 · Chrome 155, 390 × 844</p>
  </div>;
}
