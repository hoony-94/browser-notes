export const topics = ["전체", "로딩과 네트워크", "렌더링과 인터랙션", "웹의 경계"] as const;
export const statuses = ["질문", "실험 설계", "정리됨"] as const;
export type Topic = (typeof topics)[number];
export type NoteMetadata = {
  title: string;
  description: string;
  topic: Exclude<Topic, "전체">;
  status: (typeof statuses)[number];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isExample?: boolean;
};
export type Note = NoteMetadata & { slug: string; number: string };
export type TocEntry = { id: string; title: string };

// MDX exports aren't type-checked by TypeScript. Fail with the filename when
// an author's metadata is incomplete instead of rendering a broken index.
export function parseNoteMetadata(value: unknown, filename: string): NoteMetadata {
  const fail = (field: string): never => {
    throw new Error(`${filename}: note.${field} 값을 확인하세요.`);
  };
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("metadata (export const note 필요)");
  const data = value as Record<string, unknown>;
  for (const field of ["title", "description"] as const) {
    if (typeof data[field] !== "string" || !data[field].trim()) fail(field);
  }
  if (!topics.slice(1).includes(data.topic as NoteMetadata["topic"])) fail("topic");
  if (!statuses.includes(data.status as NoteMetadata["status"])) fail("status");
  if (!Array.isArray(data.tags) || !data.tags.every(tag => typeof tag === "string" && tag.trim())) fail("tags");
  for (const field of ["createdAt", "updatedAt"] as const) {
    const date = data[field];
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(field);
    const parsed = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) fail(field);
  }
  if ((data.updatedAt as string) < (data.createdAt as string)) fail("updatedAt (작성일 이후여야 함)");
  if (data.isExample !== undefined && typeof data.isExample !== "boolean") fail("isExample");
  return {
    title: data.title as string,
    description: data.description as string,
    topic: data.topic as NoteMetadata["topic"],
    status: data.status as NoteMetadata["status"],
    tags: data.tags as string[],
    createdAt: data.createdAt as string,
    updatedAt: data.updatedAt as string,
    isExample: data.isExample === true,
  };
}
