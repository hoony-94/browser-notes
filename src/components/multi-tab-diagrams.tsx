// Mechanism diagrams for the multi-tab note. Inline SVG so the colors follow the site theme.

const T = "var(--color-text)", M = "var(--color-muted)", L = "var(--color-line)", A = "var(--color-accent)", S = "var(--color-surface)";
const font = { fontFamily: "var(--font-mono)", fontSize: 11 } as const;

function Box({ x, y, w, h, label, fill = S, stroke = L, dashed = false, color = T }: { x: number; y: number; w: number; h: number; label: string; fill?: string; stroke?: string; dashed?: boolean; color?: string }) {
  return <g>
    <rect x={x} y={y} width={w} height={h} rx={4} fill={fill} stroke={stroke} strokeWidth={1} strokeDasharray={dashed ? "4 3" : undefined} />
    <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fill={color} style={font}>{label}</text>
  </g>;
}

function Arrow({ x1, y1, x2, y2, color = T, dashed = false }: { x1: number; y1: number; x2: number; y2: number; color?: string; dashed?: boolean }) {
  const angle = Math.atan2(y2 - y1, x2 - x1); const hx = x2 - Math.cos(angle) * 6, hy = y2 - Math.sin(angle) * 6;
  return <g>
    <line x1={x1} y1={y1} x2={hx} y2={hy} stroke={color} strokeWidth={1.2} strokeDasharray={dashed ? "4 3" : undefined} />
    <polygon points={`${x2},${y2} ${hx - Math.sin(angle) * 3.5},${hy + Math.cos(angle) * 3.5} ${hx + Math.sin(angle) * 3.5},${hy - Math.cos(angle) * 3.5}`} fill={color} />
  </g>;
}

// 1. Ten tabs, one host, HTTP/1.1: six sockets held by long polls, four requests queued inside the browser.
export function MultiTabSocketDiagram() {
  const tabs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  return <figure className="note-figure">
    <svg viewBox="0 0 720 300" role="img" aria-label="탭 10개가 같은 호스트의 소켓 6개를 나눠 쓰는 그림. 탭 1~6의 롱폴링 요청은 소켓을 사용해 서버에 도착했고, 탭 7~10의 요청은 브라우저 대기열에서 빈 소켓을 기다린다." style={{ width: "100%", height: "auto", display: "block" }}>
      <rect x={8} y={8} width={470} height={284} rx={8} fill="none" stroke={L} />
      <text x={20} y={30} fill={M} style={font}>브라우저 (프로필 하나)</text>
      <rect x={560} y={8} width={152} height={284} rx={8} fill="none" stroke={L} />
      <text x={572} y={30} fill={M} style={font}>알림 서버 · HTTP/1.1</text>
      {tabs.map((n, i) => <Box key={n} x={20} y={44 + i * 24} w={64} h={20} label={`탭 ${n}`} />)}
      <text x={196} y={30} fill={M} style={font}>소켓 풀 · lp.localhost 그룹 (최대 6)</text>
      {[1, 2, 3, 4, 5, 6].map((n, i) => <g key={n}>
        <Arrow x1={84} y1={54 + i * 24} x2={178} y2={54 + i * 24} color={A} />
        <Box x={180} y={44 + i * 24} w={120} h={20} label={`소켓 ${n} · 롱폴링 중`} fill={A} stroke={A} color={S} />
        <Arrow x1={300} y1={54 + i * 24} x2={574} y2={54 + i * 24} color={A} />
        <Box x={576} y={44 + i * 24} w={124} h={20} label={`요청 유지 (최대 30초)`} />
      </g>)}
      <rect x={180} y={188} width={120} height={100} rx={4} fill="none" stroke={L} strokeDasharray="4 3" />
      <text x={240} y={204} textAnchor="middle" fill={M} style={font}>빈 소켓 대기열</text>
      {[7, 8, 9, 10].map((n, i) => <g key={n}>
        <Arrow x1={84} y1={54 + (n - 1) * 24} x2={178} y2={54 + (n - 1) * 24} color={M} dashed />
        <Box x={190} y={210 + i * 19} w={100} h={16} label={`탭 ${n} 요청 대기`} fill="none" stroke={M} dashed color={M} />
      </g>)}
      <text x={430} y={240} textAnchor="middle" fill={M} style={font}>서버에 닿지 않음</text>
      <text x={430} y={256} textAnchor="middle" fill={M} style={font}>DevTools에서는 Stalled</text>
    </svg>
    <figcaption>HTTP/1.1에서는 스킴·호스트·포트가 같은 소켓을 최대 6개까지 연다. 롱폴링 요청 6개가 소켓을 모두 사용하면 나머지 요청은 브라우저 안에서 기다린다. 같은 프로필의 탭들은 이 소켓 풀과 대기열을 공유한다.</figcaption>
  </figure>;
}

// 2. Two kinds of events: one aimed at a waiting tab's room frees one socket; one for every tab frees all six.
export function MultiTabEventDiagram() {
  const row = (y: number, title: string, steps: { x: number; w: number; label: string; accent?: boolean; muted?: boolean }[], note: string) => <g>
    <text x={0} y={y - 10} fill={T} style={{ ...font, fontWeight: 600 }}>{title}</text>
    <line x1={0} y1={y + 46} x2={720} y2={y + 46} stroke={L} />
    {steps.map((s, i) => <g key={i}>
      <rect x={s.x} y={y} width={s.w} height={34} rx={4} fill={s.accent ? A : "none"} stroke={s.muted ? M : s.accent ? A : L} strokeDasharray={s.muted ? "4 3" : undefined} />
      <text x={s.x + s.w / 2} y={y + 21} textAnchor="middle" fill={s.accent ? S : s.muted ? M : T} style={font}>{s.label}</text>
      {i < steps.length - 1 && <Arrow x1={s.x + s.w} y1={y + 17} x2={steps[i + 1].x} y2={y + 17} color={M} />}
    </g>)}
    <text x={0} y={y + 62} fill={M} style={font}>{note}</text>
  </g>;
  return <figure className="note-figure">
    <svg viewBox="0 0 720 230" role="img" aria-label="두 종류의 이벤트가 전달되는 과정. 모든 탭에 보내는 이벤트는 서버가 요청 6개에 한꺼번에 응답하면서 소켓 6개가 빈다. 기다리던 탭들도 바로 요청을 보내 since 이후의 이벤트를 14 ms 안에 받는다. 한 대화방에만 보내는 이벤트는 소켓 1개만 비고, 대기열 맨 앞의 다른 탭이 이 소켓을 사용한다. 탭 8은 다른 요청의 대기 시간이 끝날 때까지 기다렸다가 27초 뒤에 이벤트를 받는다." style={{ width: "100%", height: "auto", display: "block" }}>
      <g transform="translate(0, 24)">
        {row(0, "모든 탭에 가는 이벤트 (측정 4~14 ms)", [
          { x: 0, w: 110, label: "서버: 이벤트 발행" },
          { x: 134, w: 150, label: "대기 중인 요청 6개에 응답", accent: true },
          { x: 308, w: 120, label: "소켓 6개가 빈다", accent: true },
          { x: 452, w: 130, label: "탭 7~10 요청 전송" },
          { x: 606, w: 114, label: "since 이후 재전송" },
        ], "기다리던 탭도 바로 요청을 보낸다 · 탭 1~6의 다음 요청은 대기열 끝으로 간다")}
      </g>
      <g transform="translate(0, 134)">
        {row(0, "탭 8이 보는 대화방에만 가는 이벤트 (측정 27.2초)", [
          { x: 0, w: 110, label: "서버: 대화방 A 이벤트" },
          { x: 134, w: 150, label: "대화방 A 연결(탭 4)에만 응답", accent: true },
          { x: 308, w: 120, label: "소켓 1개가 빈다" },
          { x: 452, w: 130, label: "대기열의 탭 7이 사용", muted: true },
          { x: 606, w: 114, label: "탭 8: 계속 대기" , muted: true },
        ], "탭 8은 다른 요청의 대기 시간이 끝난 뒤 요청을 보내고, since 이후의 이벤트를 받는다")}
      </g>
    </svg>
    <figcaption>같은 대기열에 있어도 서버가 몇 개의 요청에 응답하느냐에 따라 빈 소켓 수가 달라졌다. 그 결과 이벤트를 받기까지 걸린 시간도 최대 14 ms와 약 27초로 차이가 났다.</figcaption>
  </figure>;
}
