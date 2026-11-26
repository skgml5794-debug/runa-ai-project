import { useSyncExternalStore } from "react";
import { trackBoth } from "./analytics";

/** 시작하기를 눌러 시작 화면을 마쳤는지 localStorage에 기억한다. 마친 사람에게는 다시 보여주지 않는다. */
const KEY = "keepnote:onboarded";
/** Onboarding Started를 이미 보냈는지. 시작 화면에서 이탈한 뒤 다시 와도 Started는 한 번만 보낸다. */
const STARTED_KEY = "keepnote:onboarding-started";
const NOTES_KEY = "keepnote:v1:notes";
const CATEGORIES_KEY = "keepnote:v1:categories";

const listeners = new Set<() => void>();

// localStorage를 못 쓰는 환경에서 같은 방문 중 온보딩이 반복되지 않게 한다.
let memoryDone = false;
let memoryStarted = false;
// 시작하기를 눌렀고 Started가 기록된 경우에만 true. 홈이 마운트되면 Completed를 보내고 내린다.
let completionPending = false;

function read(): boolean {
  try {
    const storage = window.localStorage;
    if (storage.getItem(KEY) === "1") return true;
    // 이미 저장한 데이터가 있으면 이전에 사용한 사람으로 본다.
    return storage.getItem(NOTES_KEY) !== null || storage.getItem(CATEGORIES_KEY) !== null;
  } catch {
    return false;
  }
}

/** 이 기기에서 시작 화면을 이미 마쳤거나 이전에 사용한 적이 있는지 (렌더 밖에서 바로 읽는다) */
export function isOnboarded(): boolean {
  return read() || memoryDone;
}

function startedRecorded(): boolean {
  if (memoryStarted) return true;
  try {
    return window.localStorage.getItem(STARTED_KEY) === "1";
  } catch {
    return false;
  }
}

/** 신규 사용자에게 시작 화면이 처음 보일 때 한 번만 보낸다. 기록을 먼저 남겨 중복 호출(StrictMode 등)을 막는다. */
export function trackOnboardingStarted(): void {
  if (isOnboarded() || startedRecorded()) return;
  memoryStarted = true;
  try {
    window.localStorage.setItem(STARTED_KEY, "1");
  } catch {
    // 저장소를 쓸 수 없으면 이번 방문에서만 중복을 막는다.
  }
  trackBoth("Onboarding Started");
}

/** 홈이 마운트됐을 때 부른다. 시작하기를 누른 신규 사용자(Started 기록 있음)에게 한 번만 보낸다. */
export function trackOnboardingCompleted(): void {
  if (!completionPending) return;
  completionPending = false;
  trackBoth("Onboarding Completed");
}

/**
 * 홈 진입을 기록하는 장치. 홈 화면 하나당 하나를 만들어 쓴다.
 * 온보딩을 마친 상태(true)일 때만 보내고, 같은 화면에서는 한 번만 보낸다.
 * 신규 사용자가 시작 화면으로 넘어가는 중(null·false)에는 보내지 않는다.
 */
export function createHomeViewedReporter(): (onboarded: boolean | null) => void {
  let sent = false;
  return (onboarded) => {
    if (onboarded !== true || sent) return;
    sent = true;
    trackBoth("Home Viewed");
  };
}

/** 시작하기를 눌렀을 때 부른다. 이탈한 사람은 여기까지 오지 않아 다음 방문에 시작 화면을 다시 본다. */
export function completeOnboarding(): void {
  // 이미 마친 사람이나 Started가 없는 사람은 보내지 않는다. 연속 클릭으로 취소되지 않게 true로만 바꾼다.
  if (!isOnboarded() && startedRecorded()) completionPending = true;
  memoryDone = true;
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    // 저장소를 쓸 수 없으면 이번 방문에서만 건너뛴다.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** 서버 렌더링·하이드레이션 중에는 null(알 수 없음), 이후 true/false */
export function useOnboarded(): boolean | null {
  return useSyncExternalStore(
    subscribe,
    isOnboarded,
    () => null,
  );
}

// 시작하기에서 홈으로 넘어가는 동안: 홈은 서서히 나타나고, 시작 화면의 잔상은 서서히 사라진다.
let arrivedFromOnboarding = false;
let exiting = false;
const exitListeners = new Set<() => void>();

function notifyExit() {
  exitListeners.forEach((listener) => listener());
}

export function startOnboardingExit(): void {
  arrivedFromOnboarding = true;
  exiting = true;
  notifyExit();
}

export function finishOnboardingExit(): void {
  exiting = false;
  notifyExit();
}

export function consumeArrivalFromOnboarding(): boolean {
  const value = arrivedFromOnboarding;
  arrivedFromOnboarding = false;
  return value;
}

export function useOnboardingExiting(): boolean {
  return useSyncExternalStore(
    (listener) => {
      exitListeners.add(listener);
      return () => exitListeners.delete(listener);
    },
    () => exiting,
    () => false,
  );
}
