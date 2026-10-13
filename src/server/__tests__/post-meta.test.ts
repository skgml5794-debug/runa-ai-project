import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { buildPostMeta, extractMeta, fetchPostMeta, validateTarget } = await import("../post-meta");
const { FetchFailedError, InsufficientContentError } = await import("../errors");

const TARGET = { url: "https://www.instagram.com/p/AbC123/", source: "Instagram" as const };
const LONG = "성수동에 새로 생긴 카페를 다녀왔어요. 디저트가 정말 맛있었어요";

function html(description: string, extra = "") {
  return `<html><head>
    <meta property="og:title" content="Kim on Instagram: &quot;카페&quot;">
    <meta content="${description}" property="og:description">
    <meta property="og:image" content="https://cdn.example.com/a.jpg?x=1&amp;y=2">${extra}
  </head></html>`;
}

describe("validateTarget", () => {
  it("https Instagram/Threads 링크만 허용한다", () => {
    expect(validateTarget("https://www.instagram.com/p/AbC123/")).not.toBeNull();
    expect(validateTarget("http://www.instagram.com/p/AbC123/")).toBeNull();
    expect(validateTarget("https://evil.com/p/abc")).toBeNull();
    expect(validateTarget("https://instagram.com.evil.com/p/abc")).toBeNull();
    expect(validateTarget("https://localhost/p/abc")).toBeNull();
  });
});

describe("extractMeta", () => {
  it("속성 순서와 상관없이 읽고 HTML 엔티티를 풀어준다", () => {
    const meta = extractMeta(html("설명 &amp; 내용"));
    expect(meta["og:description"]).toBe("설명 & 내용");
    expect(meta["og:title"]).toBe('Kim on Instagram: "카페"');
    expect(meta["og:image"]).toBe("https://cdn.example.com/a.jpg?x=1&y=2");
  });
});

describe("buildPostMeta", () => {
  it("본문, 썸네일, 작성자를 만든다", () => {
    const meta = buildPostMeta(TARGET, html(LONG));
    expect(meta.text).toBe(LONG);
    expect(meta.thumbnailUrl).toBe("https://cdn.example.com/a.jpg?x=1&y=2");
    // 주소에 아이디가 없으면 제목의 "아이디 on Instagram" 형태에서 읽는다.
    expect(meta.authorId).toBe("Kim");
  });

  it("주소에 아이디가 있으면 주소를 우선하고, 어디서도 못 읽으면 비워 둔다", () => {
    expect(
      buildPostMeta({ url: "https://www.instagram.com/real_id/p/AbC/", source: "Instagram" }, html(LONG)).authorId,
    ).toBe("real_id");
    const withCanonical = html(LONG, '<meta property="og:url" content="https://www.instagram.com/shop_owner/p/AbC123/">');
    expect(buildPostMeta(TARGET, withCanonical).authorId).toBe("shop_owner");
    const noAuthor = html(LONG).replace("Kim on Instagram: &quot;카페&quot;", "성수동 카페 후기");
    expect(buildPostMeta(TARGET, noAuthor).authorId).toBe("");
    const fromDesc = html("12 likes, 3 comments - cafe_lover on October 3, 2026: 성수동에 새로 생긴 카페를 다녀왔어요").replace("Kim on Instagram: &quot;카페&quot;", "성수동 카페 후기");
    expect(buildPostMeta(TARGET, fromDesc).authorId).toBe("cafe_lover");
  });

  it("작성자는 Threads 경로의 @아이디에서 가져온다", () => {
    const meta = buildPostMeta(
      { url: "https://www.threads.net/@keeper/post/xyz", source: "Threads" },
      html(LONG),
    );
    expect(meta.authorId).toBe("keeper");
  });

  it("본문이 비어도 제목에 정보가 있으면 모델이 판단하도록 넘긴다", () => {
    const partial = html("").replace("Kim on Instagram: &quot;카페&quot;", "Kim on Instagram: &quot;성수동 신상 카페 후기&quot;");
    const meta = buildPostMeta(TARGET, partial);
    expect(meta.text).toBe("");
    expect(meta.title).toContain("성수동 신상 카페 후기");
  });

  it("제목과 본문이 모두 비었거나 로그인 안내뿐이면 정보 부족이다", () => {
    expect(() => buildPostMeta(TARGET, "<html></html>")).toThrow(InsufficientContentError);
    expect(() =>
      buildPostMeta(TARGET, '<meta property="og:title" content="Instagram">'),
    ).toThrow(InsufficientContentError);
    expect(() =>
      buildPostMeta(TARGET, '<meta property="og:title" content="로그인 • Instagram">'),
    ).toThrow(InsufficientContentError);
  });

  it("https가 아닌 썸네일은 버린다", () => {
    const meta = buildPostMeta(
      TARGET,
      html(LONG).replace("https://cdn.example.com", "http://cdn.example.com"),
    );
    expect(meta.thumbnailUrl).toBeNull();
  });
});

describe("fetchPostMeta", () => {
  const ok = (body: string) => new Response(body, { status: 200 });

  it("허용된 도메인 안의 리다이렉트는 따라간다", async () => {
    const fake = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: "https://www.instagram.com/p/Next/" } }),
      )
      .mockResolvedValueOnce(ok(html(LONG)));
    const meta = await fetchPostMeta(TARGET.url, fake as unknown as typeof fetch);
    expect(meta.text).toBe(LONG);
    expect(fake).toHaveBeenCalledTimes(2);
  });

  it("다른 도메인으로의 리다이렉트는 거부한다", async () => {
    const fake = vi.fn().mockResolvedValue(
      new Response(null, { status: 302, headers: { location: "https://evil.com/x" } }),
    );
    await expect(fetchPostMeta(TARGET.url, fake as unknown as typeof fetch)).rejects.toThrow(FetchFailedError);
    expect(fake).toHaveBeenCalledTimes(1);
  });

  it("허용되지 않은 주소는 요청을 보내지 않는다", async () => {
    const fake = vi.fn();
    await expect(fetchPostMeta("https://evil.com/p/a", fake as unknown as typeof fetch)).rejects.toThrow();
    expect(fake).not.toHaveBeenCalled();
  });

  it("로그인 화면으로 보내면 수집 실패다", async () => {
    const fake = vi.fn().mockResolvedValue(
      new Response(null, { status: 302, headers: { location: "https://www.instagram.com/accounts/login/" } }),
    );
    await expect(fetchPostMeta(TARGET.url, fake as unknown as typeof fetch)).rejects.toThrow(FetchFailedError);
  });

  it("오류 응답과 네트워크 오류는 정보 부족이 아니라 수집 실패다", async () => {
    const notFound = vi.fn().mockResolvedValue(new Response("", { status: 404 }));
    await expect(fetchPostMeta(TARGET.url, notFound as unknown as typeof fetch)).rejects.toThrow(FetchFailedError);
    const down = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    await expect(fetchPostMeta(TARGET.url, down as unknown as typeof fetch)).rejects.toThrow(FetchFailedError);
  });

  it("페이지는 받았지만 글이 없으면 정보 부족이다", async () => {
    const empty = vi.fn().mockResolvedValue(new Response("<html></html>", { status: 200 }));
    await expect(fetchPostMeta(TARGET.url, empty as unknown as typeof fetch)).rejects.toThrow(InsufficientContentError);
  });
});
