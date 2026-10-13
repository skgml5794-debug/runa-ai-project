import type { SummaryResult } from "../types";

/**
 * 링크를 받아 요약 결과를 반환하는 서비스.
 * 실제 수집·AI 요약 연동은 이 인터페이스를 구현해 `index.ts`에서 교체한다.
 * 실패 시에는 에러를 던진다. (오류 원인별 안내는 이번 범위에서 제외)
 */
export interface LinkSummarizer {
  summarize(url: string): Promise<SummaryResult>;
}
