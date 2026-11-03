"use client";

import { finishOnboardingExit, useOnboardingExiting } from "@/lib/onboarding";
import { OnboardingContent } from "./screens/OnboardingScreen";

/** 시작하기를 누른 직후, 시작 화면 모양의 잔상이 홈 위에서 서서히 사라진다. */
export function OnboardingExit() {
  const exiting = useOnboardingExiting();
  if (!exiting) return null;
  return (
    <div
      aria-hidden
      onAnimationEnd={finishOnboardingExit}
      className="pointer-events-none absolute inset-0 z-50 flex flex-col bg-white animate-fade-out"
    >
      <OnboardingContent />
    </div>
  );
}
