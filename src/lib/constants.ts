export const MAX_CATEGORIES = 20;
export const MAX_NOTE_CATEGORIES = 10;
export const CATEGORY_NAME_MAX = 20;
export const TITLE_MAX = 100;
export const SUMMARY_TIMEOUT_MS = 30_000;
export const TOAST_DURATION_MS = 2_500;

export const MESSAGES = {
  homeHeadline: "핵심만 쏙!\n어떤 정보를 킵할까요?",
  homeScope: "요약범위 확인",
  loadingEta: "8초 정도 소요돼요",
  homeLinkPlaceholder: "인스타그램 또는 스레드 링크 입력",
  homeTooltip: "본문이 있으면 더 정확하게 불러와요",
  loading: "AI 분석중..",
  summaryDone: "요약이 성공적으로 완료되었어요",
  clipboardLink: "방금 복사한 링크 킵할까요?",
  emptyInput: "내용을 입력해주세요",
  fetchError:
    "정보를 가져오는 중 문제가 발생했어요. 링크를 확인한 후 다시 시도해주세요.",
  insufficientContent:
    "요약할 만한 내용이 부족해요.\n게시물에 글이 거의 없거나 일부만\n공개되어 있을 수 있어요.",
  leaveUnsaved: "저장하지 않고 나갈까요?",
  noResults: "검색 결과가 없어요. 다른 키워드로 검색해보세요.",
  emptyNotes: "아직 킵한 정보가 없어요\n유용한 게시글을 요약해 저장하고,\n키워드로 쉽게 다시 찾아보세요.",
  emptyCategoryNotes: "이 킵박스에 저장된 킵노트가 없어요.",
  emptyCategories: "생성한 킵박스가 없어요\n킵한 정보를 나만의 주제로\n모아 정리해 보세요.",
  categoryNamePlaceholder: "킵박스명을 입력해주세요",
  categoryDuplicate: "이미 사용 중인 킵박스명이에요.",
  summaryAiNotice: "AI 요약은 게시물의 형식과 내용에 따라\n일부 정보가 누락되거나 다르게 해석될 수 있어요.",
  summaryKeyInfoNotice: "정확한 정보를 위해 원문을 함께 확인해 편집해 보세요.",
  summaryBoxNotices: ["내용을 저장할 폴더를 선택하거나 추가할 수 있어요.", "하나의 노트는 여러 킵박스에 저장할 수 있어요."],
  editorBoxPlaceholder: "폴더명을 입력해주세요",
  summaryNotices: [
    "AI 요약은 게시물의 형식과 내용에 따라 일부 정보가 누락되거나 다르게 해석될 수 있어요.",
    "가격, 옵션, 일정 등 정확한 정보가 필요하다면 원문을 함께 확인해 주세요.",
    "하나의 노트는 여러 킵박스에 저장할 수 있어요.",
  ],
  categoryTotalMax: "킵박스는 최대 20개까지 가능해요",
  categoryNoteMax: "킵노트 하나에는 최대 10개의 킵박스를 지정할 수 있어요.",
  searchPlaceholder: "제품명, 키워드로 검색하세요",
  searchPlaceholderInCategory: "이 킵박스 내에서 검색",
  deleteNote: "이 킵노트를 삭제할까요?\n삭제한 정보는 복구할 수 없어요.",
  deleteCategory: "삭제하시겠습니까?\n킵박스를 삭제해도 킵노트는\n계속 저장된 상태로 유지됩니다",
} as const;

/** 요약 범위 안내. 서비스별 카드: ok면 불러올 수 있는 내용, 아니면 불러올 수 없는 내용 */
export const SUMMARY_SCOPE = [
  {
    service: "Instagram",
    items: [
      {
        ok: true,
        title: "본문에 정보가 작성된 경우",
        image: "/scope/instagram-1.png",
        text: "링크를 복사하기 전,\n본문에 내용이 포함되어있는지 확인해주세요.",
      },
      {
        ok: false,
        title: "영상에 정보가 포함된 경우",
        image: "/scope/instagram-2.png",
        text: "음성이나 자막은 일부 확인될 수 있지만\n일부 내용만 가져올 수 있어요.",
        tip: "Tip. 요약이 끝난 뒤 부족한 내용은 직접 추가하거나\n수정할 수 있어요.",
      },
      {
        ok: false,
        title: "피드 이미지에 정보가 작성된 경우",
        image: "/scope/instagram-3.png",
        text: "이미지에만 정보가 있을 경우는 불가능하지만,\n본문에도 내용이 작성되어있다면 불러올 수 있어요.",
      },
    ],
  },
  {
    service: "Threads",
    items: [
      {
        ok: true,
        title: "본문에 내용이 작성된 경우",
        image: "/scope/threads-1.png",
        text: "링크를 복사하기 전,\n본문에 내용이 포함되어있는지 확인해주세요.",
      },
      {
        ok: false,
        title: "이미지에 정보가 포함된 경우",
        image: "/scope/threads-2.png",
        text: "이미지에만 내용이 있다면 내용을 불러올 수 없어요.",
      },
      {
        ok: true,
        title: "고정 댓글에 정보가 포함된 경우",
        image: "/scope/threads-3.png",
        text: "스레드는 고정 댓글에 정보를 제공하는\n경우가 많아요. 최대 3개까지 불러올 수 있어요.",
      },
      {
        ok: true,
        title: "일반 댓글에 정보가 포함된 경우",
        image: "/scope/threads-4.png",
        text: "필요한 정보가 일반 댓글에 있다면\n해당 댓글의 링크를 복사하세요.",
        tip: "Tip. 해당 댓글 오른쪽의 더보기(⋯)를 누르면 돼요.",
      },
    ],
  },
] as const;

/** 킵노트 화면 입력 줄에 보여주는 예시 링크 표기 */
export const SAMPLE_LINK_LABEL = "https://www.instagram.com/reel/..";

/** 킵노트 화면에서 체험용으로 쓰는 예시 링크 */
export const SAMPLE_NOTE = {
  url: "https://www.instagram.com/reel/DbR7VG_z1Hr/?utm_source=ig_web_copy_link&cplk=MzRlODBiNWFlZA==&srtk=MzRlODBiNWFlZA==",
} as const;
