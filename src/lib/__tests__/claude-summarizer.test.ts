import { afterEach, describe, expect, it, vi } from "vitest";
import { ClaudeLinkSummarizer, SummarizeError } from "../summarizer/claude";

const RESULT = {
  url: "https://www.instagram.com/p/a/",
  source: "Instagram",
  authorId: "kim",
  thumbnailUrl: null,
  title: "제목",
  summaryLines: ["가", "나", "다"],
  keyInfo: [],
  originalText: "본문",
};

afterEach(() => vi.unstubAllGlobals());

describe("ClaudeLinkSummarizer", () => {
  it("서버 API를 호출해 결과를 돌려준다", async () => {
    const fake = vi.fn().mockResolvedValue(Response.json(RESULT));
    vi.stubGlobal("fetch", fake);
    await expect(new ClaudeLinkSummarizer().summarize(RESULT.url)).resolves.toEqual(RESULT);
    expect(fake.mock.calls[0][0]).toBe("/api/summarize");
    expect(JSON.parse(fake.mock.calls[0][1].body)).toEqual({ url: RESULT.url });
  });

  it("서버가 실패하면 mock으로 대체하지 않고 에러를 던진다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "no_content" }, { status: 422 })));
    await expect(new ClaudeLinkSummarizer().summarize(RESULT.url)).rejects.toThrow();
  });

  it("정보 부족(422)과 그 외 실패를 구분해 알려준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "insufficient_content" }, { status: 422 })));
    await expect(new ClaudeLinkSummarizer().summarize(RESULT.url)).rejects.toMatchObject({ kind: "insufficient" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "fetch_failed" }, { status: 502 })));
    const error = await new ClaudeLinkSummarizer().summarize(RESULT.url).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SummarizeError);
    expect(error).toMatchObject({ kind: "failed" });
  });

  it("형식이 맞지 않는 응답은 거부한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ title: "x" })));
    await expect(new ClaudeLinkSummarizer().summarize(RESULT.url)).rejects.toThrow();
  });
});
