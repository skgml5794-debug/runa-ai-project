import { describe, expect, it } from "vitest";
import { extractAuthorId, parseLink } from "../link";

describe("parseLink", () => {
  it("Instagram 게시물 링크를 인식한다", () => {
    expect(parseLink("https://www.instagram.com/p/AbC123/")).toMatchObject({
      source: "Instagram",
    });
  });

  it("Threads 링크(threads.net, threads.com)를 인식한다", () => {
    expect(parseLink("https://www.threads.net/@user/post/abc")?.source).toBe("Threads");
    expect(parseLink("https://www.threads.com/@user/post/abc")?.source).toBe("Threads");
  });

  it("프로토콜이 없으면 https를 붙인다", () => {
    expect(parseLink("instagram.com/reel/xyz")?.url).toBe("https://instagram.com/reel/xyz");
  });

  it("앞뒤 공백을 무시한다", () => {
    expect(parseLink("  https://instagram.com/p/a/  ")).not.toBeNull();
  });

  it.each([
    "",
    "   ",
    "hello world",
    "https://example.com/p/abc",
    "https://notinstagram.com/p/abc",
    "https://instagram.com.evil.com/p/abc",
    "https://instagram.com/",
    "https://instagram.com",
  ])("지원하지 않는 입력은 거부한다: %j", (input) => {
    expect(parseLink(input)).toBeNull();
  });
});

describe("extractAuthorId", () => {
  it.each([
    ["https://www.instagram.com/kim_cafe/p/AbC123/", "kim_cafe"],
    ["https://www.instagram.com/kim.cafe/reel/XyZ/?igsh=abc", "kim.cafe"],
    ["https://instagram.com/_u/kim_cafe/", "kim_cafe"],
    ["https://www.instagram.com/stories/kim_cafe/3012345/", "kim_cafe"],
    ["https://www.instagram.com/kim_cafe/", "kim_cafe"],
    ["https://www.threads.net/@keeper/post/xyz", "keeper"],
    ["https://www.threads.com/@Keeper.One/post/xyz?xmt=a", "Keeper.One"],
  ])("%s → %s", (url, expected) => {
    expect(extractAuthorId(url)).toBe(expected);
  });

  it("주소에 아이디가 없는 형태는 추측하지 않고 빈 값이다", () => {
    expect(extractAuthorId("https://www.instagram.com/p/AbC123/")).toBe("");
    expect(extractAuthorId("https://www.instagram.com/reel/AbC123/?utm_source=ig_web_copy_link")).toBe("");
    expect(extractAuthorId("https://www.instagram.com/share/p/BAbc/")).toBe("");
    expect(extractAuthorId("https://www.instagram.com/stories/highlights/123/")).toBe("");
    expect(extractAuthorId("not a url")).toBe("");
  });
});
