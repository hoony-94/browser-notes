"use client";

import { useEffect, useRef, useState } from "react";

type Opened = { src: string; alt: string; caption: string; trigger: HTMLImageElement };

// Notes write figures as plain <figure className="note-figure"> in MDX, so this
// enhances them after render: each image becomes a button that opens a
// full-screen viewer. Clicking the image there toggles fit-to-screen and its
// actual size.
export function FigureZoom() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [actualSize, setActualSize] = useState(false);

  useEffect(() => {
    const images = [...document.querySelectorAll<HTMLImageElement>("article.prose .note-figure img")];
    const open = (image: HTMLImageElement) => {
      const caption = image.closest("figure")?.querySelector("figcaption")?.textContent ?? "";
      setActualSize(false);
      setOpened({ src: image.currentSrc || image.src, alt: image.alt, caption, trigger: image });
    };
    const cleanups = images.map(image => {
      image.classList.add("is-zoomable");
      image.tabIndex = 0;
      image.setAttribute("role", "button");
      image.setAttribute("aria-haspopup", "dialog");
      image.title = "크게 보기";
      const onClick = () => open(image);
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open(image);
        }
      };
      image.addEventListener("click", onClick);
      image.addEventListener("keydown", onKeyDown);
      return () => {
        image.removeEventListener("click", onClick);
        image.removeEventListener("keydown", onKeyDown);
      };
    });
    return () => cleanups.forEach(cleanup => cleanup());
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!element || !opened) return;
    element.showModal();
    document.documentElement.classList.add("has-figure-zoom");
    return () => document.documentElement.classList.remove("has-figure-zoom");
  }, [opened]);

  const close = () => {
    const trigger = opened?.trigger;
    dialog.current?.close();
    trigger?.focus();
  };

  return <dialog ref={dialog} className="figure-zoom" aria-label="이미지 크게 보기" onClose={() => setOpened(null)} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    {opened && <>
      <div className="figure-zoom-bar">
        <button type="button" onClick={() => setActualSize(!actualSize)}>{actualSize ? "화면에 맞추기" : "원본 크기"}</button>
        <button type="button" onClick={close}>닫기 <span aria-hidden="true">✕</span></button>
      </div>
      <div className={actualSize ? "figure-zoom-body is-actual" : "figure-zoom-body"} onClick={event => { if (event.target === event.currentTarget) close(); }}>
        <img src={opened.src} alt={opened.alt} onClick={() => setActualSize(!actualSize)} />
      </div>
      {opened.caption && <p className="figure-zoom-caption">{opened.caption}</p>}
    </>}
  </dialog>;
}
