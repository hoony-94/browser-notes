import type { Metadata } from "next";
import Link from "next/link";
import { EarlyHintsDemo } from "@/components/early-hints-demo";
export const metadata: Metadata = { title: "실험실" };
export default function LabPage() {
  return <main id="main" className="shell page-main"><p className="eyebrow">THE LAB / 02</p><h1 className="page-title">설명을 읽고,<br /><em>조건을 바꿔봅니다.</em></h1><p className="page-intro">데모는 결론을 꾸미는 장식이 아니라, 가설을 살펴보는 도구입니다.</p><div className="lab-layout"><div><span className="badge badge-active">개념 시뮬레이션</span><h2>001. The waiting room</h2><p>HTML을 스트리밍하는 조건에서 103만 켜고 꺼보세요. 200 응답 시작과 HTML 수신 기간은 그대로이고, CSS 힌트를 받는 시점만 달라집니다.</p><h3>이 모델의 가정</h3><ul><li>시간은 요청 후 브라우저에서 관찰하는 시점</li><li>200 응답 시작과 HTML 수신 기간을 별도로 설정</li><li>200 헤더와 첫 HTML 조각은 동시에 도착한다고 가정</li><li>103 도착: 100ms. 200이 100ms에 도착하면 103 생략</li><li>힌트를 받으면 즉시 CSS 요청, 수신 기간은 400ms</li><li>OFF에서는 200의 Link 헤더로 같은 CSS를 발견</li><li>HTML·CSS 수신 완료는 화면 표시나 LCP가 아님</li><li>캐시·파싱·렌더링·연결 비용·대역폭 경쟁은 제외</li></ul><p>실제 HTTP 103을 전송하지 않습니다. 측정에 앞서 로딩 순서를 이해하기 위한 모델입니다.</p><Link className="text-link" href="/notes/early-hints">이 실험의 질문 읽기 ↗</Link></div><EarlyHintsDemo /></div></main>;
}
