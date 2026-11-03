import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { buildLinkPreview, fetchLinkPreview } = await import("../link-preview");
const { FetchFailedError } = await import("../errors");

const URL_ = "https://www.instagram.com/p/AbC123/";

function page(head: string) {
  return new Response(`<html><head>${head}</head></html>`, { status: 200 });
}

describe("buildLinkPreview", () => {
  it("og:title과 link rel=icon을 우선 사용한다", () => {
    const preview = buildLinkPreview(
      URL_,
      '<title>무시</title><meta property="og:title" content="카페 &amp; 디저트"><link rel="shortcut icon" href="/static/icon.png">',
    );
    expect(preview.title).toBe("카페 & 디저트");
    expect(preview.faviconUrl).toBe("https://www.instagram.com/static/icon.png");
  });

  it("og:title이 없으면 <title>, 아이콘이 없으면 /favicon.ico를 쓴다", () => {
    const preview = buildLinkPreview(URL_, "<title> 제목\n입니다 </title>");
    expect(preview.title).toBe("제목 입니다");
    expect(preview.faviconUrl).toBe("https://www.instagram.com/favicon.ico");
  });

  it("https가 아닌 아이콘 주소는 쓰지 않는다", () => {
    const preview = buildLinkPreview(URL_, '<link rel="icon" href="http://x.com/a.ico">');
    expect(preview.faviconUrl).toBe("https://www.instagram.com/favicon.ico");
  });
});

describe("fetchLinkPreview", () => {
  it("허용되지 않은 주소는 요청하지 않는다", async () => {
    const fetchImpl = vi.fn();
    await expect(fetchLinkPreview("https://evil.com/p/a", fetchImpl)).rejects.toBeInstanceOf(FetchFailedError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("허용되지 않은 곳으로의 리다이렉트는 따라가지 않는다", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } }),
    );
    await expect(fetchLinkPreview(URL_, fetchImpl)).rejects.toBeInstanceOf(FetchFailedError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("제목과 아이콘을 돌려준다", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(page('<meta property="og:title" content="안녕">'));
    await expect(fetchLinkPreview(URL_, fetchImpl)).resolves.toMatchObject({ title: "안녕", url: URL_ });
  });
});
