import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const fetchPostMeta = vi.fn();
const summarizeWithClaude = vi.fn();

vi.mock("../post-meta", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../post-meta")>()),
  fetchPostMeta,
}));
vi.mock("../claude-summary", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../claude-summary")>()),
  summarizeWithClaude,
}));

const { POST } = await import("../../app/api/summarize/route");
const { AiFailedError, FetchFailedError, InsufficientContentError, NotConfiguredError } =
  await import("../errors");
const { resetRateLimit } = await import("../rate-limit");

const URL_OK = "https://www.instagram.com/p/AbC123/";

function call(body: unknown, ip = "1.1.1.1") {
  return POST(
    new Request("http://localhost/api/summarize", {
      method: "POST",
      headers: { "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  resetRateLimit();
  fetchPostMeta.mockReset();
  summarizeWithClaude.mockReset();
});

describe("POST /api/summarize", () => {
  it("성공하면 요약 결과를 반환한다", async () => {
    fetchPostMeta.mockResolvedValue({ text: "본문" });
    summarizeWithClaude.mockResolvedValue({ title: "제목" });
    const response = await call({ url: URL_OK });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ title: "제목" });
  });

  it("잘못된 입력은 400이며 외부 호출을 하지 않는다", async () => {
    expect((await call("not json")).status).toBe(400);
    expect((await call({})).status).toBe(400);
    expect((await call({ url: "https://evil.com/p/a" })).status).toBe(400);
    expect((await call({ url: "http://www.instagram.com/p/a" })).status).toBe(400);
    expect(fetchPostMeta).not.toHaveBeenCalled();
    expect(summarizeWithClaude).not.toHaveBeenCalled();
  });

  it("정보 수집 실패(502)와 요약할 정보 부족(422)을 구분하고, 실패 시 Claude를 호출하지 않는다", async () => {
    fetchPostMeta.mockRejectedValueOnce(new FetchFailedError());
    const failed = await call({ url: URL_OK });
    expect(failed.status).toBe(502);
    expect(await failed.json()).toEqual({ error: "fetch_failed" });

    fetchPostMeta.mockRejectedValueOnce(new InsufficientContentError());
    const thin = await call({ url: URL_OK });
    expect(thin.status).toBe(422);
    expect(await thin.json()).toEqual({ error: "insufficient_content" });
    expect(summarizeWithClaude).not.toHaveBeenCalled();
  });

  it("모델이 정보 부족으로 판단해도 422다", async () => {
    fetchPostMeta.mockResolvedValue({});
    summarizeWithClaude.mockRejectedValue(new InsufficientContentError());
    expect((await call({ url: URL_OK })).status).toBe(422);
  });

  it("설정 오류는 503, AI 실패는 502이고 내부 메시지를 노출하지 않는다", async () => {
    fetchPostMeta.mockResolvedValue({});
    summarizeWithClaude.mockRejectedValueOnce(new NotConfiguredError("sk-ant-secret"));
    const config = await call({ url: URL_OK });
    expect(config.status).toBe(503);
    summarizeWithClaude.mockRejectedValueOnce(new AiFailedError("sk-ant-secret"));
    const ai = await call({ url: URL_OK });
    expect(ai.status).toBe(502);
    expect(JSON.stringify([await config.json(), await ai.json()])).not.toContain("sk-ant");
  });

  it("같은 사용자가 1분에 10번을 넘기면 429", async () => {
    fetchPostMeta.mockResolvedValue({});
    summarizeWithClaude.mockResolvedValue({});
    for (let i = 0; i < 10; i += 1) expect((await call({ url: URL_OK })).status).toBe(200);
    expect((await call({ url: URL_OK })).status).toBe(429);
    expect((await call({ url: URL_OK }, "2.2.2.2")).status).toBe(200);
  });
});
