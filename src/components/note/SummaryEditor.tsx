"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { uid } from "@/lib/async";
import { categoryColor } from "@/lib/category-colors";
import { normalizeCategoryName, validateCategoryName } from "@/lib/categories";
import {
  CATEGORY_NAME_MAX,
  MAX_CATEGORIES,
  MAX_NOTE_CATEGORIES,
  MESSAGES,
  TITLE_MAX,
} from "@/lib/constants";
import type { KeyInfoGroup, Source } from "@/lib/types";
import { useKeepnote } from "../KeepnoteProvider";
import { AutoTextarea } from "../ui/AutoTextarea";
import { FIELD_LINE } from "../ui/field";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { AlertDialog, ConfirmDialog } from "../ui/Dialog";
import {
  MetaLine,
  SectionNote,
  SectionTitle,
  Thumbnail,
} from "./NoteBlocks";

export interface EditorValues {
  title: string;
  summaryLines: string[];
  keyInfo: KeyInfoGroup[];
  categoryIds: string[];
}

/** 저장 전에 만든 새 카테고리. 저장할 때 실제 카테고리로 만든다. */
export interface PendingCategory {
  id: string;
  name: string;
}

export interface EditorInitial extends EditorValues {
  /** 원본 게시물 링크. 썸네일을 누르면 이 주소로 이동한다. */
  url: string;
  thumbnailUrl: string | null;
  source: Source;
  authorId: string;
  dateLabel: string;
  /** 첫 요약 화면에서 AI가 추천한 킵박스 이름 */
  suggestedCategory?: string;
}

/** 첫 요약 화면에서 이 순서로 먼저 보여주는 핵심 정보 이름 */
const DEFAULT_GROUPS = ["제품", "장소", "Tip"] as const;
const LABEL_MAX = 10;
const NEW_GROUP_LABEL = "새 카테고리";
const BULLET = "•";

/** 항목 목록을 불릿이 붙은 여러 줄 글로 바꾼다. 항목이 비어 있으면 빈 글. */
function itemsToText(items: string[]): string {
  if (items.length === 1 && items[0] === "") return "";
  return items.map((item) => `${BULLET} ${item}`).join("\n");
}

/**
 * 불릿 글을 항목 목록으로 되돌린다. 줄마다 불릿이 자동으로 붙고,
 * 불릿만 남은 줄(불릿을 지운 줄)은 항목에서 빠진다.
 */
function textToItems(text: string): string[] {
  const items = text
    .split("\n")
    .filter((line) => line.trim() !== BULLET)
    .map((line) => (line.startsWith(BULLET) ? line.slice(1).replace(/^ /, "") : line));
  return items.length > 0 ? items : [""];
}

/** 편집 중인 핵심 정보 묶음. fallback은 이름 칸을 비웠을 때 쓰는 원래 이름이다. */
interface EditableGroup extends KeyInfoGroup {
  fallback: string;
}

/**
 * 첫 요약 화면: 내용이 있는 핵심 정보 묶음만 보여준다. (비어 있으면 만들지 않고, 필요하면 사용자가 직접 추가한다.)
 * 수정 화면: 저장된 묶음만 그대로 보여준다.
 */
function toEditableGroups(keyInfo: KeyInfoGroup[], firstSummary: boolean): EditableGroup[] {
  const groups = keyInfo.map((group) => ({ ...group, fallback: group.label }));
  if (!firstSummary) return groups;
  const filled = groups.filter((group) => group.items.some((item) => item.trim() !== ""));
  const rank = (label: string) => {
    const index = DEFAULT_GROUPS.findIndex((name) => name === label);
    return index === -1 ? DEFAULT_GROUPS.length : index;
  };
  return [...filled].sort((a, b) => rank(a.label) - rank(b.label));
}

interface SummaryEditorProps {
  initial: EditorInitial;
  /** 저장 전 첫 요약 화면이면 true. 핵심 정보 영역을 모두 보여주고 이름도 고칠 수 있다. */
  firstSummary?: boolean;
  onSave(values: EditorValues, pending: PendingCategory[]): Promise<void>;
  onClose(): void;
}

function snapshot(values: EditorValues, pendingCount: number): string {
  return JSON.stringify({
    ...values,
    categoryIds: [...values.categoryIds].sort(),
    pendingCount,
  });
}

const FIELD_BOX = "rounded-2xl px-4 py-3 text-base leading-7";
const FIELD_BASE = FIELD_LINE;

/**
 * 새 요약 결과 화면과 저장된 킵노트의 수정 화면이 함께 쓰는 편집기.
 * 제목·핵심 요약 줄·핵심 정보 항목의 텍스트와 카테고리 지정만 바꿀 수 있다.
 */
export function SummaryEditor({
  initial,
  firstSummary = false,
  onSave,
  onClose,
}: SummaryEditorProps) {
  const { categories } = useKeepnote();

  const [title, setTitle] = useState(initial.title);
  // 요약이 비어 있어도 직접 입력할 수 있도록 빈 입력칸 하나를 둔다.
  const [lines, setLines] = useState(
    initial.summaryLines.length > 0 ? initial.summaryLines : [""],
  );
  const [keyInfo, setKeyInfo] = useState(() =>
    toEditableGroups(initial.keyInfo, firstSummary),
  );
  const [selectedIds, setSelectedIds] = useState(initial.categoryIds);
  const [pending, setPending] = useState<PendingCategory[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emptyAlert, setEmptyAlert] = useState(false);
  const [baseline] = useState(() =>
    snapshot(
      {
        title: initial.title,
        summaryLines: initial.summaryLines.length > 0 ? initial.summaryLines : [""],
        keyInfo: toEditableGroups(initial.keyInfo, firstSummary),
        categoryIds: initial.categoryIds,
      },
      0,
    ),
  );

  const allCategories = [
    ...categories,
    ...pending.map((item) => ({ id: item.id, name: item.name })),
  ];
  const validSelected = selectedIds.filter((id) =>
    allCategories.some((category) => category.id === id),
  );
  const atTotalMax = allCategories.length >= MAX_CATEGORIES;
  const atNoteMax = validSelected.length >= MAX_NOTE_CATEGORIES;
  // 두 조건이 동시에 해당되면 전체 한도 안내 하나만 표시한다.
  const limitMessage = atTotalMax
    ? MESSAGES.categoryTotalMax
    : atNoteMax
      ? MESSAGES.categoryNoteMax
      : null;

  const nameError = validateCategoryName(newName, allCategories);

  const current: EditorValues = {
    title,
    summaryLines: lines,
    keyInfo,
    categoryIds: validSelected,
  };
  const dirty = snapshot(current, pending.length) !== baseline;
  // 제목만 필수다. 요약과 핵심 정보는 모두 비워도 저장할 수 있다.
  const invalid = title.trim() === "";

  const requestClose = () => {
    if (dirty) setLeaveOpen(true);
    else onClose();
  };

  // 추천은 첫 요약 화면에서만, 이미 같은 이름이 선택돼 있지 않을 때만 보여준다.
  const suggestion = firstSummary ? (initial.suggestedCategory ?? "").trim() : "";
  const suggestedMatch = suggestion
    ? allCategories.find((category) => category.name === suggestion)
    : undefined;
  const showSuggestion =
    suggestion !== "" &&
    !(suggestedMatch && validSelected.includes(suggestedMatch.id)) &&
    (suggestedMatch ? !atNoteMax : !atTotalMax && !atNoteMax);

  const applySuggestion = () => {
    if (suggestedMatch) {
      toggleCategory(suggestedMatch.id);
      return;
    }
    const id = `new:${uid()}`;
    setPending((previous) => [...previous, { id, name: normalizeCategoryName(suggestion) }]);
    setSelectedIds([...validSelected, id]);
  };

  const toggleCategory = (id: string) => {
    setSelectedIds((previous) => {
      const valid = previous.filter((value) =>
        allCategories.some((category) => category.id === value),
      );
      if (valid.includes(id)) return valid.filter((value) => value !== id);
      if (valid.length >= MAX_NOTE_CATEGORIES) return valid;
      return [...valid, id];
    });
  };

  const commitNewCategory = () => {
    if (nameError === "empty") {
      setEmptyAlert(true);
      return;
    }
    if (nameError || atTotalMax || atNoteMax) return;
    const id = `new:${uid()}`;
    setPending((previous) => [
      ...previous,
      { id, name: normalizeCategoryName(newName) },
    ]);
    setSelectedIds([...validSelected, id]);
    setNewName("");
    setAdding(false);
  };

  const handleSave = async () => {
    if (saving) return;
    if (invalid) {
      setEmptyAlert(true);
      return;
    }
    setSaving(true);
    try {
      await onSave(
        {
          title: title.trim(),
          // 비어 있는 항목은 저장하지 않는다.
          summaryLines: lines.map((line) => line.trim()).filter((line) => line !== ""),
          keyInfo: keyInfo
            .map((group) => ({
              label: group.label.trim() || group.fallback,
              items: group.items.map((item) => item.trim()).filter((item) => item !== ""),
            }))
            .filter((group) => group.items.length > 0),
          categoryIds: validSelected,
        },
        pending,
      );
    } catch {
      setSaving(false);
    }
  };

  const updateLine = (index: number, value: string) =>
    setLines((previous) =>
      previous.map((line, i) => (i === index ? value : line)),
    );

  const updateKeyInfoLabel = (groupIndex: number, value: string) =>
    setKeyInfo((previous) =>
      previous.map((group, gi) => (gi === groupIndex ? { ...group, label: value } : group)),
    );

  const updateKeyInfoText = (groupIndex: number, text: string) =>
    setKeyInfo((previous) =>
      previous.map((group, gi) =>
        gi === groupIndex ? { ...group, items: textToItems(text) } : group,
      ),
    );

  const removeKeyInfoGroup = (groupIndex: number) =>
    setKeyInfo((previous) => previous.filter((_, gi) => gi !== groupIndex));

  const addKeyInfoGroup = () =>
    setKeyInfo((previous) => [
      ...previous,
      { label: "", fallback: NEW_GROUP_LABEL, items: [""] },
    ]);

  // Enter만 누르면 줄바꿈하지 않고, Shift+Enter로 줄바꿈한다. (한글 조합 중에는 건드리지 않는다)
  const preventNewline = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      
      <div className={`min-h-0 flex-1 overflow-y-auto px-5 pb-8 space-y-9 pt-7`}>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
              <Thumbnail
                compact
                source={initial.source}
                src={initial.thumbnailUrl}
                href={initial.url}
                showArrow={initial.source === "Threads"}
              />
              <MetaLine
                stacked
                source={initial.source}
                authorId={initial.authorId}
                dateLabel={initial.dateLabel}
              />
              <button
                type="button"
                aria-label="닫기"
                onClick={requestClose}
                className="-mr-2.5 -mt-1 ml-auto flex size-11 shrink-0 items-center justify-center self-start rounded-full text-midnight-ink"
              >
                <X className="size-6" aria-hidden />
              </button>
          </div>
          <div className="space-y-1.5">
            <input
              aria-label="제목"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              className={`min-h-14 w-full rounded-2xl border bg-white px-4 outline-none transition-colors ${
                "text-base font-bold"
              } ${title.trim() === "" ? "border-danger" : FIELD_BASE}`}
            />
          </div>
        </div>

        <section className="space-y-4">
          <div className="space-y-2">
            <SectionTitle>AI 요약</SectionTitle>
            <SectionNote>{MESSAGES.summaryAiNotice}</SectionNote>
          </div>
          <ul className="space-y-2">
            {lines.map((line, index) => (
              <li key={index}>
                <AutoTextarea
                  aria-label={`핵심 요약 ${index + 1}번째 줄`}
                  value={line}
                  onChange={(event) => updateLine(index, event.target.value)}
                  onKeyDown={preventNewline}
                  className={`${FIELD_BOX} bg-white ${FIELD_BASE}`}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <SectionTitle>핵심 정보</SectionTitle>
            <SectionNote>{MESSAGES.summaryKeyInfoNotice}</SectionNote>
          </div>
          <div className="space-y-5">
            {keyInfo.map((group, groupIndex) =>
              group.items.length === 0 ? null : (
                <div key={groupIndex} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      aria-label={`${group.fallback} 이름`}
                      value={group.label}
                      maxLength={LABEL_MAX}
                      placeholder={group.fallback}
                      size={Math.max(group.label.length, group.fallback.length, 2)}
                      onChange={(event) => updateKeyInfoLabel(groupIndex, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.preventDefault();
                      }}
                      className={`block w-32 rounded-2xl border bg-white px-4 py-3 text-base text-midnight-ink outline-none ${FIELD_LINE}`}
                    />
                    <button
                      type="button"
                      aria-label={`${group.label || group.fallback} 삭제`}
                      onClick={() => removeKeyInfoGroup(groupIndex)}
                      className="shrink-0 px-1 py-1 text-sm text-[#8492a6] underline underline-offset-2"
                    >
                      삭제
                    </button>
                  </div>
                  <AutoTextarea
                    aria-label={`${group.fallback} 내용`}
                    value={itemsToText(group.items)}
                    onChange={(event) => updateKeyInfoText(groupIndex, event.target.value)}
                    className={`${FIELD_BOX} bg-white ${FIELD_BASE}`}
                  />
                </div>
              ),
            )}
            <button
              type="button"
              aria-label="핵심 정보 내용 추가"
              onClick={addKeyInfoGroup}
              className={`flex w-full items-center justify-center gap-1.5 rounded-2xl border border-[#e5e9ef] bg-white text-sm font-medium text-graphite min-h-14`}
            >
              <Plus className="size-4" aria-hidden />
              내용 추가
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <SectionTitle>킵박스</SectionTitle>
            <div className="space-y-0.5">
                {MESSAGES.summaryBoxNotices.map((notice) => (
                  <SectionNote key={notice}>{notice}</SectionNote>
                ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {allCategories.map((category, index) => {
              const selected = validSelected.includes(category.id);
              return (
                <Chip
                  key={category.id}
                  tone={categoryColor(index)}
                  outline
                  selected={selected}
                  disabled={!selected && atNoteMax}
                  onClick={() => toggleCategory(category.id)}
                >
                  {category.name}
                </Chip>
              );
            })}
            {showSuggestion ? (
              <button
                type="button"
                aria-label={`추천 킵박스 ${suggestion} 추가`}
                onClick={applySuggestion}
                className="relative inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#d5dde8] bg-white px-4 text-sm font-medium text-midnight-ink"
              >
                <Plus className="size-4" aria-hidden />
                {suggestion}
                <span className="absolute -right-1.5 -top-2 rounded-full bg-midnight-ink px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  추천
                </span>
              </button>
            ) : null}
            <button
              type="button"
              aria-label="킵박스 추가"
              aria-expanded={adding}
              disabled={atTotalMax || atNoteMax}
              onClick={() => setAdding((open) => !open)}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-mist bg-white px-3 text-graphite disabled:opacity-40"
            >
              <Plus className="size-5" aria-hidden />
            </button>
          </div>

          {adding ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  autoFocus
                  aria-label="킵박스명"
                  value={newName}
                  maxLength={CATEGORY_NAME_MAX}
                  placeholder={MESSAGES.editorBoxPlaceholder}
                  onChange={(event) => setNewName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      commitNewCategory();
                    }
                  }}
                  className={`min-h-14 min-w-0 flex-1 rounded-2xl border px-4 text-base outline-none ${
                    nameError === "duplicate" ? "border-danger bg-white" : FIELD_LINE
                  }`}
                />
                <Button
                  size="sm"
                  disabled={nameError === "duplicate"}
                  onClick={commitNewCategory}
                >
                  추가
                </Button>
              </div>
              {nameError === "duplicate" ? (
                <p role="alert" className="text-sm text-danger">
                  {MESSAGES.categoryDuplicate}
                </p>
              ) : null}
            </div>
          ) : null}

          {limitMessage ? (
            <p className="text-xs text-slate">{limitMessage}</p>
          ) : null}
        </section>

      </div>

      <footer className="sticky bottom-0 z-10 shrink-0 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        <Button fullWidth disabled={saving} onClick={handleSave}>
          {firstSummary ? "킵노트에 저장" : "저장"}
        </Button>
      </footer>

      {emptyAlert ? (
        <AlertDialog
          message={MESSAGES.emptyInput}
          onConfirm={() => setEmptyAlert(false)}
        />
      ) : null}

      {leaveOpen ? (
        <ConfirmDialog
          message={MESSAGES.leaveUnsaved}
          confirmLabel="나가기"
          onCancel={() => setLeaveOpen(false)}
          onConfirm={() => {
            setLeaveOpen(false);
            onClose();
          }}
        />
      ) : null}
    </div>
  );
}
