"use client";

import { useEffect } from "react";

const EDITABLE = "input, textarea, [contenteditable='true']";
/** 주소창 높이 변화와 구분하기 위한 최소 키보드 높이 */
const OPEN_THRESHOLD = 120;

/**
 * 모바일 키보드가 열린 동안 화면 아래 팝업이 키보드 위로 올라오도록 --keyboard-inset(px)을 갱신하고,
 * 하단 메뉴를 숨기는 data-keyboard="open"을 문서에 표시한다.
 * - iOS Safari: 키보드가 화면(레이아웃) 위를 덮기만 하므로 visualViewport로 가려진 높이를 계산한다.
 * - Android Chrome: viewport의 interactive-widget=resizes-content로 화면이 줄어들어 가려진 높이는 0이다.
 */
export function KeyboardInset() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    let baseWidth = window.innerWidth;
    let baseHeight = window.innerHeight;
    let wasOpen = false;

    const update = () => {
      // 회전하거나 창 크기가 바뀌면 기준 높이를 다시 잡는다.
      if (window.innerWidth !== baseWidth) {
        baseWidth = window.innerWidth;
        baseHeight = window.innerHeight;
      }
      baseHeight = Math.max(baseHeight, window.innerHeight);
      const focused = document.activeElement?.matches(EDITABLE) ?? false;
      const open = focused && baseHeight - viewport.height > OPEN_THRESHOLD;
      const hidden = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
      root.style.setProperty("--keyboard-inset", open ? `${hidden}px` : "0px");
      if (open) root.setAttribute("data-keyboard", "open");
      else root.removeAttribute("data-keyboard");
      // 키보드가 열리는 순간, 포커스한 입력창이 키보드·하단 버튼에 가려지지 않게 화면 안으로 가져온다.
      if (open && !wasOpen) {
        const field = document.activeElement;
        requestAnimationFrame(() => field?.scrollIntoView({ block: "center", behavior: "smooth" }));
      }
      wasOpen = open;
    };
    // 포커스가 옮겨진 뒤의 activeElement를 읽기 위해 한 박자 늦춘다.
    const afterFocus = () => setTimeout(update, 0);

    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    document.addEventListener("focusin", afterFocus);
    document.addEventListener("focusout", afterFocus);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("focusin", afterFocus);
      document.removeEventListener("focusout", afterFocus);
      root.style.removeProperty("--keyboard-inset");
      root.removeAttribute("data-keyboard");
    };
  }, []);

  return null;
}
