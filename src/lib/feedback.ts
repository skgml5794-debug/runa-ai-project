import { useSyncExternalStore } from "react";

/**
 * 피드백 팝업 노출 기록. 제출(submitted)했을 때만 다시 보여주지 않는다.
 * 보여줬지만 제출하지 않은 경우(shown·dismissed)는 다음 노트 저장 성공 때 다시 보여준다.
 * 노트·킵박스 데이터(keepnote:v1:*)와 별개의 키를 쓴다.
 */
export const FEEDBACK_KEY = "keepnote:feedback";

export type FeedbackState = "shown" | "submitted" | "dismissed";

export interface FeedbackPayload {
  submissionId: string;
  rating: number;
  mostUseful: string | null;
  painPoints: string[];
  comment: string;
}

// localStorage를 못 쓰는 환경에서도 같은 방문 중에는 반복해서 보여주지 않는다.
let memoryState: FeedbackState | null = null;
let pending = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function readState(): string | null {
  try {
    const stored = window.localStorage.getItem(FEEDBACK_KEY);
    if (stored) return stored;
  } catch {
    // 저장소를 쓸 수 없으면 메모리 값만 쓴다.
  }
  return memoryState;
}

function writeState(state: FeedbackState): void {
  memoryState = state;
  try {
    window.localStorage.setItem(FEEDBACK_KEY, state);
  } catch {
    // 저장소를 쓸 수 없으면 이번 방문에서만 반복을 막는다.
  }
}

/**
 * 노트 저장이 성공한 직후 호출한다. 기록이 없거나(최초) 아직 제출하지 않았다면(shown·dismissed)
 * 팝업을 띄우고 shown을 기록한다. 이미 제출했거나 팝업이 열려 있으면 띄우지 않는다.
 */
export function queueFeedbackPrompt(): boolean {
  if (readState() === "submitted" || pending) return false;
  writeState("shown");
  pending = true;
  notify();
  return true;
}

/** 제출이 성공한 순간 기록한다. 완료 화면은 그대로 둔다. */
export function recordFeedbackSubmitted(): void {
  writeState("submitted");
}

/** 팝업을 닫고 결과를 기록한다. */
export function resolveFeedbackPrompt(outcome: "submitted" | "dismissed"): void {
  writeState(outcome);
  pending = false;
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useFeedbackPromptOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => pending,
    () => false,
  );
}

/** /api/feedback으로 보낸다. 같은 submissionId로 다시 보내도 서버가 한 번만 저장한다. */
export async function submitFeedback(payload: FeedbackPayload): Promise<boolean> {
  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        submissionId: payload.submissionId,
        rating: payload.rating,
        mostUseful: payload.mostUseful,
        painPoints: payload.painPoints,
        comment: payload.comment,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
