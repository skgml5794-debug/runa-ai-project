import "server-only";
import { FetchFailedError } from "./errors";
import { decodeEntities, extractMeta, readLimited, validateTarget } from "./post-meta";

export interface LinkPreview {
  url: string;
  title: string;
  /** 사이트 아이콘 주소(https). 찾지 못하면 null */
  faviconUrl: string | null;
}

/** 제목과 아이콘은 문서 앞부분(head)에 있으므로 조금만 읽는다. */
const MAX_HTML_BYTES = 300_000;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 5_000;
const MAX_TITLE_LENGTH = 200;

function findIcon(html: string, base: string): string | null {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = /rel\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!rel || !href || !/(^|\s)(shortcut\s+)?icon(\s|$)/i.test(rel)) continue;
    try {
      const resolved = new URL(decodeEntities(href), base);
      if (resolved.protocol === "https:") return resolved.toString();
    } catch {
      // 잘못된 주소는 건너뛴다.
    }
  }
  return null;
}

/** HTML에서 제목(Open Graph → <title>)과 아이콘(<link rel=icon> → /favicon.ico)을 읽는다. */
export function buildLinkPreview(url: string, html: string): LinkPreview {
  const meta = extractMeta(html);
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "";
  const title = (meta["og:title"] || decodeEntities(titleTag))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TITLE_LENGTH);
  return {
    url,
    title,
    faviconUrl: findIcon(html, url) ?? new URL("/favicon.ico", url).toString(),
  };
}

/**
 * 링크의 제목·아이콘을 서버에서 가져온다. (브라우저에서 직접 가져오면 CORS로 막힌다)
 * 임의의 주소로 서버가 요청하지 않도록 요약과 같은 허용 도메인(https)만 읽고,
 * 리다이렉트도 매번 같은 기준으로 다시 확인한다.
 */
export async function fetchLinkPreview(
  input: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LinkPreview> {
  const target = validateTarget(input);
  if (!target) throw new FetchFailedError("지원하지 않는 링크입니다.");

  let current = target.url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let response: Response;
    try {
      response = await fetchImpl(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          "user-agent": "Keepnote/0.1 (link preview)",
          accept: "text/html,application/xhtml+xml",
          "accept-language": "ko,en;q=0.8",
        },
      });
    } catch {
      throw new FetchFailedError("링크 요청에 실패했습니다.");
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      const next = location ? validateTarget(new URL(location, current).toString()) : null;
      if (!next) throw new FetchFailedError("허용되지 않은 이동입니다.");
      current = next.url;
      continue;
    }
    if (!response.ok) throw new FetchFailedError(`링크 응답 오류 (${response.status})`);
    let html: string;
    try {
      html = await readLimited(response, MAX_HTML_BYTES);
    } catch {
      throw new FetchFailedError("링크 응답을 읽지 못했습니다.");
    }
    return buildLinkPreview(target.url, html);
  }
  throw new FetchFailedError("이동이 너무 많습니다.");
}
