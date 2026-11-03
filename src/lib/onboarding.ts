import { useSyncExternalStore } from "react";

/** 첫 방문 여부를 localStorage에 기억한다. 한 번이라도 열렸다면 다시 보여주지 않는다. */
const KEY = "keepnote:onboarded";
const NOTES_KEY = "keepnote:v1:notes";
const CATEGORIES_KEY = "keepnote:v1:categories";

const listeners = new Set<() => void>();

// localStorage를 못 쓰는 환경에서 같은 방문 중 온보딩이 반복되지 않게 한다.
let memoryDone = false;

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

export function completeOnboarding(): void {
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
    () => read() || memoryDone,
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
