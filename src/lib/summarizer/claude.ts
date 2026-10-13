import type { SummaryResult } from "../types";
import type { LinkSummarizer } from "./types";

function isSummaryResult(value: unknown): value is SummaryResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.url === "string" &&
    (result.source === "Instagram" || result.source === "Threads") &&
    typeof result.authorId === "string" &&
    typeof result.title === "string" &&
    typeof result.originalText === "string" &&
    (result.thumbnailUrl === null || typeof result.thumbnailUrl === "string") &&
    Array.isArray(result.summaryLines) &&
    result.summaryLines.every((line) => typeof line === "string") &&
    Array.isArray(result.keyInfo)
  );
}

/** 서버가 알려준 실패 종류. 정보 부족과 그 외(수집·설정·AI 오류)를 화면에서 구분한다. */
export class SummarizeError extends Error {
  constructor(
    readonly kind: "insufficient" | "failed",
    message: string,
  ) {
    super(message);
    this.name = "SummarizeError";
  }
}

/**
 * 서버의 `/api/summarize`를 호출하는 실제 요약 서비스.
 * API 키는 서버에만 있고 이 코드(브라우저)는 키를 다루지 않는다.
 * 실패하면 에러를 던진다. mock 결과로 대신하지 않는다.
 */
export class ClaudeLinkSummarizer implements LinkSummarizer {
  async summarize(url: string): Promise<SummaryResult> {
    const response = await fetch("/api/summarize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) {
      const kind = response.status === 422 ? "insufficient" : "failed";
      throw new SummarizeError(kind, `summarize failed: ${response.status}`);
    }
    const data: unknown = await response.json();
    if (!isSummaryResult(data)) throw new SummarizeError("failed", "invalid response");
    return data;
  }
}
