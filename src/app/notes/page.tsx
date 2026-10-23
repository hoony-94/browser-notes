import type { Metadata } from "next";
import { getNotes } from "@/lib/notes";
import { NoteList } from "@/components/note-list";
export const metadata: Metadata = { title: "탐구 노트" };
export default async function NotesPage() {
  const notes = await getNotes();
  return <main id="main" className="shell page-main"><p className="eyebrow">THE NOTEBOOK / 01</p><h1 className="page-title">질문은 쌓이고,<br /><em>생각은 바뀝니다.</em></h1><p className="page-intro">분류는 기술 이름보다 오래 남는 질문을 따라갑니다.<br />‘질문 → 실험 설계 → 정리됨’은 글의 상태이며, 정리된 생각도 다시 고칠 수 있습니다.</p><NoteList notes={notes} />{notes.some(note => note.isExample) && <p className="starter-caption">‘예시 초안’으로 표시된 글은 구조를 보여주는 샘플이며 실제 검증 결과가 아닙니다.</p>}</main>;
}
