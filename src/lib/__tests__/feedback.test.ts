import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function stubStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    },
  });
  return data;
}

async function load() {
  vi.resetModules();
  return import("../feedback");
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe("피드백 노출 규칙", () => {
  it("기록이 없으면 첫 저장 성공 때 한 번 노출하고 바로 기록한다", async () => {
    const data = stubStorage();
    const feedback = await load();
    expect(feedback.queueFeedbackPrompt()).toBe(true);
    expect(data.get(feedback.FEEDBACK_KEY)).toBe("shown");
  });

  it("팝업이 열려 있는 동안 다시 저장해도 중복으로 띄우지 않는다", async () => {
    stubStorage();
    const feedback = await load();
    expect(feedback.queueFeedbackPrompt()).toBe(true);
    expect(feedback.queueFeedbackPrompt()).toBe(false);
  });

  it("나중에(닫기)를 선택하면 dismissed를 기록하고 다음 저장 성공 때 다시 노출한다", async () => {
    const data = stubStorage();
    const feedback = await load();
    feedback.queueFeedbackPrompt();
    feedback.resolveFeedbackPrompt("dismissed");
    expect(data.get(feedback.FEEDBACK_KEY)).toBe("dismissed");
    expect(feedback.queueFeedbackPrompt()).toBe(true);
    expect(data.get(feedback.FEEDBACK_KEY)).toBe("shown");
  });

  it("여러 번 닫아도 제출 전까지는 계속 다시 노출한다", async () => {
    stubStorage();
    const feedback = await load();
    for (let i = 0; i < 3; i += 1) {
      expect(feedback.queueFeedbackPrompt()).toBe(true);
      feedback.resolveFeedbackPrompt("dismissed");
    }
  });

  it("제출을 완료하면 submitted를 기록하고 영구적으로 다시 노출하지 않는다", async () => {
    const data = stubStorage();
    const feedback = await load();
    feedback.queueFeedbackPrompt();
    feedback.recordFeedbackSubmitted();
    expect(data.get(feedback.FEEDBACK_KEY)).toBe("submitted");
    feedback.resolveFeedbackPrompt("submitted");
    expect(feedback.queueFeedbackPrompt()).toBe(false);
  });

  it("제출에 실패해 닫은 경우는 제출 완료로 치지 않아 다시 노출한다", async () => {
    const data = stubStorage();
    const feedback = await load();
    feedback.queueFeedbackPrompt();
    // 제출 실패 시에는 recordFeedbackSubmitted가 불리지 않고, 닫으면 dismissed가 된다.
    feedback.resolveFeedbackPrompt("dismissed");
    expect(data.get(feedback.FEEDBACK_KEY)).not.toBe("submitted");
    expect(feedback.queueFeedbackPrompt()).toBe(true);
  });

  it("기존 노트가 있어도 노출 기록이 없으면 한 번 노출한다", async () => {
    const data = stubStorage({ "keepnote:v1:notes": "[{}]" });
    const feedback = await load();
    expect(feedback.queueFeedbackPrompt()).toBe(true);
    expect(data.get("keepnote:v1:notes")).toBe("[{}]");
  });

  it("제출 기록(submitted)이 있는 브라우저(새로고침 후)에서는 노출하지 않는다", async () => {
    stubStorage({ "keepnote:feedback": "submitted" });
    const feedback = await load();
    expect(feedback.queueFeedbackPrompt()).toBe(false);
  });

  it("보여주기만 하고 제출하지 않은 기록(shown, dismissed)은 새로고침 후에도 다시 노출한다", async () => {
    for (const state of ["shown", "dismissed"]) {
      stubStorage({ "keepnote:feedback": state });
      const feedback = await load();
      expect(feedback.queueFeedbackPrompt()).toBe(true);
    }
  });

  it("localStorage를 못 쓰면 같은 방문 중에는 메모리 기록으로 제출 여부를 지킨다", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    const feedback = await load();
    expect(feedback.queueFeedbackPrompt()).toBe(true);
    feedback.recordFeedbackSubmitted();
    feedback.resolveFeedbackPrompt("submitted");
    expect(feedback.queueFeedbackPrompt()).toBe(false);
  });
});

describe("submitFeedback", () => {
  const payload = {
    submissionId: "3f2b8c1e-4d5a-4e6f-8a9b-0c1d2e3f4a5b",
    rating: 4,
    mostUseful: "summary",
    painPoints: ["slow"],
    comment: "좋아요",
  };

  it("/api/feedback으로 POST하고 성공 여부를 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const { submitFeedback } = await load();
    expect(await submitFeedback(payload)).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/feedback");
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it("서버 오류나 네트워크 오류는 false", async () => {
    const { submitFeedback } = await load();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await submitFeedback(payload)).toBe(false);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await submitFeedback(payload)).toBe(false);
  });
});
