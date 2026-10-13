import "server-only";
import { extractAuthorId, parseLink } from "../lib/link";
import type { Source } from "../lib/types";
import { FetchFailedError, InsufficientContentError } from "./errors";
import { extractThreadsData, threadsShortcode } from "./threads-data";

export interface PostMeta {
  url: string;
  source: Source;
  authorId: string;
  title: string;
  /** 게시물 본문(공개 og:description). 비어 있으면 요약하지 않는다. */
  text: string;
  /** Threads에서 작성자가 고정한 댓글. 없거나 확인하지 못하면 빈 문자열 */
  pinnedComment: string;
  thumbnailUrl: string | null;
}

/** 제목과 본문을 합쳐 이 길이에 못 미치면 모델에 보내지 않고 정보 부족으로 처리한다. */
export const MIN_USABLE_LENGTH = 10;
export const MAX_TEXT_LENGTH = 5_000;
const MAX_HTML_BYTES = 1_000_000;
/** Threads 페이지는 댓글 데이터가 뒤쪽에 있어 더 크게 읽는다. */
const MAX_THREADS_HTML_BYTES = 3_000_000;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 8_000;
const LOGIN_PATH = /^\/(accounts\/login|login)(\/|$)/i;

/** 서버가 가져와도 되는 주소(https + Instagram/Threads)만 통과시킨다. */
export function validateTarget(input: string): { url: string; source: Source } | null {
  const parsed = parseLink(input);
  if (!parsed) return null;
  if (new URL(parsed.url).protocol !== "https:") return null;
  return parsed;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1].toLowerCase() === "x"
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** `<meta property="og:..." content="...">`를 속성 순서와 상관없이 읽는다. */
export function extractMeta(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    const content = /content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i.exec(tag);
    const value = content?.[1] ?? content?.[2];
    if (key && value !== undefined && !(key.toLowerCase() in result)) {
      result[key.toLowerCase()] = decodeEntities(value).trim();
    }
  }
  return result;
}

/**
 * 작성자 아이디: 주소 → 대표 주소(og:url) → 제목의 `(@아이디)`·`아이디 on Instagram` → 설명의 `- 아이디 on 날짜` 순서로 찾는다.
 * 어디서도 확실히 읽지 못하면 빈 문자열이다. (추측하지 않음)
 */
function authorFrom(url: string, title: string, text: string, canonicalUrl = ""): string {
  // 입력 주소에 아이디가 없어도 게시물의 대표 주소(og:url)에 들어 있는 경우가 있다.
  const fromUrl = extractAuthorId(url) || (canonicalUrl ? extractAuthorId(canonicalUrl) : "");
  if (fromUrl) return fromUrl;
  const candidates = [
    /\(@([A-Za-z0-9._]{1,30})\)/.exec(title)?.[1],
    /^([A-Za-z0-9._]{1,30}) on (?:Instagram|Threads)\b/i.exec(title)?.[1],
    /\s-\s([A-Za-z0-9._]{1,30}) on [A-Z][a-z]+ \d/.exec(text)?.[1],
  ];
  return candidates.find((value) => value) ?? "";
}

/** 로그인 안내 등 게시물 내용이 아닌 제목은 정보로 보지 않는다. */
function isBoilerplate(text: string): boolean {
  return /^(instagram|threads|threads의 .+님|log ?in|로그인|.*(로그인|log in).*(instagram|threads|인스타그램|스레드).*)$/i.test(text.trim());
}

/**
 * HTML에서 PostMeta를 만든다. 본문이 짧아도 제목에 정보가 있으면 모델이 판단하도록 넘기고,
 * 쓸 만한 글이 전혀 없으면 InsufficientContentError.
 */
export function buildPostMeta(
  target: { url: string; source: Source },
  html: string,
): PostMeta {
  const meta = extractMeta(html);
  const rawTitle = meta["og:title"] ?? "";
  const title = isBoilerplate(rawTitle) ? "" : rawTitle;
  let text = (meta["og:description"] ?? "").replace(/\s+/g, " ").trim();
  let pinnedComment = "";
  if (target.source === "Threads") {
    // 페이지 안의 구조화 데이터에 전체 본문과 고정 댓글이 있으면 우선 사용한다.
    const data = extractThreadsData(html, threadsShortcode(target.url));
    if (data.text) text = data.text;
    pinnedComment = data.pinnedComment;
  }
  if ((title + text + pinnedComment).trim().length < MIN_USABLE_LENGTH) {
    throw new InsufficientContentError();
  }

  const image = meta["og:image"];
  const thumbnailUrl = image?.startsWith("https://") ? image : null;
  return {
    url: target.url,
    source: target.source,
    authorId: authorFrom(target.url, rawTitle, text, meta["og:url"]),
    title,
    text: text.slice(0, MAX_TEXT_LENGTH),
    pinnedComment: pinnedComment.slice(0, MAX_TEXT_LENGTH),
    thumbnailUrl,
  };
}

async function readLimited(response: Response, limit: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    text += decoder.decode(value, { stream: true });
    if (received >= limit) {
      await reader.cancel();
      break;
    }
  }
  return text;
}

/**
 * 요청 헤더. Threads는 페이지 이동(navigation) 요청일 때만 본문·댓글 데이터를 함께 내려주므로
 * 그 표시를 붙인다. 로그인 정보나 쿠키는 쓰지 않고, 공개된 내용만 읽는다.
 */
function requestHeaders(source: Source): Record<string, string> {
  const base = {
    "user-agent": "Keepnote/0.1 (link preview)",
    accept: "text/html,application/xhtml+xml",
    "accept-language": "ko,en;q=0.8",
  };
  if (source !== "Threads") return base;
  return {
    ...base,
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
  };
}

/**
 * 공개 게시물 페이지의 메타데이터를 가져온다.
 * 리다이렉트는 최대 3번까지, 매번 허용된 도메인인지 다시 확인한다.
 */
export async function fetchPostMeta(
  input: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PostMeta> {
  const target = validateTarget(input);
  if (!target) throw new FetchFailedError("지원하지 않는 링크입니다.");

  let current = target.url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let response: Response;
    try {
      response = await fetchImpl(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: requestHeaders(target.source),
      });
    } catch {
      throw new FetchFailedError("게시물 요청에 실패했습니다.");
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      const next = location ? validateTarget(new URL(location, current).toString()) : null;
      // 허용되지 않은 곳이나 로그인 화면으로 보내면 공개 게시물을 읽을 수 없는 것이다.
      if (!next || LOGIN_PATH.test(new URL(next.url).pathname)) {
        throw new FetchFailedError("공개 게시물이 아니거나 접근이 제한되었습니다.");
      }
      current = next.url;
      continue;
    }
    if (!response.ok) throw new FetchFailedError(`게시물 응답 오류 (${response.status})`);
    let html: string;
    try {
      html = await readLimited(
        response,
        target.source === "Threads" ? MAX_THREADS_HTML_BYTES : MAX_HTML_BYTES,
      );
    } catch {
      throw new FetchFailedError("게시물 응답을 읽지 못했습니다.");
    }
    return buildPostMeta({ url: target.url, source: target.source }, html);
  }
  throw new FetchFailedError("이동이 너무 많습니다.");
}
