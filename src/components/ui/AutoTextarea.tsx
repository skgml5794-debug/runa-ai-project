"use client";

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

/** 내용 길이에 맞게 높이가 늘어나는 한 줄 시작 텍스트 영역 */
export function AutoTextarea({
  value,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      className={`block w-full min-w-0 resize-none overflow-hidden border outline-none transition-colors ${className}`}
      {...props}
    />
  );
}
