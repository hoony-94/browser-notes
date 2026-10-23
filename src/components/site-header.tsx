"use client";

import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  return <header className="site-header shell">
    <Link href="/" className="brand" aria-label="Browser Notes 홈"><BrandMark /><span>browser notes<span className="brand-period">.</span></span></Link>
    <nav aria-label="주요 메뉴">{[
      ["/notes", "탐구 노트"], ["/lab", "실험실"], ["/about", "이 공간에 관하여"],
    ].map(([href, label]) => <Link key={href} href={href} aria-current={pathname.startsWith(href) ? "page" : undefined}>{label}</Link>)}</nav>
    <span className="header-aside"><i className="status-dot" /> ALWAYS CURIOUS</span>
  </header>;
}
