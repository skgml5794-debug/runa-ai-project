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
 * 데스크톱에서는 가운데 최대 430px 모바일 프레임(프레임 안에서 화면별 스크롤),
 * 모바일에서는 화면 전체를 쓰고 문서가 스크롤된다.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);

  return (
    // 모바일은 문서 자체가 스크롤되어야 Safari 툴바가 스크롤에 맞춰 줄어든다.
    // 데스크톱(431px 이상)은 가운데 고정 크기 프레임 안에서 화면별로 스크롤한다.
    <div className="flex min-h-dvh justify-center bg-fog min-[431px]:h-dvh min-[431px]:items-center">
      <div
        ref={setFrame}
        className="relative flex min-h-dvh w-full max-w-[430px] flex-col bg-white min-[431px]:h-[min(100dvh,880px)] min-[431px]:min-h-0 min-[431px]:overflow-hidden min-[431px]:rounded-[2rem]"
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
