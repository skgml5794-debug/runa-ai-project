import type { KeyInfoGroup } from "./types";

/** AI가 만든 요약 중 사용자가 고칠 수 있는 부분 */
export interface SummaryContent {
  title: string;
  summaryLines: string[];
  keyInfo: KeyInfoGroup[];
}

export interface SummaryEditStats {
  edited: boolean;
  /** 바뀐 영역 수 (제목, 핵심 요약, 핵심 정보 중 0~3) */
  fieldsChangedCount: number;
  /** 새로 생긴 항목 수. 문장을 고치면 이전 문장은 삭제, 고친 문장은 추가로 센다. */
  itemsAdded: number;
  itemsRemoved: number;
}

function clean(items: string[]): string[] {
  return items.map((item) => item.trim()).filter((item) => item !== "");
}

/** 내용이 빈 묶음은 편집기가 만들지 않으므로 비교에서도 뺀다. */
function cleanGroups(groups: KeyInfoGroup[]): KeyInfoGroup[] {
  return groups
    .map((group) => ({ label: group.label.trim(), items: clean(group.items) }))
    .filter((group) => group.items.length > 0);
}

/** before에 있는 만큼 짝을 지우고 남은 개수를 센다. */
function countMissing(from: string[], inOther: string[]): number {
  const rest = [...inOther];
  let missing = 0;
  for (const item of from) {
    const found = rest.indexOf(item);
    if (found === -1) missing += 1;
    else rest.splice(found, 1);
  }
  return missing;
}

/** AI 원본과 사용자가 확정한 요약을 비교한다. 내용 자체는 돌려주지 않고 숫자만 돌려준다. */
export function compareSummary(before: SummaryContent, after: SummaryContent): SummaryEditStats {
  const beforeLines = clean(before.summaryLines);
  const afterLines = clean(after.summaryLines);
  const beforeGroups = cleanGroups(before.keyInfo);
  const afterGroups = cleanGroups(after.keyInfo);

  const titleChanged = before.title.trim() !== after.title.trim();
  const linesChanged = JSON.stringify(beforeLines) !== JSON.stringify(afterLines);
  const keyInfoChanged = JSON.stringify(beforeGroups) !== JSON.stringify(afterGroups);

  const beforeItems = [...beforeLines, ...beforeGroups.flatMap((group) => group.items)];
  const afterItems = [...afterLines, ...afterGroups.flatMap((group) => group.items)];
  const fieldsChangedCount = [titleChanged, linesChanged, keyInfoChanged].filter(Boolean).length;

  return {
    edited: fieldsChangedCount > 0,
    fieldsChangedCount,
    itemsAdded: countMissing(afterItems, beforeItems),
    itemsRemoved: countMissing(beforeItems, afterItems),
  };
}
