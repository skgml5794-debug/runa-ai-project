import "server-only";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const hits = new Map<string, number[]>();

/**
 * 같은 사용자가 1분에 10번까지만 요약할 수 있게 한다.
 * 서버 메모리에만 저장하므로 재시작하면 초기화된다. (임시 보호 장치)
 */
export function allowRequest(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 1_000) {
    for (const [other, times] of hits) {
      if (times.every((time) => now - time >= WINDOW_MS)) hits.delete(other);
    }
  }
  return true;
}

export function resetRateLimit(): void {
  hits.clear();
}
