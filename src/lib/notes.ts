import "server-only";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { parseNoteMetadata, type Note } from "./note-metadata";

const getSlugs = cache(async () => {
  const files = await readdir(path.join(process.cwd(), "src/content/notes"));
  return files.filter(file => file.endsWith(".mdx")).map(file => {
    const slug = file.slice(0, -4);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error(`${file}: 파일명은 영문 소문자, 숫자, 하이픈으로 작성하세요.`);
    }
    return slug;
  });
});

const importNote = cache(async (slug: string): Promise<typeof import("*.mdx")> => import(`@/content/notes/${slug}.mdx`));

export const getNotes = cache(async (): Promise<Note[]> => {
  const slugs = await getSlugs();
  const notes = await Promise.all(slugs.map(async slug => {
    const { note } = await importNote(slug);
    return { ...parseNoteMetadata(note, `${slug}.mdx`), slug };
  }));
  return notes
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.slug.localeCompare(b.slug))
    .map((note, index) => ({ ...note, number: String(index + 1).padStart(2, "0") }));
});

export const getNote = cache(async (slug: string) => {
  const note = (await getNotes()).find(item => item.slug === slug);
  if (!note) return undefined;
  const { default: Content, toc = [] } = await importNote(note.slug);
  return { note, Content, toc };
});
