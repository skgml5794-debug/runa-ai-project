export type Source = "Instagram" | "Threads";

export interface KeyInfoGroup {
  /** 유형 라벨 (제품/장소/방법/노하우 등, 추출된 유형명 그대로) */
  label: string;
  items: string[];
}

/** 링크 요약 서비스가 반환하는 결과. 저장 전 상태다. */
export interface SummaryResult {
  url: string;
  source: Source;
  authorId: string;
  thumbnailUrl: string | null;
  title: string;
  /** 핵심 요약 3~6줄 */
  summaryLines: string[];
  keyInfo: KeyInfoGroup[];
  /** 검색 대상으로만 보관하며 화면에는 표시하지 않는다. */
  originalText: string;
}

export interface Note extends SummaryResult {
  id: string;
  categoryIds: string[];
  /** 최초 저장일 (ISO). 정렬과 저장 날짜 표시 기준 */
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

/** 저장되기 전 새 킵노트 입력값 */
export type NoteInput = SummaryResult & { categoryIds: string[] };

/** 수정 가능한 필드. 썸네일·출처·작성자·저장일은 수정할 수 없다. */
export interface NotePatch {
  title: string;
  summaryLines: string[];
  keyInfo: KeyInfoGroup[];
  categoryIds: string[];
}
