# Browser Notes

프레임워크 너머, 브라우저 가까이. 브라우저의 설계 선택을 질문하고 실험하는 개인 연구 공간의 초기 디자인·구조.

## 실행

```sh
cd ~/Study/browser-notes
pnpm install --frozen-lockfile
pnpm dev
```

로컬 주소: http://127.0.0.1:3100

```sh
pnpm build
pnpm typecheck
pnpm start
```

Node.js 20.9 이상과 pnpm 9.15.4가 필요하다. 이 프로젝트는 Node 22.14.0으로 확인했다. 설치 버전은 package.json과 pnpm-lock.yaml에 고정했다. Next.js 16.4.2 / React 19.3.1 / TypeScript 7.0.2 / App Router / CSS Custom Properties.

## 먼저 볼 파일

- `docs/design-direction.md`: 레퍼런스, 카테고리 기준, 화면 구성, 글의 관점.
- `docs/design-system.md`: 토큰, 타이포그래피, 반응형, 접근성 규칙.
- `docs/writing-template.md`: AI와 탐구 글을 작성할 때 사용하는 틀.
- `src/styles/tokens.css`: 디자인 토큰의 단일 정의.
- `docs/authoring.md`: MDX 작성 방법과 메타데이터 규칙.
- `docs/note-template.mdx`: 복사해서 시작하는 실제 MDX 양식.
- `src/content/notes/*.mdx`: 각 글의 메타데이터와 본문.
- `src/lib/notes.ts`: 글 자동 탐색·정렬·로딩.
- `src/app/notes/[slug]/page.tsx`: 현재 글 상세 템플릿.
- `src/components/early-hints-demo.tsx`: 개념 실험 컴포넌트.

## 화면

`/` 대표 화면 · `/notes` 필터 가능한 노트 · `/notes/early-hints` 탐구 상세 · `/lab` 실험실 · `/about` 작성 원칙 · `/design-system` 토큰 샘플.

## 현재 범위와 글 추가

이 버전은 레퍼런스 조사와 디자인 기반을 확인하는 로컬 프로토타입이다. 실제 연구 성과, 작성자 이력, 측정 결과를 꾸며 넣지 않았다. Early Hints는 데모와 직접 작성할 빈 항목을 둔 탐구 노트이며, View Transitions와 Speculation Rules는 질문 노트로 남겨두었다. 실제 측정과 판단은 작성자가 채운다. 이름은 Browser Notes로 확정했으며 About 선언문은 검토할 제안이다.

글은 `src/content/notes/*.mdx`에 추가한다. 파일 안에 제목·설명·주제·상태·태그·작성일·수정일과 본문을 함께 쓰면 홈 목록과 상세 페이지에 자동 반영된다. `<EarlyHintsDemo />` 같은 실험 컴포넌트도 삽입할 수 있다.

```sh
cp docs/note-template.mdx src/content/notes/my-question.mdx
```

파일 내용을 수정하고 `/notes/my-question`에서 확인한다. 자세한 규칙은 `docs/authoring.md`에 있다. 배포 환경에는 다시 빌드·배포해야 반영된다. CMS, 온라인 에디터, 자동 AI 글쓰기, 계정, 분석 기능은 구현하지 않았다.

`pnpm test`로 글 메타데이터 검증 테스트를 실행한다. 이 테스트 명령은 Node.js 22.6 이상이 필요하다.

홈·본문·실험실의 Early Hints 데모는 실제 HTTP 103을 전송하지 않는다. 단순화한 가정에서 순서와 대기를 비교한다. 호스팅 배포는 수행하지 않았다.
