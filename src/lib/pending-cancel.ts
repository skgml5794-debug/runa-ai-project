/**
 * 요약 생성 중 화면을 떠난 기록을 브라우저 저장소(localStorage)에 임시로 둔다.
 * 탭을 닫을 때는 이벤트가 전송되기 전에 페이지가 사라질 수 있어서, 기록을 남겨 두었다가
 * 다음 방문(또는 곧바로)에 보낸다.
 *
 * - 전송 성공을 확인할 수 있는 곳(Amplitude)은 성공이 확인돼야 완료로 보고, 그 전에는 기록을 지우지 않는다.
 * - Mixpanel은 성공 여부를 알 수 없으므로 SDK의 저장 대기열에 넘긴 것을 완료로 본다.
 * - 같은 기록을 다시 보내더라도 서버가 걸러내도록 기록 id를 중복 제거 키로 쓴다.
 * - 끝없이 쌓이지 않도록 재시도 횟수·보관 기간·개수에 한도를 둔다.
 */
export type CancelReason = "navigated_away" | "page_closed";

export interface PendingCancel {
  /** 요약 시도 하나당 하나. 전송할 때 중복 제거 키로도 쓴다. */
  id: string;
  linkType: string;
  reason: CancelReason;
  /** 요약 요청을 시작한 시각(ms) */
  startedAt: number;
  /** 화면을 떠난 시각(ms). 이벤트 발생 시각으로 쓴다. */
  leftAt: number;
  sessionId: string;
  mixpanelDone: boolean;
  amplitudeDone: boolean;
  /** 보내 본 횟수 */
  attempts: number;
}

export interface Destinations {
  mixpanel: boolean;
  amplitude: boolean;
}

/** todo가 true인 곳으로만 보내고, 이번에 완료된 곳을 true로 돌려준다. */
export type Sender = (record: PendingCancel, todo: Destinations) => Promise<Destinations>;

export type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const KEY = "keepnote:pendingLoadingCancel";
export const MAX_RECORDS = 5;
export const MAX_ATTEMPTS = 5;
export const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** 이번 페이지 로드에서 만든 기록. 여기에 없으면 이전 방문에서 복구한 기록이다. */
const createdThisLoad = new Set<string>();

export function isRecovered(id: string): boolean {
  return !createdThisLoad.has(id);
}

function defaultStore(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is PendingCancel {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.linkType === "string" &&
    (record.reason === "navigated_away" || record.reason === "page_closed") &&
    typeof record.startedAt === "number" &&
    typeof record.leftAt === "number" &&
    typeof record.sessionId === "string" &&
    typeof record.mixpanelDone === "boolean" &&
    typeof record.amplitudeDone === "boolean" &&
    typeof record.attempts === "number"
  );
}

function read(store: Store): PendingCancel[] {
  try {
    const raw = store.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isRecord) : [];
  } catch {
    return [];
  }
}

function write(store: Store, records: PendingCancel[]): boolean {
  try {
    if (records.length === 0) store.removeItem(KEY);
    else store.setItem(KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

/** 기록을 남긴다. 저장소를 쓸 수 없으면 false. (호출한 쪽에서 바로 보내야 한다) */
export function addPendingCancel(
  input: Omit<PendingCancel, "mixpanelDone" | "amplitudeDone" | "attempts">,
  store: Store | null = defaultStore(),
): boolean {
  if (!store) return false;
  const others = read(store).filter((record) => record.id !== input.id);
  const next = [
    ...others,
    { ...input, mixpanelDone: false, amplitudeDone: false, attempts: 0 },
  ].slice(-MAX_RECORDS);
  const saved = write(store, next);
  if (saved) createdThisLoad.add(input.id);
  return saved;
}

/** 요약이 성공·실패로 끝난 시도의 기록을 지운다. (페이지 복원 뒤 뒤늦게 끝난 경우 등) */
export function removePendingCancel(id: string, store: Store | null = defaultStore()): void {
  if (!store) return;
  const records = read(store);
  if (records.some((record) => record.id === id)) {
    write(store, records.filter((record) => record.id !== id));
  }
}

let flushing: Promise<void> | null = null;

/** 아직 완료되지 않은 기록을 보낸다. 동시에 여러 번 불러도 한 번만 실행한다. */
export function flushPendingCancels(
  send: Sender,
  options: { now?: number; store?: Store | null } = {},
): Promise<void> {
  if (flushing) return flushing;
  const run = flush(send, options.now ?? Date.now(), options.store ?? defaultStore());
  flushing = run.finally(() => {
    flushing = null;
  });
  return flushing;
}

async function flush(send: Sender, now: number, store: Store | null): Promise<void> {
  if (!store) return;

  const results = new Map<string, Destinations>();
  for (const record of read(store)) {
    if (now - record.leftAt > MAX_AGE_MS) continue; // 오래된 기록은 보내지 않고 아래에서 정리한다.
    const todo = { mixpanel: !record.mixpanelDone, amplitude: !record.amplitudeDone };
    if (!todo.mixpanel && !todo.amplitude) continue;
    try {
      results.set(record.id, await send(record, todo));
    } catch {
      results.set(record.id, { mixpanel: false, amplitude: false });
    }
  }

  // 보내는 동안 다른 탭이 바꿨을 수 있으므로 다시 읽어서 결과를 합친다.
  const remaining: PendingCancel[] = [];
  for (const record of read(store)) {
    const result = results.get(record.id);
    const updated = result
      ? {
          ...record,
          mixpanelDone: record.mixpanelDone || result.mixpanel,
          amplitudeDone: record.amplitudeDone || result.amplitude,
          attempts: record.attempts + 1,
        }
      : record;
    const done = updated.mixpanelDone && updated.amplitudeDone;
    const expired = now - updated.leftAt > MAX_AGE_MS || updated.attempts >= MAX_ATTEMPTS;
    if (!done && !expired) remaining.push(updated);
  }
  write(store, remaining);
}
