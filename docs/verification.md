# 초기 검증 기록

확인일: 2026-10-23. Node 22.14.0, Next.js 16.4.2.

- `pnpm build`: 성공. 모든 페이지 정적 생성 완료.
- `pnpm typecheck`: 성공.
- `/`, `/notes`, 세 개의 예시 상세, `/lab`, `/about`, `/design-system`: HTTP 200.
- 존재하지 않는 `/notes/missing-note`: HTTP 404.
- 데스크톱 브라우저: 대표 화면 시각 확인, 경고·오류 콘솔 로그 없음.
- 390×844 모바일: 홈, Early Hints 상세, 디자인 시스템의 문서 너비가 뷰포트와 동일(390px).
- 필터: ‘렌더링과 인터랙션’ 선택 후 해당 노트 한 개 표시.
- Early Hints OFF: 절감 0ms. ON에서 키보드 Home(대기 100ms): 절감 0ms. End(대기 1000ms): 절감 400ms.
- 노트 이동과 디자인 시스템 링크 확인. 검증 후 임시 뷰포트 설정 복원.

전체 브라우저 호환성, 스크린 리더 실사용, 실제 HTTP 103 및 LCP 성능 실험은 이 초기 디자인 작업의 검증 범위에 포함하지 않았다.

## pnpm 전환 검증

- packageManager: pnpm@9.15.4.
- 기존 잠금 파일을 pnpm-lock.yaml로 변환하고 package-lock.json 제거.
- pnpm install --frozen-lockfile 성공. 의존성 버전 유지.
- 전환 후 pnpm build 및 pnpm typecheck 재검증 성공.

## 로고·MDX 작성 구조 검증

- Browser Notes 이름 확정. 헤더와 파비콘을 분리된 `bn` SVG로 변경하고 데스크톱 화면 확인.
- 기존 세 글의 본문·출처·메타데이터를 각각 MDX 파일로 이관.
- pnpm install --frozen-lockfile, pnpm test(3개), pnpm build, pnpm typecheck 통과.
- 임시 MDX 한 파일만 추가했을 때 목록이 4개로 늘고 해당 상세 URL이 생성됨을 확인.
- 임시 글의 작성일·수정일·정리됨 상태, 표, 코드 블록, 목차 없는 레이아웃과 EarlyHintsDemo 조작 확인.
- MDX 변환 과정에서 생긴 중첩 문단을 수정. 모바일 390px에서 기존 글과 임시 글에 가로 넘침 없음.
- 검증용 글 제거 후 목록 3개 복원. 기존 글 3개는 HTTP 200, 제거한 글과 없는 글은 HTTP 404.
- 글 작성 안내: docs/authoring.md. 복사용 양식: docs/note-template.mdx.
- 실제 연구 실험이나 공개 배포는 이 작업에 포함하지 않음.

## Early Hints 스트리밍 모델 수정

- 위 초기 모델의 절감 수치는 이전 구현의 기록이며 현재 데모에는 적용되지 않는다.
- 200 응답 시작, HTML 수신 완료, CSS 요청 시작 및 수신 완료를 분리했다.
- 103 ON/OFF에서 HTML 조건 유지, 빠른 200 응답, 늦은 HTML 완료 및 슬라이더 조합을 검증하는 모델 테스트 4개 추가. 전체 7개 통과.
- pnpm build 및 pnpm typecheck 통과.
- 브라우저에서 기본 ON/OFF의 HTML 완료 900ms 유지 확인. CSS 요청은 500ms 앞당겨지고, 모두 수신하는 시점은 100ms 앞당겨짐.
- HTML 수신 기간 800ms에서는 CSS 요청이 앞당겨져도 전체 수신 완료는 1400ms로 동일함을 확인.
- 글 소개의 Next.js 한정 표현을 제거하고, 서버의 스트리밍 렌더링과 브라우저의 점진적 수신을 구분했다. 수정 문구의 페이지 표시 확인.
- 실제 HTTP 103 전달 및 LCP 측정은 수행하지 않았다.
