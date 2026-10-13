import type { Source } from "./types";

const HOSTS: Record<string, Source> = {
  "instagram.com": "Instagram",
  "threads.net": "Threads",
  "threads.com": "Threads",
};

export interface ParsedLink {
  url: string;
  source: Source;
}

/**
 * Instagram/Threads 링크인지 확인한다. 프로토콜이 없으면 https를 붙인다.
 * 도메인만 있고 경로가 없는 주소는 게시물 링크가 아니므로 거부한다.
 */
export function parseLink(input: string): ParsedLink | null {
  const raw = input.trim();
  if (!raw) return null;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return null;
  }
  if (parsed.pathname.replace(/\/+$/, "") === "") return null;
  const host = parsed.hostname.toLowerCase();
  const key = Object.keys(HOSTS).find(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
  if (!key) return null;
  return { url: parsed.toString(), source: HOSTS[key] };
}

const USERNAME = /^[A-Za-z0-9._]{1,30}$/;
/** 첫 경로가 계정이 아닌 Instagram 주소 형태 (게시물·릴스·공유·탐색 등) */
const NON_ACCOUNT_SEGMENTS = new Set([
  "p", "reel", "reels", "tv", "share", "s", "explore", "accounts", "direct",
  "web", "about", "developer", "legal", "directory", "stories", "_u",
]);

/**
 * 링크 주소에서 작성자 아이디를 읽는다. 알 수 없으면 빈 문자열.
 * - Threads: `/@아이디/post/...`
 * - Instagram: `/아이디/p/코드`, `/아이디/reel/코드`, `/_u/아이디`, `/stories/아이디/번호`
 * - `/p/코드`, `/reel/코드`, `/share/...` 처럼 주소에 아이디가 없는 형태는 빈 문자열
 */
export function extractAuthorId(url: string): string {
  let segments: string[];
  try {
    segments = new URL(url).pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
  } catch {
    return "";
  }
  const handle = segments.find((segment) => segment.startsWith("@"))?.slice(1);
  if (handle && USERNAME.test(handle)) return handle;

  const first = segments[0]?.toLowerCase();
  if (first === "stories" || first === "_u") {
    const next = segments[1];
    return next && USERNAME.test(next) && next.toLowerCase() !== "highlights" ? next : "";
  }
  if (!first || NON_ACCOUNT_SEGMENTS.has(first)) return "";
  return USERNAME.test(segments[0]) ? segments[0] : "";
}
