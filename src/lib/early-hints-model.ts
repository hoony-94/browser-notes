// Times are observed at the browser in this conceptual model.
// CSS always takes 400ms; 103 can arrive at 100ms if 200 hasn't arrived yet.
export function getLoadingTimeline(responseStart: number, htmlDuration: number, earlyHints: boolean) {
  const hintAt = earlyHints && responseStart > 100 ? 100 : null;
  const cssStart = hintAt ?? responseStart;
  const cssEnd = cssStart + 400;
  const htmlEnd = responseStart + htmlDuration;
  const allReceivedAt = Math.max(htmlEnd, cssEnd);
  const baselineReceivedAt = Math.max(htmlEnd, responseStart + 400);
  return {
    hintAt, responseStart, htmlEnd, cssStart, cssEnd, allReceivedAt, baselineReceivedAt,
    cssAdvance: responseStart - cssStart,
    completionAdvance: baselineReceivedAt - allReceivedAt,
  };
}
