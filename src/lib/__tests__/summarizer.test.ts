import { describe, expect, it } from "vitest";
import { withTimeout, TimeoutError } from "../async";
import { MockLinkSummarizer } from "../summarizer/mock";

describe("MockLinkSummarizer", () => {
  const summarizer = new MockLinkSummarizer(0);

  it("3~6줄 요약과 핵심 정보, 원문을 반환한다", async () => {
    const result = await summarizer.summarize("https://www.instagram.com/p/abc123/");
    expect(result.source).toBe("Instagram");
    expect(result.summaryLines.length).toBeGreaterThanOrEqual(3);
    expect(result.summaryLines.length).toBeLessThanOrEqual(6);
    expect(result.keyInfo.length).toBeGreaterThan(0);
    expect(result.originalText).not.toBe("");
    expect(result.title.length).toBeLessThanOrEqual(100);
  });

  it("작성자 아이디는 링크 주소에서만 읽고, 없으면 가짜 아이디를 만들지 않는다", async () => {
    expect((await summarizer.summarize("https://www.instagram.com/kim_cafe/p/abc123/")).authorId).toBe("kim_cafe");
    expect((await summarizer.summarize("https://www.threads.net/@keeper/post/abc")).authorId).toBe("keeper");
    expect((await summarizer.summarize("https://www.instagram.com/p/abc123/")).authorId).toBe("");
  });

  it("같은 링크는 같은 결과를 반환한다", async () => {
    const a = await summarizer.summarize("https://instagram.com/p/same/");
    const b = await summarizer.summarize("https://instagram.com/p/same/");
    expect(a).toEqual(b);
  });

  it("Threads 링크는 썸네일이 없다", async () => {
    const result = await summarizer.summarize("https://www.threads.net/@user/post/abc");
    expect(result.source).toBe("Threads");
    expect(result.thumbnailUrl).toBeNull();
  });

  it("링크에 fail이 들어 있으면 실패를 재현한다", async () => {
    await expect(summarizer.summarize("https://instagram.com/p/fail/")).rejects.toThrow();
  });

  it("지원하지 않는 링크는 실패한다", async () => {
    await expect(summarizer.summarize("https://example.com/p/abc")).rejects.toThrow();
  });

  it("hang이 들어 있으면 응답하지 않고 시간 초과로 처리된다", async () => {
    await expect(withTimeout(summarizer.summarize("https://instagram.com/p/hang/"), 30)).rejects.toBeInstanceOf(TimeoutError);
  });
});
