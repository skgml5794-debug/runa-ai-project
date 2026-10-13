"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import {
  normalizeCategoryName,
  validateCategoryName,
} from "@/lib/categories";
import {
  CATEGORY_NAME_MAX,
  MAX_CATEGORIES,
  MESSAGES,
} from "@/lib/constants";
import { countByCategory } from "@/lib/notes";
import type { Category } from "@/lib/types";
import { useKeepnote } from "../KeepnoteProvider";
import { Button } from "../ui/Button";
import { AlertDialog, ConfirmDialog } from "../ui/Dialog";
import { PencilIcon, TrashIcon } from "../ui/icons";

/** 킵박스 관리 화면. 하단 메뉴의 킵박스 탭으로 들어온다. */
export function CategoriesScreen() {
  const { notes, categories, ready, addCategories, renameCategory, deleteCategory } =
    useKeepnote();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [emptyAlert, setEmptyAlert] = useState(false);

  const atMax = categories.length >= MAX_CATEGORIES;
  const addError = validateCategoryName(newName, categories);

  const addCategory = async () => {
    if (addError === "empty") {
      setEmptyAlert(true);
      return;
    }
    if (addError || atMax) return;
    await addCategories([newName]);
    setNewName("");
  };

  const startRename = (category: Category) => {
    setEditingId(category.id);
    setDraftName(category.name);
  };

  const cancelRename = () => {
    setEditingId(null);
    setDraftName("");
  };

  const nameError = editingId
    ? validateCategoryName(draftName, categories, editingId)
    : null;

  const saveRename = async (category: Category) => {
    if (nameError) return;
    const name = normalizeCategoryName(draftName);
    // 변경 없이 저장하면 기존 이름을 유지한다.
    if (name !== category.name) await renameCategory(category.id, name);
    cancelRename();
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-10">
        <p className="text-base text-slate-deep">
          저장한 노트를 나만의 기준으로 묶어보세요
        </p>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void addCategory();
          }}
        >
          <input
            aria-label="새 킵박스 이름"
            value={newName}
            maxLength={CATEGORY_NAME_MAX}
            disabled={atMax}
            placeholder={MESSAGES.categoryNamePlaceholder}
            onChange={(event) => setNewName(event.target.value)}
            className={`min-h-12 min-w-0 flex-1 rounded-xl bg-fog px-4 text-base outline-none disabled:opacity-60 ${
              addError === "duplicate" ? "ring-2 ring-danger" : ""
            }`}
          />
          <Button
            type="submit"
            size="sm"
            className="min-h-12 rounded-xl"
            disabled={addError === "duplicate" || atMax}
          >
            추가
          </Button>
        </form>
        {addError === "duplicate" ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            {MESSAGES.categoryDuplicate}
          </p>
        ) : null}
        <p className="mt-3 flex items-center gap-1.5 pl-3 text-xs text-slate-deep">
          <Info className="size-3.5 shrink-0" aria-hidden />
          {MESSAGES.categoryTotalMax}
        </p>

        {ready && categories.length === 0 ? (
          <p className="px-2 pt-10 text-center text-sm leading-6 text-slate-deep">
            {MESSAGES.emptyCategories}
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {categories.map((category) => {
              const editing = editingId === category.id;
              return (
                <li key={category.id} className="rounded-2xl bg-fog-soft px-4 py-3">
                  {editing ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          aria-label="킵박스 이름"
                          value={draftName}
                          maxLength={CATEGORY_NAME_MAX}
                          onChange={(event) => setDraftName(event.target.value)}
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" &&
                              !event.nativeEvent.isComposing
                            ) {
                              event.preventDefault();
                              void saveRename(category);
                            } else if (event.key === "Escape") {
                              cancelRename();
                            }
                          }}
                          className={`min-h-12 min-w-0 flex-1 rounded-xl border bg-white px-4 text-base outline-none ${
                            nameError === "duplicate"
                              ? "border-danger"
                              : "border-mist focus:border-slate"
                          }`}
                        />
                        <button
                          type="button"
                          disabled={nameError !== null}
                          onClick={() => void saveRename(category)}
                          className="min-h-11 px-2 text-sm font-medium text-voltage-violet disabled:opacity-40"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={cancelRename}
                          className="min-h-11 px-2 text-sm font-medium text-graphite"
                        >
                          취소
                        </button>
                      </div>
                      {nameError === "duplicate" ? (
                        <p role="alert" className="text-sm text-danger">
                          {MESSAGES.categoryDuplicate}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="flex min-w-0 flex-1 items-baseline gap-3 pr-2">
                        <p className="min-w-0 truncate text-base font-semibold text-midnight-ink">
                          {category.name}
                        </p>
                        <p className="shrink-0 text-sm text-slate-deep">
                          {countByCategory(notes, category.id)}개
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="수정"
                        onClick={() => startRename(category)}
                        className="flex size-11 items-center justify-center rounded-full text-[#b8c0cc]"
                      >
                        <PencilIcon className="size-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="삭제"
                        onClick={() => setDeleteTarget(category)}
                        className="flex size-11 items-center justify-center rounded-full text-[#b8c0cc]"
                      >
                        <TrashIcon className="size-5" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

      </div>

      {emptyAlert ? (
        <AlertDialog
          message={MESSAGES.emptyInput}
          onConfirm={() => setEmptyAlert(false)}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          message={MESSAGES.deleteCategory}
          confirmLabel="모두 삭제"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            const target = deleteTarget;
            setDeleteTarget(null);
            // 삭제 후에도 관리 화면에 머문다.
            await deleteCategory(target.id);
          }}
        />
      ) : null}
    </div>
  );
}
