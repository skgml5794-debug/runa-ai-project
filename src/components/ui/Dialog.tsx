"use client";

import { useEffect, useEffectEvent, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFrameElement } from "../AppFrame";
import { Button, POPUP_BUTTON_TEXT } from "./Button";

/** 팝업 버튼의 높이와 모서리. 팝업마다 같은 크기로 보이게 한다. */
const POPUP_BUTTON_SHAPE = "min-h-14 rounded-2xl";
/** 팝업의 보조 버튼(취소, 요약범위 확인 등): 옅은 테두리의 라인형 */
const POPUP_SUB_BUTTON = "border border-[#e5e9ef] bg-white text-graphite";

interface DialogShellProps {
  message: ReactNode;
  /** ESC를 눌렀을 때 실행한다. 확인 전용 팝업은 확인, 선택 팝업은 취소와 같다. */
  onEscape(): void;
  children: ReactNode;
}

/** 앱 프레임 안에 뜨는 팝업. 열릴 때 첫 버튼에 포커스를 주고 포커스가 팝업 밖으로 나가지 않게 한다. */
function DialogShell({ message, onEscape, children }: DialogShellProps) {
  const frame = useFrameElement();
  const panel = useRef<HTMLDivElement>(null);
  const handleEscape = useEffectEvent(onEscape);

  useEffect(() => {
    if (!frame) return;
    const previous = document.activeElement as HTMLElement | null;
    // 확인 버튼(data-autofocus)이 있으면 그것에, 없으면 첫 버튼에 포커스를 준다.
    (
      panel.current?.querySelector<HTMLElement>("[data-autofocus]") ??
      panel.current?.querySelector<HTMLElement>("button")
    )?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleEscape();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>("button");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [frame]);

  if (!frame) return null;
  // 문구의 첫 줄이 제목(끝의 마침표는 뺀다), 나머지가 설명이다. 한 줄이면 제목만 보여준다.
  const [title, description] =
    typeof message === "string"
      ? [message.split("\n")[0].replace(/\.$/, ""), message.split("\n").slice(1).join("\n")]
      : [message, ""];
  return createPortal(
    <div className="fixed inset-0 z-50 flex framed:absolute items-center justify-center bg-midnight-ink/40 px-6">
      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-label="알림"
        className="w-full animate-dialog-in rounded-[26px] bg-white px-6 py-[33.6px] [&_button]:outline-none"
      >
        {/* 제목(20px 굵게)과 설명(16px)을 가운데 정렬한다. 한 줄짜리 문구는 제목이 아니라 설명과 같은 크기·굵기로 보여준다. */}
        {description ? (
          <>
            <p className="whitespace-pre-line text-center text-xl font-bold leading-[1.4] tracking-[-0.02em] text-midnight-ink">
              {title}
            </p>
            <p className="mt-2.5 whitespace-pre-line text-center text-base leading-6 text-slate">
              {description}
            </p>
          </>
        ) : (
          <p className="whitespace-pre-line text-center text-base leading-6 text-midnight-ink">{title}</p>
        )}
        {/* 버튼이 여러 개면 같은 너비의 칸으로 나눈다. */}
        <div className="mt-7 grid auto-cols-[minmax(0,1fr)] grid-flow-col gap-3">{children}</div>
      </div>
    </div>,
    frame,
  );
}

interface ConfirmDialogProps {
  message: ReactNode;
  cancelLabel?: string;
  confirmLabel: string;
  onCancel(): void;
  onConfirm(): void;
}

export function ConfirmDialog({
  message,
  cancelLabel = "취소",
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <DialogShell message={message} onEscape={onCancel}>
      <button
        type="button"
        className={`${POPUP_SUB_BUTTON} ${POPUP_BUTTON_TEXT} ${POPUP_BUTTON_SHAPE}`}
        onClick={onCancel}
      >
        {cancelLabel}
      </button>
      <Button variant="primary" size="sm" className={`${POPUP_BUTTON_TEXT} ${POPUP_BUTTON_SHAPE}`} onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </DialogShell>
  );
}

interface AlertDialogProps {
  message: ReactNode;
  confirmLabel?: string;
  /** 메시지 아래에 보이는 보조 버튼 */
  secondary?: { label: string; onClick(): void };
  onConfirm(): void;
}

export function AlertDialog({
  message,
  confirmLabel = "확인",
  secondary,
  onConfirm,
}: AlertDialogProps) {
  return (
    <DialogShell message={message} onEscape={onConfirm}>
      {/* 보조 버튼은 확인 버튼 왼쪽에 같은 크기로 두고, 요약 완료 화면의 '내용 추가'처럼 라인으로 보여준다. */}
      {secondary ? (
        <button
          type="button"
          onClick={secondary.onClick}
          className={`${POPUP_SUB_BUTTON} ${POPUP_BUTTON_TEXT} ${POPUP_BUTTON_SHAPE}`}
        >
          {secondary.label}
        </button>
      ) : null}
      <Button
        variant="primary"
        size="sm"
        className={`${POPUP_BUTTON_TEXT} ${POPUP_BUTTON_SHAPE}`}
        data-autofocus
        onClick={onConfirm}
      >
        {confirmLabel}
      </Button>
    </DialogShell>
  );
}
