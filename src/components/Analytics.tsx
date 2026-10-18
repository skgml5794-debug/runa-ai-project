"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { initAnalytics, trackAppOpened, trackPageView } from "@/lib/analytics";

// 개발 모드(StrictMode)에서 효과가 두 번 실행돼도 같은 화면을 연달아 기록하지 않는다.
let lastTracked: string | null = null;

/** 화면 이동마다 페이지뷰를 보낸다. */
export function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    if (lastTracked === pathname) return;
    lastTracked = pathname;
    initAnalytics();
    trackAppOpened(pathname);
    trackPageView(pathname);
  }, [pathname]);
  return null;
}
