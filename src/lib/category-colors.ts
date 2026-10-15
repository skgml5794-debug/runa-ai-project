/**
 * 킵박스 색상. 킵박스 목록 순서대로 이 색이 차례로 쓰이고, 다 쓰면 처음부터 반복한다.
 * (킵박스는 최대 20개이므로 5색이 네 번 반복된다.)
 */
export const CATEGORY_COLORS = [
  { background: "#8dd4ff", text: "#1f2937" },
  { background: "#da9cf2", text: "#1f2937" },
  { background: "#ff9e48", text: "#1f2937" },
  { background: "#98f296", text: "#1f2937" },
  { background: "#047aff", text: "#ffffff" },
] as const;

export function categoryColor(index: number) {
  return CATEGORY_COLORS[((index % CATEGORY_COLORS.length) + CATEGORY_COLORS.length) % CATEGORY_COLORS.length];
}
