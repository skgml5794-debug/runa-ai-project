"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { TOAST_DURATION_MS } from "@/lib/constants";
import { useFrameElement } from "../AppFrame";

interface ToastContextValue {
  show(message: string): void;
  /** 표시 중인 토스트를 바로 닫는다. (화면을 벗어날 때 사용) */
  dismiss(): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const frame = useFrameElement();
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null,
  );
  const timer = useRef<number | undefined>(undefined);
  const counter = useRef(0);

  const show = useCallback((message: string) => {
    window.clearTimeout(timer.current);
    counter.current += 1;
    setToast({ id: counter.current, message });
    timer.current = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {frame && toast
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-4 bottom-24 min-[431px]:absolute z-40 flex justify-center pb-[env(safe-area-inset-bottom)]">
              <div
                key={toast.id}
                role="status"
                className="animate-toast-in rounded-xl bg-midnight-ink px-4 py-3 text-sm font-medium text-white"
              >
                {toast.message}
              </div>
            </div>,
            frame,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
