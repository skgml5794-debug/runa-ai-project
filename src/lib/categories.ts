import { CATEGORY_NAME_MAX } from "./constants";

/** 카테고리를 최대 개수보다 더 만들려 할 때 던진다. UI와 별개로 저장소에서도 막는다. */
export class CategoryLimitError extends Error {
  constructor() {
    super("카테고리 개수 한도를 넘었습니다.");
    this.name = "CategoryLimitError";
  }
}

export function normalizeCategoryName(value: string): string {
  return value.trim().slice(0, CATEGORY_NAME_MAX);
}

/** 대소문자를 구분하지 않고 중복을 검사한다. excludeId는 이름 변경 시 자기 자신을 제외한다. */
export function isDuplicateCategoryName(
  name: string,
  categories: readonly { id: string; name: string }[],
  excludeId?: string,
): boolean {
  const target = name.trim().toLocaleLowerCase();
  return categories.some(
    (category) =>
      category.id !== excludeId &&
      category.name.trim().toLocaleLowerCase() === target,
  );
}

export type CategoryNameError = "empty" | "duplicate" | null;

export function validateCategoryName(
  value: string,
  categories: readonly { id: string; name: string }[],
  excludeId?: string,
): CategoryNameError {
  const name = normalizeCategoryName(value);
  if (!name) return "empty";
  if (isDuplicateCategoryName(name, categories, excludeId)) return "duplicate";
  return null;
}

/**
 * 저장 전에 만든 임시 카테고리 id("new:...")를 실제로 만들어진 카테고리 id로 바꾼다.
 * pending과 created는 같은 순서다.
 */
export function remapCategoryIds(
  ids: readonly string[],
  pending: readonly { id: string }[],
  created: readonly { id: string }[],
): string[] {
  const map = new Map(pending.map((item, index) => [item.id, created[index].id]));
  return ids.map((id) => map.get(id) ?? id);
}
