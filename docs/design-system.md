# 디자인 토큰 v0.1

단일 정의: `src/styles/tokens.css`. 실제 샘플: `/design-system`.

## 사용 규칙

원시 색상 → 의미 토큰 → 컴포넌트 순서로 사용한다. 새 UI에서는 `--orange-600` 대신 `--color-accent`를 쓴다. 새로운 값은 실제 반복되는 요구가 생길 때 추가한다. 타임라인과 작은 다이어그램의 치수는 지역 스타일로 둔다.

| 역할 | 토큰 | 기본값 |
| --- | --- | --- |
| 페이지 | `--color-bg` | `#faf9f6` |
| 노트·실험 표면 | `--color-surface` | `#f2f0e9` |
| 본문 | `--color-text` | `#252822` |
| 보조 설명 | `--color-muted` | `#62665c` |
| 구분선 | `--color-line` | `#e5e2d9` |
| 질문·조작·포커스 | `--color-accent`, `--color-focus` | `#b84927` |
| 진행 상태 | `--color-positive` | `#4f6651` |

## 타이포그래피와 간격

- Display: Iowan Old Style → Palatino → Georgia. 영문 선언·짧은 제목.
- Sans: Apple SD Gothic Neo → Noto Sans KR → Malgun Gothic → system-ui. 한글과 본문.
- Mono: SFMono-Regular → Consolas → Liberation Mono. 수치·주석·코드.
- 외부 폰트 요청 없음. 운영체제에 따라 글자 모양과 줄바꿈이 다를 수 있다.
- 주요 크기: 11 / 13 / 16 / 18px, 페이지 제목 32–56px, 히어로 56–96px.
- 간격: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128px.
- 페이지 최대 폭 1240px, 본문 최대 폭 700px, 유동 gutter.
- 모서리: 4px 보조, 10px 실험 패널, pill 상태·필터. 일반 본문은 박스보다 선으로 구분.
- 반응형: 1050px 밀도 축소, 760px 단일 열, 460px 좁은 화면 조정.

## 인터랙션과 접근성

- 움직임은 상태 변화에만 사용: 피드백 160ms / 그래프 280ms.
- `prefers-reduced-motion: reduce`에서는 애니메이션과 전환 제거.
- 본문 건너뛰기 링크, 시맨틱 내비게이션, 현재 페이지 표시.
- 필터는 실제 button + aria-pressed, 토글은 role=switch + aria-checked.
- range에는 연결된 label과 output, 결과에는 aria-live.
- 그래프와 별개로 현재 수치의 텍스트 대체 제공.
- 상태는 색과 텍스트를 함께 사용. 외부 링크는 같은 탭에서 열림.

## 컴포넌트

- `SiteHeader`, `SiteFooter`: 공유 탐색.
- `EarlyHintsDemo`: 홈·실험실·본문에서 같은 계산 모델을 사용.
- `NoteList`: 주제 필터와 탐구 목록.
- `.badge`, `.text-link`, `.editorial-note`: 상태, 이동, 증거 수준 안내.

이 단계에서는 테마 엔진, 토큰 빌드 도구, UI 라이브러리를 추가하지 않는다. 실제 글을 쓰면서 필요한 패턴만 추출한다.

## 로고

Browser Notes의 소문자 `bn`을 분리된 SVG 획으로 표현한다. 기울임과 음수 자간을 제거해 `bi`로 오독되지 않도록 했다. 헤더와 파비콘은 같은 글자 형태를 사용한다. 글자 색은 본문 잉크색, 주황색 점은 기존 강조색을 따른다.
