import { describe, expect, it } from "vitest";
import {
  UNCATEGORIZED_ID,
  countByCategory,
  countUncategorized,
  filterAndSortNotes,
  formatDate,
  matchesQuery,
  removeCategoryFromNotes,
} from "../notes";
import { makeNote } from "./helpers";

describe("검색", () => {
  const note = makeNote();

  it("제목, 요약, 핵심 정보, 원문 본문에서 검색한다", () => {
    expect(matchesQuery(note, "카페")).toBe(true);
    expect(matchesQuery(note, "드립")).toBe(true);
    expect(matchesQuery(note, "연무장")).toBe(true);
    expect(matchesQuery(note, "roastery")).toBe(true);
  });

  it("대소문자를 구분하지 않고 부분 일치로 검색한다", () => {
    expect(matchesQuery(note, "ORIGINAL body")).toBe(true);
    expect(matchesQuery(note, "카")).toBe(true); // 1자 이상
  });

  it("검색어가 비어 있거나 공백이면 모두 일치한다", () => {
    expect(matchesQuery(note, "")).toBe(true);
    expect(matchesQuery(note, "   ")).toBe(true);
  });

  it("일치하지 않으면 false", () => {
    expect(matchesQuery(note, "스키")).toBe(false);
  });
});

describe("필터와 정렬", () => {
  const a = makeNote({ id: "a", title: "A 카페", createdAt: "2026-10-01T00:00:00Z", categoryIds: ["c1"] });
  const b = makeNote({ id: "b", title: "B 운동", createdAt: "2026-10-03T00:00:00Z", categoryIds: ["c1", "c2"] });
  const c = makeNote({ id: "c", title: "C 여행", createdAt: "2026-10-02T00:00:00Z", categoryIds: [] });
  const all = [a, b, c];

  it("미분류는 카테고리가 없는 킵노트만 보여주고, 개수를 센다", () => {
    expect(filterAndSortNotes(all, { query: "", categoryId: UNCATEGORIZED_ID, sort: "newest" }).map((n) => n.id)).toEqual(["c"]);
    expect(countUncategorized(all)).toBe(1);
    expect(countUncategorized([a, b])).toBe(0);
  });

  it("기본은 최신순, oldest는 과거순", () => {
    expect(filterAndSortNotes(all, { query: "", categoryId: null, sort: "newest" }).map((n) => n.id)).toEqual(["b", "c", "a"]);
    expect(filterAndSortNotes(all, { query: "", categoryId: null, sort: "oldest" }).map((n) => n.id)).toEqual(["a", "c", "b"]);
  });

  it("카테고리를 선택하면 해당 카테고리의 킵노트만 남는다", () => {
    expect(filterAndSortNotes(all, { query: "", categoryId: "c2", sort: "newest" }).map((n) => n.id)).toEqual(["b"]);
  });

  it("카테고리 선택 중 검색은 그 카테고리 안에서만 찾는다", () => {
    expect(filterAndSortNotes(all, { query: "여행", categoryId: "c1", sort: "newest" })).toEqual([]);
    expect(filterAndSortNotes(all, { query: "여행", categoryId: null, sort: "newest" }).map((n) => n.id)).toEqual(["c"]);
  });

  it("원본 배열을 변경하지 않는다", () => {
    const before = all.map((n) => n.id);
    filterAndSortNotes(all, { query: "", categoryId: null, sort: "oldest" });
    expect(all.map((n) => n.id)).toEqual(before);
  });

  it("카테고리별 개수를 센다", () => {
    expect(countByCategory(all, "c1")).toBe(2);
    expect(countByCategory(all, "c2")).toBe(1);
    expect(countByCategory(all, "none")).toBe(0);
  });
});

describe("카테고리 삭제 규칙", () => {
  it("다른 카테고리에도 속한 킵노트는 유지하고, 해당 카테고리 분류만 제거한다", () => {
    const both = makeNote({ id: "both", categoryIds: ["x", "y"] });
    const result = removeCategoryFromNotes([both], "x");
    expect(result).toHaveLength(1);
    expect(result[0].categoryIds).toEqual(["y"]);
  });

  it("분류 제거 후 어떤 카테고리에도 속하지 않게 되어도 킵노트는 삭제하지 않고 미분류로 둔다", () => {
    const only = makeNote({ id: "only", categoryIds: ["x"] });
    const result = removeCategoryFromNotes([only], "x");
    expect(result.map((n) => n.id)).toEqual(["only"]);
    expect(result[0].categoryIds).toEqual([]);
  });

  it("원래 카테고리가 없던 킵노트는 영향받지 않는다", () => {
    const none = makeNote({ id: "none", categoryIds: [] });
    const other = makeNote({ id: "other", categoryIds: ["y"] });
    expect(removeCategoryFromNotes([none, other], "x").map((n) => n.id)).toEqual(["none", "other"]);
  });
});

describe("formatDate", () => {
  it("YYYY.MM.DD 형식으로 표시한다", () => {
    expect(formatDate("2026-10-11T12:00:00")).toBe("2026.10.11");
  });
  it("잘못된 값은 빈 문자열", () => {
    expect(formatDate("not-a-date")).toBe("");
  });
});
