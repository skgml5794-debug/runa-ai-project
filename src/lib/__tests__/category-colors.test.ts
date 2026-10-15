import { describe, expect, it } from "vitest";
import { CATEGORY_COLORS, categoryColor } from "../category-colors";

describe("킵박스 색상", () => {
  it("순서대로 쓰고 다 쓰면 처음부터 반복한다", () => {
    expect(CATEGORY_COLORS).toHaveLength(5);
    for (let i = 0; i < 20; i += 1) {
      expect(categoryColor(i)).toBe(CATEGORY_COLORS[i % 5]);
    }
    expect(categoryColor(5)).toBe(categoryColor(0));
    expect(categoryColor(19)).toBe(categoryColor(4));
  });
});
