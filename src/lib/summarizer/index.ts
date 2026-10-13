import { ClaudeLinkSummarizer } from "./claude";
import { MockLinkSummarizer } from "./mock";
import type { LinkSummarizer } from "./types";

/**
 * 앱 전체가 사용하는 요약 서비스.
 * NEXT_PUBLIC_SUMMARIZER_MODE=claude 이면 서버 API(`/api/summarize`)를 쓰고,
 * 그 외(기본값)에는 임시 mock을 쓴다. 실제 모드가 실패해도 mock으로 대체하지 않는다.
 */
export const summarizer: LinkSummarizer =
  process.env.NEXT_PUBLIC_SUMMARIZER_MODE === "claude"
    ? new ClaudeLinkSummarizer()
    : new MockLinkSummarizer();

export type { LinkSummarizer } from "./types";
