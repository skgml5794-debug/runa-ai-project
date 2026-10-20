"use client";

import * as amplitude from "@amplitude/analytics-browser";
import mixpanel from "mixpanel-browser";
import {
  flushPendingCancels,
  isRecovered,
  type Destinations,
  type PendingCancel,
} from "./pending-cancel";
import type { Source } from "./types";

/**
 * Mixpanel 이벤트 추적. 토큰(NEXT_PUBLIC_MIXPANEL_TOKEN)이 없으면 아무것도 하지 않는다.
 * 링크 주소, 제목, 요약 내용은 보내지 않는다.
 */
const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

type Props = Record<string, string | number | boolean>;

let initialized = false;

/** 앱 시작 시 한 번만 초기화한다. 실패해도 앱 동작에는 영향이 없다. */
export function initAnalytics(): boolean {
  if (typeof window === "undefined" || !TOKEN) return false;
  if (!initialized) {
    try {
      mixpanel.init(TOKEN, {
        autocapture: false,
        track_pageview: false,
        persistence: "localStorage",
        // 주소에는 검색어(q)가 들어갈 수 있으므로 전체 주소·이전 주소는 자동 속성으로 보내지 않는다.
        property_blacklist: [
          "$current_url",
          "$referrer",
          "$referring_domain",
          "$initial_referrer",
          "$initial_referring_domain",
        ],
      });
      initialized = true;
    } catch {
      return false;
    }
  }
  return true;
}

const SESSION_ID_KEY = "keepnote:analytics-session";
let memorySessionId: string | null = null;

/** 탭(세션) 단위로 유지되는 클라이언트 생성 식별자 */
export function sessionId(): string {
  try {
    const saved = sessionStorage.getItem(SESSION_ID_KEY);
    if (saved) return saved;
    const created = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, created);
    return created;
  } catch {
    memorySessionId ??= `s-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    return memorySessionId;
  }
}

/** 모든 이벤트에 session_id를 붙여 보낸다. */
export function track(event: string, properties: Props = {}) {
  if (!initAnalytics()) return;
  try {
    mixpanel.track(event, { ...properties, session_id: sessionId() });
  } catch {
    // 추적 실패가 앱 동작에 영향을 주지 않게 한다.
  }
}

const AMPLITUDE_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

/** Mixpanel과 Amplitude 양쪽으로 보낸다. Amplitude 초기화는 AmplitudeInit이 맡는다. */
export function trackBoth(event: string, properties: Props = {}) {
  track(event, properties);
  if (typeof window === "undefined" || !AMPLITUDE_KEY) return;
  try {
    // Mixpanel과 같은 속성이 되도록 session_id도 함께 보낸다.
    amplitude.track(event, { ...properties, session_id: sessionId() });
  } catch {
    // 추적 실패가 앱 동작에 영향을 주지 않게 한다.
  }
}

const SEND_TIMEOUT_MS = 10_000;

/** 임시로 남긴 요약 취소 기록 하나를 todo가 true인 곳으로 보낸다. 기록 id를 중복 제거 키로 쓴다. */
async function sendPendingCancel(
  record: PendingCancel,
  todo: Destinations,
): Promise<Destinations> {
  const event = "summary_loading_cancelled";
  const properties = {
    link_type: record.linkType,
    cancel_reason: record.reason,
    elapsed_ms: record.leftAt - record.startedAt,
    // 이전 방문에서 남긴 기록을 다시 보내는 것이면 true
    recovered: isRecovered(record.id),
    session_id: record.sessionId,
  };

  let mixpanelDone = !todo.mixpanel;
  if (todo.mixpanel) {
    if (!TOKEN) {
      mixpanelDone = true; // 보낼 곳이 없으면 더 시도하지 않는다.
    } else if (initAnalytics()) {
      try {
        // Mixpanel은 성공 여부를 알 수 없다. SDK의 저장 대기열에 넘기면 SDK가 다시 보내 준다.
        mixpanel.track(event, {
          ...properties,
          $insert_id: record.id,
          time: record.leftAt / 1000,
        });
        mixpanelDone = true;
      } catch {
        // 다음 방문에 다시 시도한다.
      }
    }
  }

  let amplitudeDone = !todo.amplitude;
  if (todo.amplitude) {
    if (!AMPLITUDE_KEY) {
      amplitudeDone = true;
    } else {
      try {
        const sent = amplitude.track(event, properties, {
          insert_id: record.id,
          time: record.leftAt,
        }).promise;
        // 서버가 받았다는 응답(200)을 확인해야 완료로 본다.
        const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), SEND_TIMEOUT_MS));
        const result = await Promise.race([sent, timeout]);
        amplitudeDone = result?.code === 200;
      } catch {
        // 다음 방문에 다시 시도한다.
      }
    }
  }

  return { mixpanel: mixpanelDone, amplitude: amplitudeDone };
}

/** 남아 있는 요약 취소 기록을 보낸다. 앱을 열 때와 기록을 남긴 직후에 부른다. */
export function flushCancelReports(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  return flushPendingCancels(sendPendingCancel);
}

/** 초 단위, 소수점 한 자리 */
export function secondsSince(startedAt: number): number {
  return Math.round((Date.now() - startedAt) / 100) / 10;
}

export function linkType(source: Source | null | undefined): string {
  return source ? source.toLowerCase() : "unknown";
}

/** 주소 모양으로 저장 콘텐츠 종류를 구분한다. (주소 자체는 보내지 않는다) */
export function contentType(url: string, source: Source): string {
  if (source === "Threads") return "thread";
  try {
    const first = new URL(url).pathname.split("/").filter(Boolean);
    if (first.some((part) => part === "reel" || part === "reels")) return "reel";
    if (first.includes("p")) return "post";
  } catch {
    // 알 수 없는 주소
  }
  return "unknown";
}

/** 카테고리 id 목록을 문자열 하나로. 없으면 'uncategorized' */
export function categoryProp(ids: readonly string[]): string {
  return ids.length > 0 ? ids.join(",") : "uncategorized";
}

/** 킵노트 id가 들어간 주소는 화면 종류로 묶어서 보낸다. */
export function trackPageView(pathname: string) {
  const page = pathname
    .replace(/^\/notes\/[^/]+\/edit$/, "/notes/[id]/edit")
    .replace(/^\/notes\/[^/]+$/, "/notes/[id]");
  track("Page View", { page });
}

let appOpenedSent = false;

/** 앱을 처음 열었을 때(페이지 로드당 1회) */
export function trackAppOpened(pathname: string) {
  if (appOpenedSent) return;
  appOpenedSent = true;
  let referrerDomain = "";
  let source = "direct";
  try {
    if (document.referrer) referrerDomain = new URL(document.referrer).hostname;
    const utm = new URLSearchParams(window.location.search).get("utm_source");
    if (utm) source = utm;
    else if (referrerDomain && referrerDomain !== window.location.hostname) source = "referral";
  } catch {
    // 주소를 읽지 못하면 기본값 사용
  }
  track("app_opened", {
    source,
    referrer_domain: referrerDomain,
    page_url: pathname,
  });
}
