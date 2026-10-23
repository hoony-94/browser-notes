"use client";

import Link from "next/link";
import { useState } from "react";
import { topics, type Topic, type Note } from "@/lib/note-metadata";

export function NoteList({ notes }: { notes: Note[] }) {
  const [topic, setTopic] = useState<Topic>("전체");
  const visible = notes.filter(note => topic === "전체" || note.topic === topic);
  return <div className="note-index"><div className="filter-row" role="group" aria-label="탐구 주제 필터">{topics.map(item => <button key={item} aria-pressed={item === topic} onClick={() => setTopic(item)}>{item}{item === "전체" && <span>{notes.length.toString().padStart(2, "0")}</span>}</button>)}</div>
    <p className="sr-only" role="status">{visible.length}개의 탐구 노트</p>
    <div className="note-rows">{visible.map(note => <Link href={`/notes/${note.slug}`} className="note-row" key={note.slug}><span className="note-number">{note.number}</span><div><div className="note-meta"><span>{note.topic}</span><span className={`badge ${note.status === "실험 설계" ? "badge-active" : note.status === "정리됨" ? "badge-complete" : ""}`}>{note.status}</span>{note.isExample && <span>예시 초안</span>}<time dateTime={note.updatedAt}>수정 {note.updatedAt}</time></div><h3>{note.title}</h3><p>{note.description}</p></div><span className="note-tags">{note.tags.slice(0, 2).join(" / ")}</span><span className="row-arrow" aria-hidden="true">↗</span></Link>)}</div>
  </div>;
}
