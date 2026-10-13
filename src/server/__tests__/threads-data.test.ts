import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { extractThreadsData, threadsShortcode } = await import("../threads-data");
const { buildPostMeta, fetchPostMeta } = await import("../post-meta");

const CODE = "Dd5-DEwETCt";
const URL_THREADS = `https://www.threads.com/@coffeelog_korea/post/${CODE}?hl=ko`;
const TARGET = { url: URL_THREADS, source: "Threads" as const };

const pinnedReply = (text: string, pinned = true) => ({
  code: "Dd5-FwqEdB6",
  user: { username: "coffeelog_korea" },
  caption: { text },
  text_post_app_info: { pinned_post_info: { is_pinned_to_parent_post: pinned, is_pinned_to_profile: false } },
});

/** 실제 Threads 페이지의 데이터 구조(media → text_post_app_info → pinned_replies)를 본뜬 데이터 */
function pageData({
  postText = "서울 | 가을이 도망가기 전에 앉아봐야 할 테라스 카페",
  replies = [pinnedReply("📍 주소 정리해둘게요\n\nⅠ. 오에세 ose\n서울 마포구 성미산로16길 3-3 1층")],
}: { postText?: string; replies?: unknown[] } = {}) {
  const media = {
    code: CODE,
    user: { username: "coffeelog_korea" },
    caption: { text: postText },
    text_post_app_info: {
      pinned_post_info: { is_pinned_to_parent_post: false, is_pinned_to_profile: false },
      pinned_replies: {
        edges: replies.map((node) => ({ node: { posts: { edges: [{ node }] } } })),
      },
    },
  };
  const related = {
    code: "Other123",
    caption: { text: "관련 스레드 글" },
    text_post_app_info: { pinned_post_info: { is_pinned_to_parent_post: true } },
  };
  return { result: { data: { media, relatedPosts: { threads: [{ thread_items: [{ post: related }] }] } } } };
}

function html(data: unknown, extraMeta = "") {
  const json = JSON.stringify(data).replace(/[\u0080-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
  return `<html><head>
    <meta property="og:title" content="Threads의 뚜슭랭(@coffeelog_korea)님">
    <meta property="og:description" content="서울 | 가을이 도망가기 전에 앉아봐야 할 테라스 카페">${extraMeta}
    <script type="application/json" data-sjs>${json}</script></head></html>`;
}

describe("threadsShortcode", () => {
  it("주소에서 게시물 코드를 읽는다", () => {
    expect(threadsShortcode(URL_THREADS)).toBe(CODE);
    expect(threadsShortcode("https://www.threads.net/@a/post/Abc_1-x")).toBe("Abc_1-x");
    expect(threadsShortcode("https://www.threads.com/@a")).toBe("");
  });
});

describe("extractThreadsData", () => {
  it("본문과 작성자가 고정한 댓글을 읽는다", () => {
    const data = extractThreadsData(html(pageData()), CODE);
    expect(data.found).toBe(true);
    expect(data.text).toBe("서울 | 가을이 도망가기 전에 앉아봐야 할 테라스 카페");
    expect(data.pinnedComment).toContain("📍 주소 정리해둘게요");
    expect(data.pinnedComment).toContain("Ⅰ. 오에세 ose");
    expect(data.pinnedComment).toContain("\n");
  });

  it("고정 표시가 없는 댓글은 고정 댓글로 추측하지 않는다", () => {
    const data = extractThreadsData(html(pageData({ replies: [pinnedReply("그냥 댓글", false)] })), CODE);
    expect(data.found).toBe(true);
    expect(data.pinnedComment).toBe("");
  });

  it("고정 댓글이 없으면 본문만 돌려준다", () => {
    const data = extractThreadsData(html(pageData({ replies: [] })), CODE);
    expect(data).toMatchObject({ found: true, pinnedComment: "" });
  });

  it("관련 스레드(다른 게시물)의 고정 표시는 가져오지 않는다", () => {
    expect(extractThreadsData(html(pageData({ replies: [] })), CODE).pinnedComment).not.toContain("관련 스레드");
  });

  it("데이터가 없거나 깨져 있으면 빈 값이다", () => {
    expect(extractThreadsData("<html></html>", CODE)).toEqual({ text: "", pinnedComment: "", found: false });
    const broken = `<script type="application/json" data-sjs>{"caption": ${CODE} broken</script>`;
    expect(extractThreadsData(broken, CODE).found).toBe(false);
  });
});

describe("Threads 수집 (buildPostMeta / fetchPostMeta)", () => {
  it("본문과 고정 댓글을 함께 담고, Instagram용 필드는 건드리지 않는다", () => {
    const meta = buildPostMeta(TARGET, html(pageData()));
    expect(meta.authorId).toBe("coffeelog_korea");
    expect(meta.pinnedComment).toContain("오에세 ose");
    expect(meta.text).toContain("테라스 카페");
    // "Threads의 OOO(@아이디)님" 형태의 제목은 내용이 아니므로 요약 입력에 넣지 않는다.
    expect(meta.title).toBe("");
  });

  it("고정 댓글을 읽지 못해도 og 본문만으로 진행한다", () => {
    const meta = buildPostMeta(TARGET, html({}));
    expect(meta.pinnedComment).toBe("");
    expect(meta.text).toBe("서울 | 가을이 도망가기 전에 앉아봐야 할 테라스 카페");
  });

  it("Threads만 페이지 이동 요청 표시를 붙이고, Instagram 요청은 그대로다", async () => {
    const ok = () => new Response(html(pageData()), { status: 200 });
    const threads = vi.fn().mockImplementation(async () => ok());
    await fetchPostMeta(URL_THREADS, threads as unknown as typeof fetch);
    expect(threads.mock.calls[0][1].headers).toMatchObject({ "sec-fetch-mode": "navigate", "sec-fetch-dest": "document" });
    expect(threads.mock.calls[0][1].headers["user-agent"]).toBe("Keepnote/0.1 (link preview)");

    const instagram = vi.fn().mockImplementation(async () => new Response(html({}).replace("Threads의", "Kim on Instagram: 카페"), { status: 200 }));
    await fetchPostMeta("https://www.instagram.com/p/AbC123/", instagram as unknown as typeof fetch);
    expect(instagram.mock.calls[0][1].headers["sec-fetch-mode"]).toBeUndefined();
  });
});
