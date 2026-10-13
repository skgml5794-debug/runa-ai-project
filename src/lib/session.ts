import { useSyncExternalStore } from "react";
import type { SummaryResult } from "./types";

/** 새로고침해도 유지해야 하는 임시 상태를 sessionStorage에 보관한다. */
export const SESSION_KEYS = {
  /** 홈 링크 입력창 값. 오류 후에도 유지한다. */
  homeLink: "keepnote:homeLink",
  /** 로딩 화면이 요약할 링크 */
  pendingUrl: "keepnote:pendingUrl",
  /** 저장 전 새 요약 결과 */
  draft: "keepnote:draft",
  /** 킵노트 화면의 마지막 검색·정렬·카테고리 상태 (쿼리 문자열) */
  notesQuery: "keepnote:notesQuery",
} as const;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getSession(key: string): string {
  try {
    return window.sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function setSession(key: string, value: string): void {
  try {
    if (value) window.sessionStorage.setItem(key, value);
    else window.sessionStorage.removeItem(key);
  } catch {
    // 저장소를 쓸 수 없는 환경에서는 메모리 상태 없이 동작한다.
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** 서버 렌더링과 하이드레이션 중에는 빈 문자열, 이후에는 sessionStorage 값을 돌려준다. */
export function useSessionValue(key: string): string {
  return useSyncExternalStore(
    subscribe,
    () => getSession(key),
    () => "",
  );
}

/** 하이드레이션이 끝난 뒤 true */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export interface Draft {
  result: SummaryResult;
  /** 요약 완료 토스트를 아직 보여주지 않았으면 true */
  showToast: boolean;
}

export function parseDraft(raw: string): Draft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Draft;
    if (!parsed?.result?.title || !Array.isArray(parsed.result.summaryLines)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeDraft(draft: Draft): void {
  setSession(SESSION_KEYS.draft, JSON.stringify(draft));
}

export function clearDraftSession(): void {
  setSession(SESSION_KEYS.draft, "");
  setSession(SESSION_KEYS.pendingUrl, "");
  setSession(SESSION_KEYS.homeLink, "");
}
