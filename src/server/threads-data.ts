import "server-only";

/** Threads 게시물 페이지에 들어 있는 구조화 데이터에서 읽은 값 */
export interface ThreadsData {
  /** 게시물 본문 전체. 게시물 데이터를 찾지 못하면 빈 문자열 */
  text: string;
  /** 작성자가 고정한 댓글. 고정 댓글이 없거나 확인하지 못하면 빈 문자열 */
  pinnedComment: string;
  /** 게시물 데이터를 찾았는지. false면 페이지에 본문 데이터가 없는 것(로그인·차단 등) */
  found: boolean;
}

const MAX_DEPTH = 40;
const MAX_PINNED = 3;

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function captionText(node: Json): string {
  const caption = node.caption;
  if (!isObject(caption) || typeof caption.text !== "string") return "";
  return caption.text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function isPinnedToParent(node: Json): boolean {
  const info = node.text_post_app_info;
  if (!isObject(info) || !isObject(info.pinned_post_info)) return false;
  return info.pinned_post_info.is_pinned_to_parent_post === true;
}

/**
 * 페이지 안의 JSON 데이터(`<script type="application/json" data-sjs>`)를 훑는다.
 * - 본문: `code`가 이 게시물의 주소 코드와 같은 게시물 객체의 caption
 * - 고정 댓글: `pinned_replies` 아래에서 `is_pinned_to_parent_post`가 true로 표시된 댓글만.
 *   표시가 없으면 고정 댓글로 추측하지 않는다.
 */
export function extractThreadsData(html: string, shortcode: string): ThreadsData {
  let text = "";
  let found = false;
  const pinned: string[] = [];

  const visit = (value: unknown, depth: number, underPinned: boolean) => {
    if (depth > MAX_DEPTH) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1, underPinned);
      return;
    }
    if (!isObject(value)) return;

    const caption = captionText(value);
    if (caption) {
      if (!found && value.code === shortcode && !isPinnedToParent(value)) {
        text = caption;
        found = true;
      } else if (underPinned && isPinnedToParent(value) && value.code !== shortcode) {
        if (pinned.length < MAX_PINNED && !pinned.includes(caption)) pinned.push(caption);
      }
    }
    for (const [key, child] of Object.entries(value)) {
      visit(child, depth + 1, underPinned || key === "pinned_replies");
    }
  };

  const scripts = html.matchAll(
    /<script type="application\/json"[^>]*data-sjs[^>]*>([\s\S]*?)<\/script>/g,
  );
  for (const [, body] of scripts) {
    // 요청한 게시물이나 고정 댓글이 들어 있을 수 있는 데이터만 해석한다.
    if (!body.includes('"caption"')) continue;
    if (!body.includes(shortcode) && !body.includes('"pinned_replies"')) continue;
    try {
      visit(JSON.parse(body), 0, false);
    } catch {
      // 해석할 수 없는 조각은 건너뛴다.
    }
  }

  return { text, pinnedComment: pinned.join("\n\n"), found };
}

/** 주소에서 게시물 코드(`/post/코드`)를 읽는다. */
export function threadsShortcode(url: string): string {
  const match = /\/post\/([A-Za-z0-9_-]+)/.exec(new URL(url).pathname);
  return match?.[1] ?? "";
}
