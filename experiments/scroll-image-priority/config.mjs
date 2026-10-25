// 서버와 측정 스크립트가 함께 쓰는 실험 조건.

export const PORT = 4433;
export const ORIGIN = `https://localhost:${PORT}`;

// 서버에서 모든 응답이 하나의 대역폭을 나눠 쓰도록 흉내 낸다.
// kbps: 내려받기 대역폭, latency: 요청마다 응답을 시작하기 전 기다리는 시간(ms).
export const PROFILES = {
  none: { kbps: 0, latency: 0, label: "제한 없음" },
  fast: { kbps: 9000, latency: 40, label: "9 Mbps · 40 ms" },
  slow: { kbps: 1600, latency: 150, label: "1.6 Mbps · 150 ms" },
};

// fair: 진행 중인 응답이 대역폭을 똑같이 나눔(우선순위를 무시하는 서버).
// priority: 브라우저가 보낸 우선순위가 높은 응답부터 보냄(우선순위를 따르는 서버).
export const SCHEDULERS = {
  fair: "균등 분배",
  priority: "우선순위 순서",
};

export const CONDITIONS = {
  A: { hero: "none", target: "lazy", label: "힌트 없음" },
  B: { hero: "high", target: "lazy", label: "히어로 img fetchpriority=high" },
  P: { hero: "preload", target: "lazy", label: "히어로 link preload + fetchpriority=high" },
  C: { hero: "none", target: "high", label: "도착 섹션 img eager + fetchpriority=high" },
  D: { hero: "high", target: "high", label: "히어로 high + 도착 섹션 high" },
  // 실험 2: <head>의 인라인 스크립트가 해시를 보고 결정한다. 해시가 없으면 모두 히어로 preload만 넣는다.
  // expect: "target"은 도착 요소, "end"는 문서 끝 요소(#page-end)가 파싱될 때까지 첫 렌더를 미룬다.
  E1: { hero: "script", target: "lazy", preload: true, expect: null, label: "해시면 도착 화면 preload + high" },
  E2t: { hero: "script", target: "lazy", preload: false, expect: "target", label: "해시면 도착 요소까지 렌더 보류" },
  E2: { hero: "script", target: "lazy", preload: false, expect: "end", label: "해시면 문서 끝까지 렌더 보류" },
  E3: { hero: "script", target: "lazy", preload: true, expect: "end", label: "E1 + E2" },
};

export const SECTIONS = 10;
export const PER_SECTION = 6;
export const DEFAULT_AT = 5;
export const HERO = { width: 1200, height: 900, bytes: 200_000 };
export const PRODUCT = { width: 400, height: 400, bytes: 40_000 };

export const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2, mobile: true };
