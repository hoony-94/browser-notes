import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "@/styles/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Browser Notes — 프레임워크 너머, 브라우저 가까이", template: "%s · Browser Notes" },
  description: "브라우저의 설계 선택을 질문하고, 작은 실험으로 이해하는 프론트엔드 개발자의 연구 노트.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body><a className="skip-link" href="#main">본문으로 건너뛰기</a><SiteHeader />{children}<SiteFooter /></body></html>;
}
