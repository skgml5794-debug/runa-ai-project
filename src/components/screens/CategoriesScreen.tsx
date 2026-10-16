"use client";

import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  normalizeCategoryName,
  validateCategoryName,
} from "@/lib/categories";
import {
  CATEGORY_NAME_MAX,
  MAX_CATEGORIES,
  MESSAGES,
} from "@/lib/constants";
import { countByCategory, formatCount } from "@/lib/notes";
import type { Category } from "@/lib/types";
import { useKeepnote } from "../KeepnoteProvider";
import { Button } from "../ui/Button";
import { AlertDialog, ConfirmDialog } from "../ui/Dialog";
import { GripIcon, PencilIcon, TrashIcon } from "../ui/icons";

/** 항목 사이 간격(space-y-3)과 같은 값. 드래그 중 이웃 항목이 밀리는 거리 계산에 쓴다. */
const ITEM_GAP = 12;
const EDGE_SCROLL_ZONE = 56;

interface DragState {
  id: string;
  from: number;
  to: number;
  dy: number;
  /** 밀리는 거리(끌고 있는 항목의 높이 + 간격) */
  shift: number;
}

/** 킵박스 관리 화면. 하단 메뉴의 킵박스 탭으로 들어온다. */
export function CategoriesScreen() {
  const {
    notes,
    categories,
    ready,
    addCategories,
    renameCategory,
    deleteCategory,
    reorderCategories,
  } = useKeepnote();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [emptyAlert, setEmptyAlert] = useState(false);

  // 순서 변경(드래그 앤 드롭): 놓을 때까지 목록은 그대로 두고, 이웃 항목만 밀어서 보여준다.
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const [drag, setDrag] = useState<DragState | null>(null);
  const session = useRef<{
    from: number;
    startY: number;
    startScroll: number;
    lastY: number;
    centers: number[];
    height: number;
    frame: number;
  } | null>(null);

  const moveDrag = (clientY: number) => {
    const current = session.current;
    const scroller = scrollRef.current;
    if (!current || !scroller) return;
    current.lastY = clientY;
    const dy = clientY - current.startY + (scroller.scrollTop - current.startScroll);
    const center = current.centers[current.from] + dy;
    const to = current.centers.filter(
      (value, index) => index !== current.from && value < center,
    ).length;
    setDrag((previous) =>
      previous
        ? { ...previous, dy, to }
        : previous,
    );
  };

  const stopDrag = () => {
    if (session.current) cancelAnimationFrame(session.current.frame);
    session.current = null;
  };

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>, index: number) => {
    const scroller = scrollRef.current;
    if (!scroller || session.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rects = categories.map((category) =>
      itemRefs.current.get(category.id)?.getBoundingClientRect(),
    );
    if (rects.some((rect) => !rect)) return;
    const base = scroller.scrollTop;
    const centers = rects.map((rect) => rect!.top + base + rect!.height / 2);
    const height = rects[index]!.height;
    const scrollBox = scroller.getBoundingClientRect();
    const current = {
      from: index,
      startY: event.clientY,
      startScroll: base,
      lastY: event.clientY,
      centers,
      height,
      frame: 0,
    };
    session.current = current;
    setDrag({ id: categories[index].id, from: index, to: index, dy: 0, shift: height + ITEM_GAP });
    // 가장자리로 끌면 목록이 스크롤된다.
    const tick = () => {
      if (session.current !== current) return;
      if (current.lastY < scrollBox.top + EDGE_SCROLL_ZONE) scroller.scrollTop -= 8;
      else if (current.lastY > scrollBox.bottom - EDGE_SCROLL_ZONE) scroller.scrollTop += 8;
      moveDrag(current.lastY);
      current.frame = requestAnimationFrame(tick);
    };
    current.frame = requestAnimationFrame(tick);
  };

  const finishDrag = async (commit: boolean) => {
    const state = drag;
    stopDrag();
    setDrag(null);
    if (!commit || !state || state.from === state.to) return;
    const ids = categories.map((category) => category.id);
    const [moved] = ids.splice(state.from, 1);
    ids.splice(state.to, 0, moved);
    await reorderCategories(ids);
  };

  // 키보드로도 순서를 바꿀 수 있다. (핸들에서 위/아래 화살표)
  const moveByKey = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= categories.length) return;
    const ids = categories.map((category) => category.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(target, 0, moved);
    await reorderCategories(ids);
  };

  useEffect(() => stopDrag, []);

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
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-10">
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
            {categories.map((category, index) => {
              const editing = editingId === category.id;
              const dragged = drag?.id === category.id;
              let offset = 0;
              if (drag && dragged) offset = drag.dy;
              else if (drag && drag.from < drag.to && index > drag.from && index <= drag.to)
                offset = -drag.shift;
              else if (drag && drag.from > drag.to && index < drag.from && index >= drag.to)
                offset = drag.shift;
              return (
                <li
                  key={category.id}
                  ref={(element) => {
                    if (element) itemRefs.current.set(category.id, element);
                    else itemRefs.current.delete(category.id);
                  }}
                  style={drag ? { transform: `translateY(${offset}px)` } : undefined}
                  className={`relative rounded-2xl bg-fog-soft px-4 py-3 ${
                    dragged ? "z-10 shadow-[0_10px_24px_rgba(31,41,55,0.2)]" : drag ? "transition-transform duration-150" : ""
                  }`}
                >
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
                          {formatCount(countByCategory(notes, category.id))}개
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
                      <button
                        type="button"
                        aria-label={`${category.name} 순서 변경`}
                        onPointerDown={(event) => startDrag(event, index)}
                        onPointerMove={(event) => drag && moveDrag(event.clientY)}
                        onPointerUp={() => void finishDrag(true)}
                        onPointerCancel={() => void finishDrag(false)}
                        onKeyDown={(event) => {
                          if (event.key === "ArrowUp") {
                            event.preventDefault();
                            void moveByKey(index, -1);
                          } else if (event.key === "ArrowDown") {
                            event.preventDefault();
                            void moveByKey(index, 1);
                          }
                        }}
                        className={`flex size-11 touch-none select-none items-center justify-center rounded-full text-[#b8c0cc] ${
                          dragged ? "cursor-grabbing" : "cursor-grab"
                        }`}
                      >
                        <GripIcon className="size-5" />
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
          confirmLabel="삭제"
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
