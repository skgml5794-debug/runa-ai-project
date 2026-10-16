"use client";

import { useEffect, useEffectEvent, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFrameElement } from "../AppFrame";
import { Button } from "./Button";

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
    panel.current?.querySelector<HTMLElement>("button")?.focus();

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
  return createPortal(
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-midnight-ink/40 px-6">
      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-label="알림"
        className="w-full animate-dialog-in rounded-3xl bg-white p-6"
      >
        <p className="whitespace-pre-line px-6 text-center text-base leading-relaxed text-midnight-ink">
          {message}
        </p>
        <div className="mt-6 flex gap-3">{children}</div>
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
      <Button variant="soft" size="sm" className="flex-1" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button variant="primary" size="sm" className="flex-1" onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </DialogShell>
  );
}

interface AlertDialogProps {
  message: ReactNode;
  confirmLabel?: string;
  onConfirm(): void;
}

export function AlertDialog({
  message,
  confirmLabel = "확인",
  onConfirm,
}: AlertDialogProps) {
  return (
    <DialogShell message={message} onEscape={onConfirm}>
      <Button variant="primary" size="sm" className="flex-1" onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </DialogShell>
  );
}
