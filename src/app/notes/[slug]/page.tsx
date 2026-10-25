import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FigureZoom } from "@/components/figure-zoom";
import { ReadingProgress } from "@/components/reading-progress";
import { getNote, getNotes } from "@/lib/notes";

export async function generateStaticParams() {
  return (await getNotes()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getNote(slug);
  if (!result) notFound();
  return { title: result.note.title, description: result.note.description };
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getNote(slug);
  if (!result) notFound();
  const { note, Content, toc } = result;

  return (
    <main id="main" className="shell article-main">
      <Link className="back-link" href="/notes">← 모든 탐구 노트</Link>
      <header className="article-header">
        <p className="eyebrow">FIELD NOTE {note.number} / {note.topic}</p>
        <h1>{note.title}</h1>
        <p>{note.description}</p>
        <div className="note-meta">
          <span className={`badge ${note.status === "실험 설계" ? "badge-active" : note.status === "정리됨" ? "badge-complete" : ""}`}>{note.status}</span>
          {note.isExample && <span>예시 초안 · 검증 전</span>}
          <span>{note.tags.join(" · ")}</span>
        </div>
        <div className="article-dates">
          <span>작성 <time dateTime={note.createdAt}>{note.createdAt}</time></span>
          <span>수정 <time dateTime={note.updatedAt}>{note.updatedAt}</time></span>
        </div>
      </header>
      <div className={toc.length ? "article-layout" : "article-layout article-layout-without-toc"}>
        {toc.length > 0 && (
          <aside className="article-toc" aria-label="목차">
            <span className="eyebrow">IN THIS NOTE</span>
            {toc.map(item => <a key={item.id} href={`#${item.id}`}>{item.title}</a>)}
          </aside>
        )}
        <article className="prose"><Content /></article>
        <ReadingProgress />
        <FigureZoom />
      </div>
    </main>
  );
}
