import type { Metadata } from "next";
import Link from "next/link";
import { EarlyHintsDemo } from "@/components/early-hints-demo";
import { ScrollPriorityReplay } from "@/components/scroll-priority-replay";
export const metadata: Metadata = { title: "실험실" };
export default function LabPage() {
  return <main id="main" className="shell page-main"><p className="eyebrow">THE LAB / 02</p><h1 className="page-title">설명을 읽고,<br /><em>조건을 바꿔봅니다.</em></h1><p className="page-intro">데모는 결론을 꾸미는 장식이 아니라, 가설을 살펴보는 도구입니다.</p>
    <div className="lab-layout" id="the-waiting-room"><div><span className="badge badge-active">개념 시뮬레이션</span><h2>001. The waiting room</h2><p>HTML을 스트리밍하는 조건에서 103만 켜고 꺼보세요. 200 응답 시작과 HTML 수신 기간은 그대로이고, CSS 힌트를 받는 시점만 달라집니다.</p><h3>이 모델의 가정</h3><ul><li>시간은 요청 후 브라우저에서 관찰하는 시점</li><li>200 응답 시작과 HTML 수신 기간을 별도로 설정</li><li>200 헤더와 첫 HTML 조각은 동시에 도착한다고 가정</li><li>103 도착: 100ms. 200이 100ms에 도착하면 103 생략</li><li>힌트를 받으면 즉시 CSS 요청, 수신 기간은 400ms</li><li>OFF에서는 200의 Link 헤더로 같은 CSS를 발견</li><li>HTML·CSS 수신 완료는 화면 표시나 LCP가 아님</li><li>캐시·파싱·렌더링·연결 비용·대역폭 경쟁은 제외</li></ul><p>실제 HTTP 103을 전송하지 않습니다. 측정에 앞서 로딩 순서를 이해하기 위한 모델입니다.</p><Link className="text-link" href="/notes/early-hints">이 실험의 질문 읽기 ↗</Link></div><EarlyHintsDemo /></div>
    <div className="lab-layout" id="the-landing"><div><span className="badge badge-complete">측정 재생</span><h2>002. The landing</h2><p>이미지가 많은 긴 목록을 <code>#section-5</code>로 바로 열었을 때, 그 순간 사용자가 무엇을 보고 있었는지 실제 측정으로 다시 봅니다. 조건과 서버를 바꾸고 시간을 움직여 보세요. 시간은 그대로 두고 조건만 바꾸면 같은 순간을 비교할 수 있습니다.</p><h3>이 기록에 대해</h3><ul><li>Chrome 155, 390 × 844 화면</li><li>1.6 Mbps와 응답마다 150 ms 지연을 서버에서 흉내 냄</li><li>HTML 115 KB(끝에 100 KB 데이터), 히어로 200 KB, 상품 이미지 40 KB</li><li>조건마다 10회 중 도착 화면 완성이 중앙값에 가장 가까운 1회</li><li>이미지 칸은 응답을 다 받은 시각에 채워짐</li><li>맨 위 이미지 14장은 사용자가 결국 보지 않는 이미지</li></ul><p>계산 모델이 아니라 측정값을 다시 보여줍니다. 조건을 바꾸면 그 조건에서 실제로 잰 기록으로 바뀝니다.</p><Link className="text-link" href="/notes/scroll-image-priority#experiment-2">이 실험의 질문 읽기 ↗</Link></div><ScrollPriorityReplay /></div>
  </main>;
}
