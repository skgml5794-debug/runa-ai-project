/** 피드백 선택지. value는 DB의 CHECK 제약과 같아야 한다. (UI 문구는 label) */
export const MOST_USEFUL_OPTIONS = [
  { value: "summary", label: "게시글 요약" },
  { value: "keepbox", label: "킵박스 정리" },
  { value: "search", label: "키워드 검색" },
  { value: "open_original", label: "원본 게시글 확인" },
] as const;

export const PAIN_POINT_OPTIONS = [
  { value: "summary_inaccurate", label: "요약 정확도" },
  { value: "info_missing", label: "정보 누락" },
  { value: "slow", label: "처리 속도" },
  { value: "keepbox_hard", label: "킵박스 관리" },
  { value: "search_hard", label: "검색" },
  { value: "link_fail", label: "링크 불러오기" },
  { value: "other", label: "기타" },
] as const;

export const MOST_USEFUL_VALUES: readonly string[] = MOST_USEFUL_OPTIONS.map((o) => o.value);
export const PAIN_POINT_VALUES: readonly string[] = PAIN_POINT_OPTIONS.map((o) => o.value);

export const COMMENT_MAX = 1_000;
