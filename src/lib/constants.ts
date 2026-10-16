export const MAX_CATEGORIES = 20;
export const MAX_NOTE_CATEGORIES = 10;
export const CATEGORY_NAME_MAX = 20;
export const TITLE_MAX = 100;
export const SUMMARY_TIMEOUT_MS = 30_000;
export const TOAST_DURATION_MS = 2_500;

export const MESSAGES = {
  homeHeadline: "어떤 정보를 킵할까요?",
  loading: "AI 분석중..",
  summaryDone: "요약이 성공적으로 완료되었어요",
  emptyInput: "내용을 입력해주세요",
  fetchError:
    "정보를 가져오는 중 문제가 발생했어요. 링크를 확인한 후 다시 시도해주세요.",
  insufficientContent:
    "요약할 만한 내용이 부족해요. 게시물에 글이 거의 없거나 일부만 공개되어 있을 수 있어요.",
  leaveUnsaved: "저장하지 않고 나갈까요?",
  noResults: "검색 결과가 없어요. 다른 키워드로 검색해보세요.",
  emptyNotes: "아직 킵한 정보가 없어요. 홈에서 링크를 입력해보세요.",
  emptyCategoryNotes: "이 킵박스에 저장된 킵노트가 없어요.",
  emptyCategories: "만든 킵박스가 없어요.",
  categoryNamePlaceholder: "킵박스명을 입력해주세요",
  categoryDuplicate: "이미 사용 중인 킵박스명이에요.",
  summaryNotices: ["AI 요약은 정확하지 않을 수 있어요."],
  categoryTotalMax: "킵박스는 최대 20개까지 가능해요",
  categoryNoteMax: "킵노트 하나에는 최대 10개의 킵박스를 지정할 수 있어요.",
  searchPlaceholder: "제품명, 키워드로 검색하세요",
  searchPlaceholderInCategory: "이 킵박스 내에서 검색",
  deleteNote: "이 킵노트를 삭제할까요?\n삭제한 정보는 복구할 수 없어요.",
  deleteCategory: "킵박스를 삭제해도 킵노트는 계속 저장된 상태로 유지됩니다",
} as const;
