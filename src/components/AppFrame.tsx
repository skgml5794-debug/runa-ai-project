"use client";

import { Suspense, createContext, useContext, useState, type ReactNode } from "react";
import { Analytics } from "./Analytics";
import { BottomNav } from "./BottomNav";
import { ClipboardLinkPrompt } from "./ClipboardLinkPrompt";
import { FeedbackPrompt } from "./FeedbackPrompt";
import { KeyboardInset } from "./KeyboardInset";
import { OnboardingExit } from "./OnboardingExit";
import { OnboardingGate } from "./OnboardingGate";
import { KeepnoteProvider } from "./KeepnoteProvider";
import { ToastProvider } from "./ui/Toast";

const FrameContext = createContext<HTMLElement | null>(null);

/** 팝업·토스트를 그릴 앱 프레임 요소. 화면 전체가 아니라 프레임 안에 고정하기 위해 쓴다. */
export function useFrameElement(): HTMLElement | null {
  return useContext(FrameContext);
}

/**
 * 모바일(600px 미만)은 화면 전체를 쓰고 문서가 스크롤된다.
 * 태블릿(600~1023px)은 화면 크기에 맞춰 넓어지는 가운데 프레임, 데스크톱(1024px 이상)은 가운데 430px 프레임이다.
 * 프레임 안에서는 화면별로 스크롤한다.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);

  return (
    // 모바일은 문서 자체가 스크롤되어야 Safari 툴바가 스크롤에 맞춰 줄어든다.
    // 데스크톱(431px 이상)은 가운데 고정 크기 프레임 안에서 화면별로 스크롤한다.
    <div className="flex min-h-dvh justify-center bg-white framed:h-dvh framed:items-center framed:bg-fog">
      <div
        ref={setFrame}
        className="relative flex min-h-dvh w-full flex-col bg-white framed:min-h-0 framed:w-[min(calc(100%-3rem),clamp(430px,64vw,520px))] framed:h-[min(calc(100dvh-3rem),920px)] framed:overflow-hidden framed:rounded-[2rem] wide:w-full wide:max-w-[430px] wide:h-[min(100dvh,880px)] short:h-dvh short:w-[430px] short:max-w-full short:rounded-none"
      >
        <FrameContext.Provider value={frame}>
          <KeepnoteProvider>
            <ToastProvider>
              <Suspense fallback={null}>
                <OnboardingGate />
                <ClipboardLinkPrompt />
              </Suspense>
              <OnboardingExit />
              <FeedbackPrompt />
              <KeyboardInset />
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
