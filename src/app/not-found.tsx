import Link from "next/link";
export default function NotFound() {
  return <main id="main" className="shell page-main"><p className="eyebrow">404 / A MISSING PAGE</p><h1 className="page-title">아직 쓰이지 않은<br />페이지입니다.</h1><Link className="text-link" href="/notes">탐구 노트로 돌아가기 ↗</Link></main>;
}
