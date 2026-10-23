import assert from "node:assert/strict";
import test from "node:test";
import { getLoadingTimeline } from "../src/lib/early-hints-model.ts";

test("103만 전환하면 HTML 시작과 완료 시점은 변하지 않는다", () => {
  const off = getLoadingTimeline(600, 300, false);
  const on = getLoadingTimeline(600, 300, true);
  assert.equal(off.responseStart, on.responseStart);
  assert.equal(off.htmlEnd, on.htmlEnd);
  assert.equal(on.htmlEnd, 900);
  assert.equal(off.cssStart, 600);
  assert.equal(on.cssStart, 100);
  assert.equal(on.cssAdvance, 500);
  assert.equal(off.allReceivedAt, 1000);
  assert.equal(on.allReceivedAt, 900);
  assert.equal(on.completionAdvance, 100);
});

test("200이 힌트 예정 시점에 도착하면 103의 추가 이점은 없다", () => {
  const on = getLoadingTimeline(100, 300, true);
  assert.equal(on.hintAt, null);
  assert.equal(on.cssAdvance, 0);
  assert.equal(on.completionAdvance, 0);
});

test("HTML 수신이 오래 걸리면 CSS를 앞당겨도 모두 수신한 시점은 같다", () => {
  const on = getLoadingTimeline(600, 800, true);
  assert.equal(on.cssAdvance, 500);
  assert.equal(on.allReceivedAt, 1400);
  assert.equal(on.completionAdvance, 0);
});

test("모든 슬라이더 범위에서 수신 순서와 비교 기준이 일관된다", () => {
  for (let start = 100; start <= 1000; start += 100) {
    for (let duration = 100; duration <= 800; duration += 100) {
      const off = getLoadingTimeline(start, duration, false);
      const on = getLoadingTimeline(start, duration, true);
      assert.equal(off.completionAdvance, 0);
      assert.equal(on.htmlEnd, start + duration);
      assert.ok(on.allReceivedAt >= on.htmlEnd && on.allReceivedAt >= on.cssEnd);
      assert.ok(on.allReceivedAt <= off.allReceivedAt);
      assert.equal(on.baselineReceivedAt, off.allReceivedAt);
    }
  }
});
