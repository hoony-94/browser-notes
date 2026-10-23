import assert from "node:assert/strict";
import test from "node:test";
import { parseNoteMetadata } from "../src/lib/note-metadata.ts";

const valid = {
  title: "왜 기다리는가?", description: "리소스 발견 시점을 비교한다.",
  topic: "로딩과 네트워크", status: "질문", tags: ["HTTP"],
  createdAt: "2026-10-23", updatedAt: "2026-10-23",
};

test("작성한 노트는 예시 초안으로 취급하지 않는다", () => {
  assert.equal(parseNoteMetadata(valid, "new-note.mdx").isExample, false);
  assert.equal(parseNoteMetadata({ ...valid, isExample: true }, "example.mdx").isExample, true);
});

test("누락된 export와 잘못된 분류는 파일명이 있는 오류를 낸다", () => {
  for (const value of [undefined, { ...valid, title: " " }, { ...valid, topic: "전체" }, { ...valid, status: "완료" }, { ...valid, tags: [12] }]) {
    assert.throws(() => parseNoteMetadata(value, "bad-note.mdx"), /bad-note\.mdx: note\./);
  }
});

test("날짜 형식, 존재하지 않는 날짜, 거꾸로 된 수정일을 거부한다", () => {
  for (const dates of [
    { createdAt: "2026-2-03" }, { createdAt: "2026-02-30" },
    { updatedAt: "2026-10-22" }, { updatedAt: "not-a-date" },
  ]) {
    assert.throws(() => parseNoteMetadata({ ...valid, ...dates }, "dates.mdx"), /dates\.mdx/);
  }
});
