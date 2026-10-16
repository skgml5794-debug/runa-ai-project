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
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { AlertDialog, ConfirmDialog } from "../ui/Dialog";
import {
  MetaLine,
  SectionTitle,
  Thumbnail,
} from "./NoteBlocks";

export interface EditorValues {
  title: string;
  summaryLines: string[];
  keyInfo: KeyInfoGroup[];
  categoryIds: string[];
}

/** 저장 전에 만든 새 킵박스. 저장할 때 실제 킵박스로 만든다. */
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
}

/** 첫 요약 화면에서 항상 보여주는 핵심 정보 영역(순서 고정). */
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
 * 첫 요약 화면: 항목이 없어도 제품·장소·Tip 영역을 모두 보여주고, 빈 영역에는 빈 입력칸 하나를 둔다.
 * 수정 화면: 저장된 묶음만 그대로 보여준다.
 */
function toEditableGroups(keyInfo: KeyInfoGroup[], firstSummary: boolean): EditableGroup[] {
  const groups = keyInfo.map((group) => ({ ...group, fallback: group.label }));
  if (!firstSummary) return groups;
  const defaults = DEFAULT_GROUPS.map(
    (label) => groups.find((group) => group.label === label) ?? { label, items: [], fallback: label },
  );
  const others = groups.filter((group) => !DEFAULT_GROUPS.some((label) => label === group.label));
  return [...defaults, ...others].map((group) => ({
    ...group,
    items: group.items.length > 0 ? group.items : [""],
  }));
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
const FIELD_BASE = "border-mist focus:border-slate";

/**
 * 새 요약 결과 화면과 저장된 킵노트의 수정 화면이 함께 쓰는 편집기.
 * 제목·핵심 요약 줄·핵심 정보 항목의 텍스트와 킵박스 지정만 바꿀 수 있다.
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
      <header className="flex shrink-0 items-center justify-end px-4 pt-6">
        <button
          type="button"
          aria-label="닫기"
          onClick={requestClose}
          className="flex size-11 items-center justify-center rounded-full text-midnight-ink"
        >
          <X className="size-6" aria-hidden />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 pb-8 pt-2">
        <div className="space-y-5">
          <Thumbnail
            source={initial.source}
            src={initial.thumbnailUrl}
            href={initial.url}
            showArrow={initial.source === "Threads"}
          />
          <div className="space-y-1.5">
            <input
              aria-label="제목"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              className={`min-h-14 w-full rounded-2xl border bg-white px-4 text-center text-[26px] font-bold leading-snug outline-none transition-colors ${
                title.trim() === "" ? "border-danger" : FIELD_BASE
              }`}
            />
            <MetaLine
              source={initial.source}
              authorId={initial.authorId}
              dateLabel={initial.dateLabel}
            />
          </div>
        </div>

        <section className="space-y-3">
          <SectionTitle>AI 요약</SectionTitle>
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

        <section className="space-y-3">
          <SectionTitle>핵심 정보</SectionTitle>
          <div className="space-y-4 rounded-2xl bg-fog p-4">
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
                      className="block max-w-full rounded-full border border-transparent bg-white px-3 py-1 text-xs font-semibold text-graphite outline-none focus:border-slate"
                    />
                    <button
                      type="button"
                      aria-label={`${group.label || group.fallback} 삭제`}
                      onClick={() => removeKeyInfoGroup(groupIndex)}
                      className="shrink-0 px-1 py-1 text-sm text-[#8b95a5]"
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
              aria-label="핵심 정보 카테고리 추가"
              onClick={addKeyInfoGroup}
              className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-mist bg-white text-sm font-medium text-graphite"
            >
              <Plus className="size-4" aria-hidden />
              카테고리 추가
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle>킵박스</SectionTitle>
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
                  placeholder={MESSAGES.categoryNamePlaceholder}
                  onChange={(event) => setNewName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      commitNewCategory();
                    }
                  }}
                  className={`min-h-14 min-w-0 flex-1 rounded-2xl border px-4 text-base outline-none ${
                    nameError === "duplicate"
                      ? "border-danger"
                      : "border-mist focus:border-slate"
                  }`}
                />
                <Button
                  size="sm"
                  disabled={nameError === "duplicate"}
                  onClick={commitNewCategory}
                >
                  완료
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

        {firstSummary ? (
          <ul className="-mx-6 space-y-1 border-t border-[#e9edf2] px-6 pt-5 text-sm text-slate-deep">
            {MESSAGES.summaryNotices.map((notice) => (
              <li key={notice} className="flex gap-2">
                <span aria-hidden className="mt-[0.7em] size-[3px] shrink-0 rounded-full bg-slate" />
                {notice}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <footer className="shrink-0 bg-white px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
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
