import type { Note } from "../types";

export function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    url: "https://www.instagram.com/p/abc/",
    source: "Instagram",
    authorId: "tester",
    thumbnailUrl: null,
    title: "성수동 카페",
    summaryLines: ["드립 커피가 맛있다", "주말에는 대기가 길다", "평일 오전 추천"],
    keyInfo: [{ label: "장소", items: ["성수동 연무장길"] }],
    originalText: "Original Body Text about Roastery",
    categoryIds: [],
    createdAt: "2026-10-01T09:00:00.000Z",
    updatedAt: "2026-10-01T09:00:00.000Z",
    ...overrides,
  };
}
