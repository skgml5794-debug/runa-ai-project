import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const insert = vi.fn();
const from = vi.fn(() => ({ insert }));
const getSupabase = vi.fn<() => { from: typeof from } | null>(() => ({ from }));

vi.mock("../supabase", () => ({ getSupabase }));

const { parseFeedback } = await import("../feedback");
const { POST } = await import("../../app/api/feedback/route");
const { resetRateLimit } = await import("../rate-limit");

const ID = "3f2b8c1e-4d5a-4e6f-8a9b-0c1d2e3f4a5b";
const OK = { submissionId: ID, rating: 4, mostUseful: "summary", painPoints: ["slow"], comment: "좋아요" };

function call(body: unknown, ip = "1.1.1.1") {
  return POST(
    new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  resetRateLimit();
  insert.mockReset();
  from.mockClear();
  getSupabase.mockReset();
  getSupabase.mockReturnValue({ from });
});

describe("parseFeedback", () => {
  it("올바른 값을 정리해 반환한다", () => {
    expect(parseFeedback({ ...OK, comment: "  좋아요  " })).toEqual(OK);
  });

  it("선택 항목은 비워도 된다", () => {
    expect(parseFeedback({ submissionId: ID, rating: 1 })).toEqual({
      submissionId: ID,
      rating: 1,
      mostUseful: null,
      painPoints: [],
      comment: null,
    });
    expect(parseFeedback({ ...OK, comment: "   " })?.comment).toBeNull();
  });

  it.each([
    ["만족도 0", { ...OK, rating: 0 }],
    ["만족도 6", { ...OK, rating: 6 }],
    ["만족도 소수", { ...OK, rating: 3.5 }],
    ["만족도 문자열", { ...OK, rating: "4" }],
    ["잘못된 submissionId", { ...OK, submissionId: "abc" }],
    ["없는 유용한 기능", { ...OK, mostUseful: "x" }],
    ["없는 불편한 점", { ...OK, painPoints: ["x"] }],
    ["중복된 불편한 점", { ...OK, painPoints: ["slow", "slow"] }],
    ["배열이 아닌 불편한 점", { ...OK, painPoints: "slow" }],
    ["1000자 초과 의견", { ...OK, comment: "가".repeat(1001) }],
    ["문자열이 아닌 의견", { ...OK, comment: 1 }],
    ["객체가 아님", "x"],
  ])("거부: %s", (_name, body) => {
    expect(parseFeedback(body)).toBeNull();
  });
});

describe("POST /api/feedback", () => {
  it("저장에 성공하면 ok를 반환하고 지정한 컬럼만 넣는다", async () => {
    insert.mockResolvedValue({ error: null });
    const response = await call(OK);
    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("feedback");
    expect(insert).toHaveBeenCalledWith({
      submission_id: ID,
      rating: 4,
      most_useful: "summary",
      pain_points: ["slow"],
      comment: "좋아요",
    });
  });

  it("추가 필드(연락처 등)는 저장하지 않는다", async () => {
    insert.mockResolvedValue({ error: null });
    await call({ ...OK, contact: "a@b.c", url: "https://x" });
    expect(Object.keys(insert.mock.calls[0][0]).sort()).toEqual(
      ["comment", "most_useful", "pain_points", "rating", "submission_id"],
    );
  });

  it("잘못된 입력은 400이고 저장하지 않는다", async () => {
    expect((await call({ ...OK, rating: 9 })).status).toBe(400);
    expect((await call("not json")).status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("같은 submission_id가 다시 오면 성공으로 처리한다", async () => {
    insert.mockResolvedValue({ error: { code: "23505" } });
    expect((await call(OK)).status).toBe(200);
  });

  it("그 밖의 저장 오류는 502", async () => {
    insert.mockResolvedValue({ error: { code: "42501" } });
    const response = await call(OK);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "save_failed" });
  });

  it("환경변수가 없으면 503 (앱의 다른 기능은 영향 없음)", async () => {
    getSupabase.mockReturnValue(null);
    const response = await call(OK);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "not_configured" });
  });

  it("같은 사용자가 1분에 10번을 넘기면 429", async () => {
    insert.mockResolvedValue({ error: null });
    for (let i = 0; i < 10; i += 1) expect((await call(OK)).status).toBe(200);
    expect((await call(OK)).status).toBe(429);
    expect((await call(OK, "2.2.2.2")).status).toBe(200);
  });
});

describe("UI 선택지와 DB 허용값", () => {
  it("화면의 모든 선택지를 서버가 받아들인다", async () => {
    const { MOST_USEFUL_OPTIONS, PAIN_POINT_OPTIONS } = await import("../../lib/feedback-options");
    for (const option of MOST_USEFUL_OPTIONS) {
      expect(parseFeedback({ submissionId: ID, rating: 3, mostUseful: option.value })).not.toBeNull();
    }
    const all = PAIN_POINT_OPTIONS.map((option) => option.value);
    expect(parseFeedback({ submissionId: ID, rating: 3, painPoints: all })).not.toBeNull();
  });
});
