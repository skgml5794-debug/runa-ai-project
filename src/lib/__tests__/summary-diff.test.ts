import { describe, expect, it } from "vitest";
import { compareSummary, type SummaryContent } from "../summary-diff";

const base: SummaryContent = {
  title: "제목",
  summaryLines: ["하나", "둘"],
  keyInfo: [{ label: "장소", items: ["서울"] }],
};

describe("compareSummary", () => {
  it("수정하지 않으면 edited가 false다", () => {
    expect(compareSummary(base, structuredClone(base))).toEqual({
      edited: false,
      fieldsChangedCount: 0,
      itemsAdded: 0,
      itemsRemoved: 0,
    });
  });

  it("빈 항목과 빈 묶음, 앞뒤 공백은 수정으로 보지 않는다", () => {
    const after: SummaryContent = {
      title: " 제목 ",
      summaryLines: ["하나", "둘", ""],
      keyInfo: [
        { label: "제품", items: [""] },
        { label: "장소", items: ["서울 "] },
      ],
    };
    expect(compareSummary(base, after).edited).toBe(false);
  });

  it("고친 문장은 삭제 1, 추가 1로 센다", () => {
    const after = { ...base, summaryLines: ["하나", "둘 수정"] };
    expect(compareSummary(base, after)).toEqual({
      edited: true,
      fieldsChangedCount: 1,
      itemsAdded: 1,
      itemsRemoved: 1,
    });
  });

  it("제목, 요약, 핵심 정보를 모두 바꾸면 3으로 센다", () => {
    const after: SummaryContent = {
      title: "새 제목",
      summaryLines: ["하나"],
      keyInfo: [{ label: "장소", items: ["서울", "부산"] }],
    };
    expect(compareSummary(base, after)).toEqual({
      edited: true,
      fieldsChangedCount: 3,
      itemsAdded: 1,
      itemsRemoved: 1,
    });
  });
});
