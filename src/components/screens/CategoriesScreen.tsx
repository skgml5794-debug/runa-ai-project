"use client";

import { EmptyText } from "../ui/EmptyText";
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
import { trackBoth } from "@/lib/analytics";
import { countByCategory, formatCount } from "@/lib/notes";
import type { Category } from "@/lib/types";
import { useKeepnote } from "../KeepnoteProvider";
import { Button } from "../ui/Button";
import { FIELD_LINE } from "../ui/field";
import { AlertDialog, ConfirmDialog } from "../ui/Dialog";
import { GripIcon, PencilIcon, TrashIcon } from "../ui/icons";

/** 카테고리가 없을 때 보여주는 예시. 누르면 입력창에 채워진다. */
const SUGGESTED_CATEGORIES = ["제품정보", "11월 후쿠오카 여행", "청모장소", "분위기 좋은 카페", "맛집추천", "스킨케어"];
/** 카테고리 고유 색(CATEGORY_COLORS)을 연하게 만든 배경색. 연두는 미색에 가깝게 쓴다. */
const SUGGESTED_TINTS = ["#e8dcf5", "#dff3e6", "#dde9fb", "#fde6dc", "#f8fadc", "#e8dcf5"];

/** 항목 사이 간격(space-y-3)과 같은 값. 드래그 중 이웃 항목이 밀리는 거리 계산에 쓴다. */
const ITEM_GAP = 8;
const EDGE_SCROLL_ZONE = 56;

interface DragState {
  id: string;
  from: number;
  to: number;
  dy: number;
  /** 밀리는 거리(끌고 있는 항목의 높이 + 간격) */
  shift: number;
}

/** 카테고리 관리 화면. 하단 메뉴의 카테고리 탭으로 들어온다. */
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
    const dy = clientY - current.startY + (scroller.scrollTop + window.scrollY - current.startScroll);
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
    // 데스크톱은 목록 영역이, 모바일은 문서(페이지)가 스크롤되므로 둘을 합쳐서 계산한다.
    const base = scroller.scrollTop + window.scrollY;
    const centers = rects.map((rect) => rect!.top + base + rect!.height / 2);
    const height = rects[index]!.height;
    const box = scroller.getBoundingClientRect();
    const scrollBox = { top: Math.max(box.top, 0), bottom: Math.min(box.bottom, window.innerHeight) };
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
      const step =
        current.lastY < scrollBox.top + EDGE_SCROLL_ZONE
          ? -8
          : current.lastY > scrollBox.bottom - EDGE_SCROLL_ZONE
            ? 8
            : 0;
      if (step !== 0) {
        if (scroller.scrollHeight > scroller.clientHeight + 1) scroller.scrollTop += step;
        else window.scrollBy(0, step);
      }
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
    const [created] = await addCategories([newName]);
    if (created) {
      trackBoth("Category Created", {
        category_id: created.id,
        category_name_length: created.name.length,
        from_flow: "from_categories_page",
      });
    }
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
    <div className="relative flex h-full min-h-0 flex-col bg-white">
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6 pt-5">
        <form
          className="flex gap-2"
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
            className={`min-h-14 min-w-0 flex-1 rounded-2xl border px-4 text-base outline-none disabled:opacity-60 ${FIELD_LINE} ${
              addError === "duplicate" ? "ring-2 ring-danger" : ""
            }`}
          />
          <Button
            type="submit"
            size="sm"
            className="min-h-14 rounded-2xl"
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
        <p className="mt-3 flex items-center gap-1.5 pl-3 text-xs text-[#94a3b8]">
          <Info className="size-3.5 shrink-0" aria-hidden />
          {MESSAGES.categoryTotalMax}
        </p>

        {ready && categories.length === 0 ? (
          <>
            <div className="flex-1" />
            {/* 킵노트·카테고리 빈 화면의 문구는 같은 위치(화면 가운데)에 둔다. */}
            <p className="pointer-events-none absolute inset-x-0 top-[42%] -translate-y-1/2 whitespace-pre-line px-7 text-center text-base leading-6 text-slate-deep">
              <EmptyText message={MESSAGES.emptyCategories} />
            </p>
            <section aria-label="추천 킵박스">
              <h2 className="text-base font-bold text-midnight-ink">추천 킵박스</h2>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {SUGGESTED_CATEGORIES.map((name, index) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => setNewName(name)}
                      style={{ backgroundColor: SUGGESTED_TINTS[index % SUGGESTED_TINTS.length] }}
                      className="min-h-9 rounded-full px-4 text-sm text-graphite"
                    >
                      {name}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <ul className="mt-6 space-y-2">
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
                  className={`relative rounded-2xl bg-[#f1f5f9] px-4 py-3 ${
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
                          className={`min-h-14 min-w-0 flex-1 rounded-2xl border px-4 text-base outline-none ${
                            nameError === "duplicate" ? "border-danger bg-white" : FIELD_LINE
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
                    <div className="flex items-center">
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
                        className="flex size-9 items-center justify-center rounded-full text-[#aab6c5]"
                      >
                        <PencilIcon className="size-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="삭제"
                        onClick={() => setDeleteTarget(category)}
                        className="flex size-9 items-center justify-center rounded-full text-[#aab6c5]"
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
                        className={`flex size-9 touch-none select-none items-center justify-center rounded-full text-[#aab6c5] ${
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
