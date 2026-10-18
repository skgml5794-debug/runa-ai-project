import { useSyncExternalStore } from "react";

/** 온보딩을 끝냈는지 localStorage에 기억한다. 한 번 보면 다시 보여주지 않는다. */
const KEY = "keepnote:onboarded";

const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function completeOnboarding(): void {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    // 저장소를 쓸 수 없으면 이번 방문에서만 건너뛴다.
    memoryDone = true;
  }
  listeners.forEach((listener) => listener());
}

// localStorage를 못 쓰는 환경에서 같은 방문 중 온보딩이 반복되지 않게 한다.
let memoryDone = false;

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
