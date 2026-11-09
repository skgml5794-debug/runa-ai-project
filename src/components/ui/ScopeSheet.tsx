"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SUMMARY_SCOPE } from "@/lib/constants";
import { useFrameElement } from "../AppFrame";
import { Button, POPUP_BUTTON_TEXT } from "./Button";

/** 요약 범위 안내 시트. Instagram / Threads 탭마다 불러올 수 있는 내용과 없는 내용을 위에서 아래로 보여준다. */
export function ScopeSheet({
  onClose,
  onConfirm,
}: {
  /** 어두운 바깥 영역을 누르거나 ESC를 눌렀을 때 */
  onClose(): void;
  /** 확인 버튼을 눌렀을 때. 없으면 onClose와 같다. */
  onConfirm?(): void;
}) {
  const frame = useFrameElement();
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const handleClose = useEffectEvent(onClose);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // 아래에 열려 있는 팝업이 같은 ESC로 함께 닫히지 않게 한다.
      event.stopPropagation();
      handleClose();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, []);

  if (!frame) return null;
  const scope = SUMMARY_SCOPE[tab];
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex framed:absolute items-end bg-midnight-ink/40 pb-[var(--keyboard-inset,0px)]"
      // 어두운 바깥 영역을 누르면 닫는다.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="요약 범위"
        className="flex max-h-[88dvh] w-full animate-dialog-in flex-col rounded-t-3xl bg-white pt-6 [&_button]:outline-none"
      >
        {/* 화면이 낮으면 제목·카드·도트 영역만 스크롤하고, 확인 버튼은 아래에 고정한다. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-5">
            <h2 className="text-lg font-bold text-midnight-ink">요약 범위</h2>
            <div
              role="tablist"
              className="mt-4 flex w-fit gap-1 rounded-full bg-[#eef2f6] p-1"
            >
              {SUMMARY_SCOPE.map((item, index) => (
                <button
                  key={item.service}
                  type="button"
                  role="tab"
                  aria-selected={tab === index}
                  onClick={() => {
                    setTab(index);
                    setPage(0);
                    // 탭을 바꾸면 항상 첫 카드부터 보여준다.
                    if (panels.current[index])
                      panels.current[index].scrollLeft = 0;
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
          {/* 두 탭의 목록을 같은 칸에 겹쳐 두고 보이지 않는 쪽도 높이를 차지하게 한다.
            가장 내용이 긴 카드 기준으로 모든 카드와 시트 높이가 같아져, 내용이 잘리거나 탭을 바꿀 때 높이가 달라지지 않는다. */}
          <div className="grid">
            {SUMMARY_SCOPE.map((group, groupIndex) => {
              const active = groupIndex === tab;
              return (
                <div
                  key={group.service}
                  ref={(element) => {
                    panels.current[groupIndex] = element;
                  }}
                  role="tabpanel"
                  aria-hidden={!active}
                  inert={!active}
                  onScroll={(event) => {
                    if (!active) return;
                    const list = event.currentTarget;
                    const card =
                      list.firstElementChild?.getBoundingClientRect().width ??
                      1;
                    setPage(Math.round(list.scrollLeft / (card + 12)));
                  }}
                  // 카드 폭을 %가 아닌 cqw(패널 폭 기준)로 정해, 높이 계산 때도 실제 카드 폭으로 줄바꿈이 계산되게 한다.
                  className={`no-scrollbar col-start-1 row-start-1 flex snap-x [container-type:inline-size] snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-8 pt-6 ${
                    active ? "" : "invisible"
                  }`}
                >
                  {group.items.map((item, index) => (
                    <div
                      key={item.title}
                      className="flex w-[calc((100cqw-2.5rem)*0.84)] shrink-0 snap-start flex-col"
                    >
                      {/* 제목 영역 높이를 두 줄로 고정해, 가로로 넘겨도 이미지 위치가 같게 한다. */}
                      <div className="flex min-h-12 items-center gap-2">
                        <p className="min-w-0 break-keep text-base font-semibold leading-6 tracking-[-0.5px] text-midnight-ink [overflow-wrap:anywhere]">
                          {index + 1}. {item.title}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 ${
                            item.ok
                              ? "bg-[#e6f8ea] text-[#1f9d55]"
                              : "bg-[#fdecec] text-danger"
                          }`}
                        >
                          {item.ok ? "가능" : "불가능"}
                        </span>
                      </div>
                      <div className="mt-1.5 grow rounded-2xl bg-white shadow-[0_6px_24px_rgba(21,25,36,0.10)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image}
                          alt=""
                          className="aspect-[564/308] w-full shrink-0 rounded-t-2xl object-cover"
                          draggable={false}
                        />
                        <div className="px-4 py-4">
                          <p className="break-keep [overflow-wrap:anywhere] text-sm leading-[22px] text-midnight-ink">
                            {item.text}
                          </p>
                          {"tip" in item ? (
                            // Tip. 뒤의 본문 첫 글자가 같은 세로선에 오도록 라벨과 본문을 나눈다.
                            <p className="mt-2 flex gap-1 text-[13px] leading-5 text-[#1CC98A]">
                              <span className="shrink-0">Tip.</span>
                              <span className="break-keep [overflow-wrap:anywhere]">
                                {item.tip.replace(/^Tip\.\s*/, "")}
                              </span>
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="-mt-2 flex justify-center gap-1.5" aria-hidden>
            {scope.items.map((item, index) => (
              <span
                key={item.title}
                className={`size-1.5 rounded-full ${page === index ? "bg-midnight-ink" : "bg-mist"}`}
              />
            ))}
          </div>
        </div>
        <div className="px-5 pb-4 pt-4">
          <Button variant="primary" className={`w-full ${POPUP_BUTTON_TEXT}`} onClick={onConfirm ?? onClose}>
            확인
          </Button>
        </div>
      </div>
    </div>,
    frame,
  );
}
