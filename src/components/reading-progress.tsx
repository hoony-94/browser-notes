"use client";

import { useEffect, useState } from "react";

// Korean technical prose reads at roughly 500 characters a minute; each figure
// or chart adds about 12 seconds. Short notes don't need the indicator.
const charactersPerMinute = 500;
const minutesPerFigure = 0.2;
const minimumMinutes = 3;

export function ReadingProgress() {
  const [reading, setReading] = useState<{ total: number; percent: number } | null>(null);

  useEffect(() => {
    const article = document.querySelector<HTMLElement>("article.prose");
    if (!article) return;
    const characters = article.innerText.match(/\S/g)?.length ?? 0;
    const figures = new Set(article.querySelectorAll("figure, .hint-demo")).size;
    const total = characters / charactersPerMinute + figures * minutesPerFigure;

    let frame = 0;
    const update = () => {
      frame = 0;
      // 0% when the article's top reaches the top of the viewport,
      // 100% when its bottom reaches the bottom.
      const top = article.getBoundingClientRect().top + window.scrollY;
      const span = article.offsetHeight - window.innerHeight;
      const progress = span > 0 ? Math.min(1, Math.max(0, (window.scrollY - top) / span)) : 1;
      const percent = Math.round(progress * 100);
      setReading(current => (current?.percent === percent && current.total === total ? current : { total, percent }));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  if (!reading || reading.total < minimumMinutes) return null;
  const remaining = reading.total * (1 - reading.percent / 100);
  const label = reading.percent >= 99 ? "끝까지 읽음" : remaining < 1 ? "1분 이내 남음" : `약 ${Math.ceil(remaining)}분 남음`;

  return <aside className="reading-progress" aria-label="읽기 진행">
    <span className="eyebrow">READING TIME</span>
    <strong>{label}</strong>
    <span className="reading-bar" aria-hidden="true"><i style={{ width: `${reading.percent}%` }} /></span>
    <small>{reading.percent}% · 전체 약 {Math.round(reading.total)}분</small>
  </aside>;
}
