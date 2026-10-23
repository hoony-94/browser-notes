import Link from "next/link";

export function SiteFooter() {
  return <footer className="site-footer shell"><div><Link href="/" className="footer-brand">browser notes.</Link><p>프레임워크 너머, 브라우저 가까이.</p></div><div className="footer-links"><Link href="/about">이 공간의 원칙 ↗</Link><Link href="/design-system">디자인 시스템 ↗</Link><span>AN OPEN-ENDED EXPLORATION · 2026</span></div></footer>;
}
