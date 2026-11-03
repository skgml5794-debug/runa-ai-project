"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { createPortal } from "react-dom";
import { SUMMARY_SCOPE } from "@/lib/constants";
import { useFrameElement } from "../AppFrame";
import { Button } from "./Button";

/** 요약 범위 안내 시트. Instagram / Threads 탭마다 불러올 수 있는 내용과 없는 내용을 위에서 아래로 보여준다. */
export function ScopeSheet({ onClose }: { onClose(): void }) {
  const frame = useFrameElement();
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const handleClose = useEffectEvent(onClose);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!frame) return null;
  const scope = SUMMARY_SCOPE[tab];
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex min-[431px]:absolute items-end bg-midnight-ink/40"
      // 어두운 바깥 영역을 누르면 닫는다.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="요약 범위"
        className="flex max-h-[88dvh] w-full animate-dialog-in flex-col rounded-t-3xl bg-white pt-6"
      >
        <div className="px-5">
          <h2 className="text-lg font-bold text-midnight-ink">요약 범위</h2>
          <div role="tablist" className="mt-4 flex w-fit gap-1 rounded-full bg-[#eef2f6] p-1">
            {SUMMARY_SCOPE.map((item, index) => (
              <button
                key={item.service}
                type="button"
                role="tab"
                aria-selected={tab === index}
                onClick={() => {
                  setTab(index);
                  setPage(0);
                }}
                className={`h-8 rounded-full px-4 text-[13px] font-semibold ${
                  tab === index ? "bg-white text-brand" : "text-slate"
                }`}
              >
                {item.service}
              </button>
            ))}
          </div>
        </div>
        <div
          key={tab}
          role="tabpanel"
          onScroll={(event) => {
            const list = event.currentTarget;
            const card = list.firstElementChild?.getBoundingClientRect().width ?? 1;
            setPage(Math.round(list.scrollLeft / (card + 12)));
          }}
          className="no-scrollbar flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-8 pt-6"
        >
          {scope.items.map((item, index) => (
            <div key={item.title} className="flex w-[84%] shrink-0 snap-start flex-col">
              {/* 제목 영역 높이를 두 줄로 고정해, 가로로 넘겨도 이미지 위치가 같게 한다. */}
              <div className="flex min-h-12 items-center gap-2">
                <p className="min-w-0 text-[18px] font-semibold leading-6 tracking-[-0.5px] text-midnight-ink">
                  {index + 1}. {item.title}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 ${
                    item.ok ? "bg-[#e6f8ea] text-[#1f9d55]" : "bg-[#fdecec] text-danger"
                  }`}
                >
                  {item.ok ? "가능" : "불가능"}
                </span>
              </div>
              <div className="mt-1.5 flex-1 overflow-hidden rounded-2xl bg-white shadow-[0_6px_24px_rgba(21,25,36,0.10)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt="" className="aspect-[564/308] w-full shrink-0 object-cover" draggable={false} />
                <div className="px-4 py-4">
                  <p className="whitespace-pre-line break-keep text-[15px] leading-6 text-midnight-ink">{item.text}</p>
                  {"tip" in item ? (
                    // Tip. 뒤의 본문 첫 글자가 같은 세로선에 오도록 라벨과 본문을 나눈다.
                    <p className="mt-2 flex gap-1 text-[13px] leading-5 text-[#1CC98A]">
                      <span className="shrink-0">Tip.</span>
                      <span className="whitespace-pre-line break-keep">{item.tip.replace(/^Tip\.\s*/, "")}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="-mt-2 flex justify-center gap-1.5" aria-hidden>
          {scope.items.map((item, index) => (
            <span
              key={item.title}
              className={`size-1.5 rounded-full ${page === index ? "bg-midnight-ink" : "bg-mist"}`}
            />
          ))}
        </div>
        <div className="px-5 pb-4 pt-4">
          <Button variant="primary" className="w-full" onClick={onClose}>
            확인
          </Button>
        </div>
      </div>
    </div>,
    frame,
  );
}
