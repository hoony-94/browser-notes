import type { Metadata } from "next";
export const metadata: Metadata = { title: "이 공간에 관하여" };
export default function AboutPage() {
  return <main id="main" className="shell page-main"><p className="eyebrow">THE INTENTION / 03</p><h1 className="page-title">만드는 일 다음에,<br /><em>이해하는 일이 남습니다.</em></h1><p className="page-intro">Browser Notes는 프론트엔드 개발자의 개인 탐구 공간입니다.<br />아래 문장은 이 공간을 시작하기 위해 제안하는 원칙의 초안입니다.</p><div className="principles">{[
    ["01", "사용법보다, 존재 이유를.", "새 API를 발견하면 해결하려는 문제가 무엇이었는지부터 따라갑니다. 표준의 배경, 이전 방식의 제약, 다른 선택의 가능성을 함께 읽습니다."],
    ["02", "프레임워크를 하나의 사례로.", "브라우저와 HTTP의 원리를 중심에 둡니다. Next.js를 비롯한 도구가 그 원리를 어떤 추상화로 드러내거나 감추는지 비교합니다."],
    ["03", "데모와 증거를 구분하기.", "시뮬레이션은 이해를 돕고, 측정은 주장을 검증합니다. 실행 환경과 실패한 조건, 반례를 남겨 다른 사람이 다시 확인할 수 있게 합니다."],
    ["04", "AI와 만들고, 내 판단으로 남기기.", "AI는 구현과 탐색을 돕는 협업자입니다. 가설을 고르고 근거를 검토하며 결론에 책임지는 일은 작성자의 몫입니다. 도움받은 범위와 검증하지 못한 부분도 기록합니다."],
  ].map(([number, title, body]) => <section key={number}><span className="note-number">{number}</span><div><h2>{title}</h2><p>{body}</p></div></section>)}</div><div className="about-closing"><span className="manifesto-symbol" aria-hidden="true">✳</span><p>좋은 기록은 답을 보여주는 동시에,<br />다음 질문이 생길 자리를 남깁니다.</p></div></main>;
}
