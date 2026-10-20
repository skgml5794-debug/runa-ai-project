"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { flushCancelReports, initAnalytics, trackAppOpened, trackPageView } from "@/lib/analytics";

// 개발 모드(StrictMode)에서 효과가 두 번 실행돼도 같은 화면을 연달아 기록하지 않는다.
let lastTracked: string | null = null;
// 이전 방문에서 남은 요약 취소 기록은 페이지를 열 때 한 번만 보낸다.
let recoveryStarted = false;

/** 화면 이동마다 페이지뷰를 보낸다. */
export function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    if (lastTracked === pathname) return;
    lastTracked = pathname;
    initAnalytics();
    if (!recoveryStarted) {
      recoveryStarted = true;
      void flushCancelReports();
    }
    trackAppOpened(pathname);
    trackPageView(pathname);
  }, [pathname]);
  return null;
}
