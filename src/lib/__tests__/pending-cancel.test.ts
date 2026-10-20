import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_AGE_MS,
  MAX_ATTEMPTS,
  MAX_RECORDS,
  addPendingCancel,
  flushPendingCancels,
  isRecovered,
  removePendingCancel,
  type Destinations,
  type PendingCancel,
  type Sender,
  type Store,
} from "../pending-cancel";

const KEY = "keepnote:pendingLoadingCancel";

function memoryStore(): Store & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

function input(id: string, leftAt = Date.now()) {
  return {
    id,
    linkType: "instagram",
    reason: "page_closed" as const,
    startedAt: leftAt - 2_000,
    leftAt,
    sessionId: "s1",
  };
}

function stored(store: ReturnType<typeof memoryStore>): PendingCancel[] {
  return JSON.parse(store.data.get(KEY) ?? "[]");
}

const ok: Destinations = { mixpanel: true, amplitude: true };

let store: ReturnType<typeof memoryStore>;
beforeEach(() => {
  store = memoryStore();
});

describe("addPendingCancel / removePendingCancel", () => {
  it("기록을 저장하고, 같은 id는 중복해서 쌓지 않는다", () => {
    expect(addPendingCancel(input("a"), store)).toBe(true);
    addPendingCancel(input("a"), store);
    expect(stored(store)).toHaveLength(1);
    expect(isRecovered("a")).toBe(false);
    expect(isRecovered("from-earlier-visit")).toBe(true);
  });

  it("저장소를 쓸 수 없으면 false를 돌려준다", () => {
    expect(addPendingCancel(input("a"), null)).toBe(false);
    const broken: Store = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {},
    };
    expect(addPendingCancel(input("b"), broken)).toBe(false);
  });

  it("개수 한도를 넘으면 오래된 기록부터 버린다", () => {
    for (let i = 0; i < MAX_RECORDS + 2; i++) addPendingCancel(input(`r${i}`), store);
    const ids = stored(store).map((record) => record.id);
    expect(ids).toHaveLength(MAX_RECORDS);
    expect(ids[0]).toBe("r2");
  });

  it("요약이 뒤늦게 끝난 시도의 기록은 지운다", () => {
    addPendingCancel(input("a"), store);
    addPendingCancel(input("b"), store);
    removePendingCancel("a", store);
    expect(stored(store).map((record) => record.id)).toEqual(["b"]);
    removePendingCancel("none", store);
    expect(stored(store)).toHaveLength(1);
  });
});

describe("flushPendingCancels", () => {
  it("양쪽 모두 성공하면 기록을 지운다", async () => {
    addPendingCancel(input("a"), store);
    const sent: string[] = [];
    const send: Sender = async (record) => {
      sent.push(record.id);
      return ok;
    };
    await flushPendingCancels(send, { store });
    expect(sent).toEqual(["a"]);
    expect(store.data.has(KEY)).toBe(false);
  });

  it("전송 성공을 확인하지 못한 쪽은 기록을 남기고 다음에 그쪽만 다시 보낸다", async () => {
    addPendingCancel(input("a"), store);
    await flushPendingCancels(async () => ({ mixpanel: true, amplitude: false }), { store });
    expect(stored(store)).toMatchObject([{ id: "a", mixpanelDone: true, amplitudeDone: false, attempts: 1 }]);

    const todos: Destinations[] = [];
    await flushPendingCancels(
      async (_record, todo) => {
        todos.push(todo);
        return { mixpanel: false, amplitude: true };
      },
      { store },
    );
    expect(todos).toEqual([{ mixpanel: false, amplitude: true }]);
    expect(store.data.has(KEY)).toBe(false);
  });

  it("전송 함수가 예외를 던져도 기록을 지우지 않는다", async () => {
    addPendingCancel(input("a"), store);
    await flushPendingCancels(async () => {
      throw new Error("network");
    }, { store });
    expect(stored(store)).toMatchObject([{ id: "a", attempts: 1, mixpanelDone: false, amplitudeDone: false }]);
  });

  it("이미 완료된 기록은 다시 보내지 않는다", async () => {
    addPendingCancel(input("a"), store);
    await flushPendingCancels(async () => ({ mixpanel: true, amplitude: false }), { store });
    await flushPendingCancels(async () => ({ mixpanel: true, amplitude: true }), { store });
    let called = 0;
    await flushPendingCancels(async () => {
      called += 1;
      return ok;
    }, { store });
    expect(called).toBe(0);
  });

  it("재시도 한도를 넘기면 기록을 버린다", async () => {
    addPendingCancel(input("a"), store);
    const fail: Sender = async () => ({ mixpanel: false, amplitude: false });
    for (let i = 0; i < MAX_ATTEMPTS; i++) await flushPendingCancels(fail, { store });
    expect(store.data.has(KEY)).toBe(false);
  });

  it("보관 기간이 지난 기록은 보내지 않고 버린다", async () => {
    addPendingCancel(input("old", 1_000), store);
    let called = 0;
    await flushPendingCancels(
      async () => {
        called += 1;
        return ok;
      },
      { store, now: 1_000 + MAX_AGE_MS + 1 },
    );
    expect(called).toBe(0);
    expect(store.data.has(KEY)).toBe(false);
  });

  it("동시에 두 번 불러도 한 번만 보낸다", async () => {
    addPendingCancel(input("a"), store);
    let called = 0;
    const send: Sender = async () => {
      called += 1;
      await Promise.resolve();
      return ok;
    };
    await Promise.all([flushPendingCancels(send, { store }), flushPendingCancels(send, { store })]);
    expect(called).toBe(1);
  });

  it("깨진 저장 내용은 무시한다", async () => {
    store.setItem(KEY, "{not json");
    let called = 0;
    await flushPendingCancels(async () => {
      called += 1;
      return ok;
    }, { store });
    expect(called).toBe(0);
    store.setItem(KEY, JSON.stringify([{ id: 1 }, null]));
    await flushPendingCancels(async () => ok, { store });
    expect(called).toBe(0);
  });
});
