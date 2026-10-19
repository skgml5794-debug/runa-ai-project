"use client";

import * as amplitude from "@amplitude/analytics-browser";
import { useEffect } from "react";

const API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

// 개발 모드(StrictMode)에서 효과가 두 번 실행돼도 한 번만 초기화한다.
let initialized = false;

/** Amplitude를 클라이언트에서 한 번만 초기화한다. 키가 없으면 아무것도 하지 않는다. */
export function AmplitudeInit() {
  useEffect(() => {
    if (initialized || !API_KEY) return;
    initialized = true;
    amplitude.init(API_KEY, {
      autocapture: {
        pageViews: true,
        elementInteractions: true,
        formInteractions: true,
      },
    });
  }, []);
  return null;
}
