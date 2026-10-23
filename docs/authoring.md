# MDX로 탐구 노트 쓰기

## 새 글 하나 추가하기

```sh
cp docs/note-template.mdx src/content/notes/my-question.mdx
pnpm dev
```

`my-question.mdx`의 메타데이터와 본문을 수정한다. `/notes/my-question`에서 확인할 수 있다. 홈 목록과 `/notes`는 파일을 자동으로 찾으므로 별도 배열이나 라우트 등록은 필요 없다. 배포된 정적 페이지에 반영하려면 다시 빌드·배포한다.

파일명은 영문 소문자·숫자·하이픈으로 쓴다. URL을 결정하므로 공개 후에는 쉽게 바꾸지 않는다. 현재는 `src/content/notes` 바로 아래의 `.mdx` 파일만 읽는다.

## 파일의 구성

```mdx
export const note = {
  title: "브라우저는 왜 HTML을 기다려야 할까?",
  description: "리소스 발견 시점을 비교하는 탐구.",
  topic: "로딩과 네트워크",
  status: "질문",
  tags: ["HTTP", "Early Hints"],
  createdAt: "2026-10-23",
  updatedAt: "2026-10-23",
  isExample: false,
};

## 왜 이 질문인가

이곳부터 일반 Markdown으로 본문을 쓴다.

<EarlyHintsDemo />
```

YAML frontmatter 대신 MDX의 `export const note`를 사용한다. 제목은 공통 화면에서 h1으로 출력하므로 본문은 `##`부터 시작한다. 문단, 링크, 목록, 인용문, 코드 블록과 GFM 표를 사용할 수 있다. 코드 블록은 기본 스타일로 표시하며 구문 강조는 아직 추가하지 않았다.

## 메타데이터 규칙

| 필드 | 규칙 |
| --- | --- |
| `title`, `description` | 비어 있지 않은 문자열 |
| `topic` | 로딩과 네트워크 / 렌더링과 인터랙션 / 웹의 경계 중 하나 |
| `status` | 질문 / 실험 설계 / 정리됨 중 하나 |
| `tags` | 문자열 배열. 태그가 없으면 `[]` |
| `createdAt`, `updatedAt` | 실제 날짜를 `YYYY-MM-DD` 형식으로 입력. 수정일은 작성일보다 빠를 수 없음 |
| `isExample` | 선택. 초기 샘플에만 `true`; 생략하면 `false` |

날짜는 자동 변경하지 않는다. 작성일과 수정일을 직접 관리하고 필요하면 본문에도 변경 이유를 남긴다. 목록은 수정일 내림차순, 같은 날짜면 파일명 순으로 정렬된다. 목록 번호는 현재 순서이며 글의 영구 ID는 파일명이다.

필수 값이 없거나 잘못된 날짜·분류를 쓰면 파일명이 포함된 오류로 빌드를 중단한다. `질문` 상태도 목록에 노출된다. **상태는 글의 성숙도이며 비공개 설정이 아니다.** 아직 목록에 넣고 싶지 않은 글은 `docs/drafts/` 등 콘텐츠 폴더 밖에서 작성한다.

## 실험 컴포넌트 넣기

`EarlyHintsDemo`는 `src/mdx-components.tsx`에 등록되어 있으므로 import 없이 사용할 수 있다. 새 실험은 React 컴포넌트로 만든 뒤 같은 파일에 등록하거나 해당 MDX에서 직접 import한다.

```mdx
import { MyExperiment } from "@/components/my-experiment";

## 가설을 바꿔보기

<MyExperiment />
```

상태나 브라우저 API를 쓰는 실험은 컴포넌트 파일 맨 위에 `"use client"`를 넣는다. MDX 본문과 목록의 파일 탐색은 서버에서 처리된다.

## 선택 사항: 목차

짧은 글은 목차 없이 작성해도 된다. 기존 글처럼 목차가 필요하면 `toc`와 일치하는 id를 직접 넣는다. 목차는 자동 추출되지 않는다.

```mdx
export const toc = [
  { id: "question", title: "01 출발한 질문" },
];

<section id="question">

## 왜 이 질문인가

본문을 여기에 쓴다. JSX 태그와 Markdown 사이에는 빈 줄을 둔다.

</section>
```

## 수정할 파일의 역할

- `src/content/notes/*.mdx`: 글과 메타데이터의 원본.
- `src/lib/notes.ts`: 파일 탐색, 메타데이터 검증, 정렬, MDX 로딩.
- `src/lib/note-metadata.ts`: 주제·상태·필드 타입과 검증 규칙.
- `src/app/notes/[slug]/page.tsx`: 제목·날짜·상태·목차의 공통 레이아웃.
- `src/mdx-components.tsx`: 모든 글에서 쓸 실험 컴포넌트 등록.

현재 홈의 ‘지금 펼쳐둔 질문’은 Early Hints를 편집 선택으로 유지한다. 이 대표 영역은 `src/app/page.tsx`에서 바꾸며, 아래 노트 목록만 자동으로 늘어난다.

## 확인

```sh
pnpm test
pnpm build
pnpm typecheck
```

테스트 명령의 TypeScript 직접 실행은 Node.js 22.6 이상이 필요하다. 현재 Node 22.14.0으로 확인했다. 일반 앱 실행의 최소 버전은 기존 Next.js 요구사항을 따른다.

구현 참고: [Next.js 공식 MDX 가이드](https://nextjs.org/docs/app/guides/mdx).
