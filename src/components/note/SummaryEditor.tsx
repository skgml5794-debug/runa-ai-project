"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { uid } from "@/lib/async";
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
  KeyInfoLabel,
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

interface SummaryEditorProps {
  initial: EditorInitial;
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

const FIELD_BOX = "rounded-xl px-4 py-3 text-base leading-7";
const FIELD_BASE = "border-mist focus:border-slate";

/**
 * 새 요약 결과 화면과 저장된 킵노트의 수정 화면이 함께 쓰는 편집기.
 * 제목·핵심 요약 줄·핵심 정보 항목의 텍스트와 킵박스 지정만 바꿀 수 있다.
 */
export function SummaryEditor({ initial, onSave, onClose }: SummaryEditorProps) {
  const { categories } = useKeepnote();

  const [title, setTitle] = useState(initial.title);
  // 요약이 비어 있어도 직접 입력할 수 있도록 빈 입력칸 하나를 둔다.
  const [lines, setLines] = useState(
    initial.summaryLines.length > 0 ? initial.summaryLines : [""],
  );
  const [keyInfo, setKeyInfo] = useState(initial.keyInfo);
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
        keyInfo: initial.keyInfo,
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
              label: group.label,
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

  const updateKeyInfoItem = (
    groupIndex: number,
    itemIndex: number,
    value: string,
  ) =>
    setKeyInfo((previous) =>
      previous.map((group, gi) =>
        gi === groupIndex
          ? {
              ...group,
              items: group.items.map((item, ii) =>
                ii === itemIndex ? value : item,
              ),
            }
          : group,
      ),
    );

  // Enter만 누르면 줄바꿈하지 않고, Shift+Enter로 줄바꿈한다. (한글 조합 중에는 건드리지 않는다)
  const preventNewline = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
    }
  };

  const hasKeyInfo = keyInfo.some((group) => group.items.length > 0);

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
              className={`min-h-12 w-full rounded-xl border bg-fog px-4 text-center text-[26px] font-bold leading-snug outline-none transition-colors ${
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
          <SectionTitle>핵심 요약</SectionTitle>
          <ul className="space-y-2">
            {lines.map((line, index) => (
              <li key={index}>
                <AutoTextarea
                  aria-label={`핵심 요약 ${index + 1}번째 줄`}
                  value={line}
                  onChange={(event) => updateLine(index, event.target.value)}
                  onKeyDown={preventNewline}
                  className={`${FIELD_BOX} bg-fog ${FIELD_BASE}`}
                />
              </li>
            ))}
          </ul>
        </section>

        {hasKeyInfo ? (
          <section className="space-y-3">
            <SectionTitle>핵심 정보</SectionTitle>
            <div className="space-y-4 rounded-2xl bg-fog p-4">
              {keyInfo.map((group, groupIndex) =>
                group.items.length === 0 ? null : (
                  <div key={`${group.label}-${groupIndex}`} className="space-y-2">
                    <KeyInfoLabel>{group.label}</KeyInfoLabel>
                    <ul className="space-y-2">
                      {group.items.map((item, itemIndex) => (
                        <li key={itemIndex}>
                          <AutoTextarea
                            aria-label={`${group.label} ${itemIndex + 1}번째 항목`}
                            value={item}
                            onChange={(event) =>
                              updateKeyInfoItem(groupIndex, itemIndex, event.target.value)
                            }
                            onKeyDown={preventNewline}
                            className={`${FIELD_BOX} bg-white ${FIELD_BASE}`}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
              )}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <SectionTitle>킵박스</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {allCategories.map((category) => {
              const selected = validSelected.includes(category.id);
              return (
                <Chip
                  key={category.id}
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
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-dashed border-mist px-3 text-graphite disabled:opacity-40"
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
                  className={`min-h-12 min-w-0 flex-1 rounded-xl border px-4 text-base outline-none ${
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
      </div>

      <footer className="shrink-0 bg-white px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        <Button fullWidth disabled={saving} onClick={handleSave}>
          킵노트에 저장
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
