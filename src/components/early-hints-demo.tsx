"use client";

import { useId, useState } from "react";
import { getLoadingTimeline } from "@/lib/early-hints-model";

export function EarlyHintsDemo() {
  const id = useId();
  const [enabled, setEnabled] = useState(true);
  const [responseStart, setResponseStart] = useState(600);
  const [htmlDuration, setHtmlDuration] = useState(300);
  const timing = getLoadingTimeline(responseStart, htmlDuration, enabled);
  const scale = 2000;

  return <div className="hint-demo">
    <div className="demo-chrome"><span className="window-dots" aria-hidden="true"><i /><i /><i /></span><span>the waiting room</span><span className="mono">EXP. 001</span></div>
    <div className="demo-body">
      <div className="demo-topline"><span className="eyebrow">STREAMING + EARLY HINTS</span><span className="demo-live"><i className="status-dot" /> 양쪽 모두 스트리밍</span></div>
      <div className="request-diagram" aria-hidden="true"><div className="diagram-browser"><span>▱</span><small>BROWSER</small></div><div className="diagram-connection"><span className={timing.hintAt !== null ? "packet active" : "packet"}>{timing.hintAt !== null ? "103 AT 100 ms" : "LINK WITH 200"}</span><div className="connection-line" /><span className="connection-caption">{timing.hintAt !== null ? "200보다 먼저 CSS 힌트 도착" : "200 응답에서 CSS 힌트 도착"}</span></div><div className="diagram-server"><span>▤</span><small>SERVER</small></div></div>
      <div className="waterfall" role="img" aria-label={`요청 후 ${responseStart}밀리초에 200 응답과 HTML 수신 시작, ${timing.htmlEnd}밀리초에 HTML 수신 완료. CSS는 ${timing.cssStart}밀리초부터 ${timing.cssEnd}밀리초까지 수신.`}>
        <div className="timeline-axis"><span>0</span><span>1,000</span><span>2,000 ms</span></div>
        <div className="timeline-row"><span>대기</span><div className="track"><div className="bar wait-bar" style={{ width: `${responseStart / scale * 100}%` }} /></div></div>
        <div className="timeline-row"><span>HTML</span><div className="track"><div className="bar html-bar" style={{ marginLeft: `${responseStart / scale * 100}%`, width: `${htmlDuration / scale * 100}%` }} /></div></div>
        <div className="timeline-row"><span>CSS</span><div className="track"><div className="bar css-bar" style={{ marginLeft: `${timing.cssStart / scale * 100}%`, width: `${400 / scale * 100}%` }}>400 ms</div></div></div>
      </div>
      <dl className="demo-timings">
        <div><dt>200 · HTML 시작</dt><dd>{responseStart} ms</dd></div>
        <div><dt>HTML 수신 완료</dt><dd>{timing.htmlEnd} ms</dd></div>
        <div><dt>CSS 요청 시작</dt><dd>{timing.cssStart} ms</dd></div>
        <div><dt>CSS 수신 완료</dt><dd>{timing.cssEnd} ms</dd></div>
      </dl>
      <div className="demo-controls"><label htmlFor={`${id}-toggle`}>103 Early Hints <span>HTML 응답 조건은 그대로, 힌트만 먼저</span></label><button id={`${id}-toggle`} className="switch" type="button" role="switch" aria-label="103 Early Hints" aria-checked={enabled} onClick={() => setEnabled(!enabled)}><span /></button></div>
      <div className="range-label"><label htmlFor={`${id}-start`}>200 응답 시작 시점</label><output htmlFor={`${id}-start`}>{responseStart} ms</output></div>
      <input id={`${id}-start`} type="range" min="100" max="1000" step="100" value={responseStart} onChange={event => setResponseStart(Number(event.target.value))} />
      <div className="range-label"><label htmlFor={`${id}-duration`}>응답 시작 후 HTML 수신 기간</label><output htmlFor={`${id}-duration`}>{htmlDuration} ms</output></div>
      <input id={`${id}-duration`} type="range" min="100" max="800" step="100" value={htmlDuration} onChange={event => setHtmlDuration(Number(event.target.value))} />
      <div aria-live="polite">
        <div className="demo-result"><span>CSS 요청을 앞당긴 시간</span><strong>{timing.cssAdvance}<small> ms</small></strong></div>
        <p className="demo-completion">HTML·CSS 모두 수신: <strong>{timing.allReceivedAt} ms</strong><br />103 OFF 기준 {timing.baselineReceivedAt} ms보다 {timing.completionAdvance} ms 빠름</p>
      </div>
      <p className="demo-assumptions">103은 100ms, CSS 수신은 400ms로 가정합니다. 200이 100ms에 도착하면 103으로 앞당길 여지가 없습니다.</p>
    </div>
    <p className="demo-disclaimer">개념 시뮬레이션 · 수신 완료는 화면 표시나 LCP를 뜻하지 않습니다.</p>
  </div>;
}
