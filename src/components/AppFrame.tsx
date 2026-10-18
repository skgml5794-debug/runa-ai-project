"use client";

import { Suspense, createContext, useContext, useState, type ReactNode } from "react";
import { Analytics } from "./Analytics";
import { BottomNav } from "./BottomNav";
import { KeepnoteProvider } from "./KeepnoteProvider";
import { ToastProvider } from "./ui/Toast";

const FrameContext = createContext<HTMLElement | null>(null);

/** 팝업·토스트를 그릴 앱 프레임 요소. 화면 전체가 아니라 프레임 안에 고정하기 위해 쓴다. */
export function useFrameElement(): HTMLElement | null {
  return useContext(FrameContext);
}

/**
 * 데스크톱에서는 가운데 최대 430px 모바일 프레임, 모바일에서는 화면 전체를 쓴다.
 * 프레임 안에서 화면 하나가 세로 스크롤을 직접 관리한다.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);

  return (
    <div className="flex h-dvh items-center justify-center bg-fog">
      <div
        ref={setFrame}
        className="relative flex h-dvh w-full max-w-[430px] min-[431px]:h-[min(100dvh,880px)] flex-col overflow-hidden bg-white min-[431px]:rounded-[2rem]"
      >
        <FrameContext.Provider value={frame}>
          <KeepnoteProvider>
            <ToastProvider>
              <main className="flex min-h-0 flex-1 flex-col">{children}</main>
              <Suspense fallback={null}>
                <Analytics />
                <BottomNav />
              </Suspense>
            </ToastProvider>
          </KeepnoteProvider>
        </FrameContext.Provider>
      </div>
    </div>
  );
}
