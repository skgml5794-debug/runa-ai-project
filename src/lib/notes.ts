import type { Note } from "./types";

export type SortOrder = "newest" | "oldest";

/** YYYY.MM.DD (기기 시간대 기준) */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function searchableText(note: Note): string {
  return [
    note.title,
    note.summaryLines.join(" "),
    note.keyInfo.map((g) => `${g.label} ${g.items.join(" ")}`).join(" "),
    note.originalText,
  ]
    .join("\n")
    .toLocaleLowerCase();
}

/** 제목, 핵심 요약, 핵심 정보, 원문 본문에서 부분 일치(대소문자 무시)로 검색한다. */
export function matchesQuery(note: Note, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return searchableText(note).includes(needle);
}

/** 킵박스를 하나도 지정하지 않은 킵노트를 고르는 목록 필터 값 */
export const UNCATEGORIZED_ID = "uncategorized";

export function countUncategorized(notes: readonly Note[]): number {
  return notes.filter((note) => note.categoryIds.length === 0).length;
}

export function filterAndSortNotes(
  notes: readonly Note[],
  options: { query: string; categoryId: string | null; sort: SortOrder },
): Note[] {
  const { query, categoryId, sort } = options;
  const filtered = notes.filter(
    (note) =>
      (categoryId === null ||
        (categoryId === UNCATEGORIZED_ID
          ? note.categoryIds.length === 0
          : note.categoryIds.includes(categoryId))) &&
      matchesQuery(note, query),
  );
  const direction = sort === "newest" ? -1 : 1;
  return filtered.sort((a, b) => {
    const diff = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    return diff === 0 ? 0 : diff * direction;
  });
}

/** 킵박스 하나의 저장 수 표기. 99개를 넘으면 99+ */
export function formatCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

export function countByCategory(
  notes: readonly Note[],
  categoryId: string,
): number {
  return notes.filter((note) => note.categoryIds.includes(categoryId)).length;
}

/**
 * 카테고리를 삭제할 때 킵노트에 적용할 규칙.
 * - 해당 카테고리의 분류만 제거한다. 킵노트는 삭제하지 않는다.
 * - 다른 카테고리가 남지 않은 킵노트는 미분류(카테고리 없음)가 된다.
 */
export function removeCategoryFromNotes(
  notes: readonly Note[],
  categoryId: string,
): Note[] {
  const result: Note[] = [];
  for (const note of notes) {
    if (!note.categoryIds.includes(categoryId)) {
      result.push(note);
      continue;
    }
    result.push({
      ...note,
      categoryIds: note.categoryIds.filter((id) => id !== categoryId),
    });
  }
  return result;
}
