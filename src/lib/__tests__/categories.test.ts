import { describe, expect, it } from "vitest";
import {
  isDuplicateCategoryName,
  normalizeCategoryName,
  remapCategoryIds,
  validateCategoryName,
} from "../categories";

const existing = [
  { id: "a", name: "Work" },
  { id: "b", name: "여행" },
];

describe("카테고리 이름 규칙", () => {
  it("앞뒤 공백을 제거하고 20자로 제한한다", () => {
    expect(normalizeCategoryName("  여행  ")).toBe("여행");
    expect(normalizeCategoryName("가".repeat(25))).toHaveLength(20);
  });

  it("대소문자를 구분하지 않고 중복을 판단한다", () => {
    expect(isDuplicateCategoryName("work", existing)).toBe(true);
    expect(isDuplicateCategoryName("WORK", existing)).toBe(true);
    expect(isDuplicateCategoryName(" 여행 ", existing)).toBe(true);
    expect(isDuplicateCategoryName("맛집", existing)).toBe(false);
  });

  it("이름 변경 시 자기 자신은 중복으로 보지 않는다 (대소문자만 변경 허용)", () => {
    expect(isDuplicateCategoryName("work", existing, "a")).toBe(false);
    expect(isDuplicateCategoryName("여행", existing, "a")).toBe(true);
  });

  it("공백만 입력하면 empty, 중복이면 duplicate를 돌려준다", () => {
    expect(validateCategoryName("   ", existing)).toBe("empty");
    expect(validateCategoryName("work", existing)).toBe("duplicate");
    expect(validateCategoryName("맛집", existing)).toBeNull();
  });
});

describe("remapCategoryIds", () => {
  it("임시 id를 실제 id로 바꾸고 기존 id는 유지한다", () => {
    const result = remapCategoryIds(
      ["a", "new:1", "new:2"],
      [{ id: "new:1" }, { id: "new:2" }],
      [{ id: "real-1" }, { id: "real-2" }],
    );
    expect(result).toEqual(["a", "real-1", "real-2"]);
  });
});
