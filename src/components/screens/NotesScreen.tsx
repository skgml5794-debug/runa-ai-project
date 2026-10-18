"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HomeLogoLink } from "../ui/Logo";
import { categoryProp, track } from "@/lib/analytics";
import { categoryColor } from "@/lib/category-colors";
import { MESSAGES } from "@/lib/constants";
import {
  UNCATEGORIZED_ID,
  countByCategory,
  countUncategorized,
  filterAndSortNotes,
  formatCount,
  matchesQuery,
  type SortOrder,
} from "@/lib/notes";
import { SESSION_KEYS, setSession } from "@/lib/session";
import { useKeepnote } from "../KeepnoteProvider";
import { NoteCard } from "../note/NoteCard";
import { Chip } from "../ui/Chip";

/**
 * 킵노트 화면. 검색어·정렬·선택한 카테고리는 URL 쿼리에 보관해
 * 상세에서 돌아오거나 카테고리 관리 화면에서 돌아와도 유지된다.
 */
const PAGE_SIZE = 15;

export function NotesScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notes, categories, ready } = useKeepnote();

  const query = searchParams.get("q") ?? "";
  const sort: SortOrder =
    searchParams.get("sort") === "oldest" ? "oldest" : "newest";
  const categoryParam = searchParams.get("category");
  // 미분류는 해당하는 킵노트가 있을 때만 선택할 수 있다.
  const uncategorizedActive =
    categoryParam === UNCATEGORIZED_ID && countUncategorized(notes) > 0;
  // 칩의 개수는 검색어와 일치하는 킵노트만 센다.
  const matchedNotes = notes.filter((note) => matchesQuery(note, query));
  const activeCategory =
    categories.find((category) => category.id === categoryParam) ?? null;

  // 입력 중인 검색어(text)와 실제로 적용된 검색어(query, 주소의 q)를 분리한다. Enter를 눌러야 적용된다.
  const [text, setText] = useState(query);

  const updateParams = (changes: Record<string, string | null>) => {
    // 입력 지연 중에도 최신 URL을 기준으로 바꾼다.
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    const queryString = next.toString();
    router.replace(queryString ? `/notes?${queryString}` : "/notes", {
      scroll: false,
    });
  };

  // 모바일은 문서가 스크롤되므로, 상세에서 브라우저 뒤로가기로 돌아오면 보던 위치로 되돌린다.
  // (숨겨진 화면은 상태를 보존하므로 ref 값이 남고, 다시 보일 때 이 효과가 한 번 더 실행된다.)
  const savedScroll = useRef<number | null>(null);
  const shownBefore = useRef(false);
  useEffect(() => {
    if (shownBefore.current && savedScroll.current !== null) {
      const top = savedScroll.current;
      // 이동 직후 화면이 맨 위로 올라가는 동작이 끝난 뒤에 복원한다.
      const timer = window.setTimeout(() => window.scrollTo(0, top), 50);
      return () => window.clearTimeout(timer);
    }
    shownBefore.current = true;
  }, []);

  // 아래로 스크롤하면 상단(로고·검색)을 접고, 위로 스크롤하면 다시 보여준다.
  const collapseRef = useRef<HTMLDivElement>(null);
  const [collapseHeight, setCollapseHeight] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const element = collapseRef.current;
    if (!element) return;
    const measure = () => setCollapseHeight(element.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      if (y <= 8) setCollapsed(false);
      else if (delta > 6) setCollapsed(true);
      else if (delta < -6) setCollapsed(false);
      if (Math.abs(delta) > 6) lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // 마지막 목록 상태를 기억해 상세의 `목록으로`에서 복원한다.
  useEffect(() => {
    setSession(SESSION_KEYS.notesQuery, searchParams.toString());
  }, [searchParams]);

  // 삭제되어 없는 카테고리가 선택된 상태면 `전체`로 되돌린다.
  useEffect(() => {
    if (ready && categoryParam && !activeCategory && !uncategorizedActive) {
      const next = new URLSearchParams(window.location.search);
      next.delete("category");
      const queryString = next.toString();
      router.replace(queryString ? `/notes?${queryString}` : "/notes", {
        scroll: false,
      });
    }
  }, [ready, categoryParam, activeCategory, uncategorizedActive, router]);

  const applySearch = () => {
    // 검색어를 입력하고 Enter를 눌렀을 때만 기록한다. (검색어를 지우는 경우는 제외)
    if (text.trim() !== "") {
      track("search_performed", {
        query: text.trim(),
        search_mode: activeCategory || uncategorizedActive ? "category_filter" : "keyword_only",
        results_limit: PAGE_SIZE,
      });
    }
    updateParams({ q: text.trim() === "" ? null : text });
  };

  const visibleNotes = ready
    ? filterAndSortNotes(notes, {
        query,
        categoryId: uncategorizedActive ? UNCATEGORIZED_ID : (activeCategory?.id ?? null),
        sort,
      })
    : [];

  // 한 번에 15개씩 보여주고, 아래로 스크롤하면 15개를 더 불러온다. 검색·정렬·카테고리가 바뀌면 처음부터.
  const filterKey = `${query}|${sort}|${categoryParam ?? ""}`;
  const [paging, setPaging] = useState({ key: filterKey, limit: PAGE_SIZE });
  if (paging.key !== filterKey) setPaging({ key: filterKey, limit: PAGE_SIZE });
  const limit = paging.key === filterKey ? paging.limit : PAGE_SIZE;
  const shownNotes = visibleNotes.slice(0, limit);
  const hasMore = visibleNotes.length > limit;
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = sentinel.current;
    if (!hasMore || !target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setPaging({ key: filterKey, limit: limit + PAGE_SIZE });
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, limit, filterKey]);

  let emptyMessage: string | null = null;
  if (ready && visibleNotes.length === 0) {
    if (query.trim() !== "") emptyMessage = MESSAGES.noResults;
    else if (notes.length === 0) emptyMessage = MESSAGES.emptyNotes;
    else if (activeCategory || uncategorizedActive) emptyMessage = MESSAGES.emptyCategoryNotes;
    else emptyMessage = MESSAGES.emptyNotes;
  }

  // 카테고리 칩은 선택된 것만 고유 색, 나머지는 연한 회색 라인으로 보여준다. (전체를 골라도 동일)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="sticky z-10 shrink-0 bg-white px-5 pb-3 transition-[top] duration-200"
        // 아래로 스크롤하면 로고·검색 영역이 위로 접히고 카테고리만 남는다. (모바일 문서 스크롤 기준)
        style={{ top: collapsed ? -Math.max(collapseHeight - 8, 0) : 0 }}
      >
        <div ref={collapseRef} className="space-y-3 pb-3.5 pt-6">
        <HomeLogoLink />
        <div className="flex items-center gap-2">
          <label className="flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[#e3e7ed] bg-white px-4">
            <Search className="size-5 shrink-0 text-placeholder" aria-hidden />
            <input
              type="search"
              aria-label="킵노트 검색"
              value={text}
              placeholder={
                activeCategory
                  ? MESSAGES.searchPlaceholderInCategory
                  : MESSAGES.searchPlaceholder
              }
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                // 한글 조합 중에 누른 Enter(조합 확정)는 검색으로 보지 않는다.
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  applySearch();
                }
              }}
              className="min-w-0 flex-1 bg-transparent text-base outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {text !== "" ? (
              <button
                type="button"
                aria-label="검색어 지우기"
                // 입력창의 포커스를 잃지 않게 한다.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setText("");
                  updateParams({ q: null });
                }}
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#c9cfd9] text-white"
              >
                <X className="size-3" strokeWidth={3} aria-hidden />
              </button>
            ) : null}
          </label>
        </div>

        </div>

        <section aria-label="카테고리">
          <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5">
            <Chip
              compact
              selected={activeCategory === null && !uncategorizedActive}
              onClick={() => updateParams({ category: null })}
            >
              전체 {matchedNotes.length}
            </Chip>
            {categories.map((category, index) => (
              <Chip
                compact
                key={category.id}
                tone={categoryColor(index)}
                outline
                selected={activeCategory?.id === category.id}
                onClick={() => {
                  track("category_selected", {
                    category_id: category.id,
                    selection_context: "filter_category",
                    previous_category_id:
                      activeCategory?.id ?? (uncategorizedActive ? UNCATEGORIZED_ID : "none"),
                  });
                  updateParams({ category: category.id });
                }}
              >
                {category.name} {formatCount(countByCategory(matchedNotes, category.id))}
              </Chip>
            ))}
            {countUncategorized(notes) > 0 ? (
              <Chip
                compact
                selected={uncategorizedActive}
                onClick={() => {
                  track("category_selected", {
                    category_id: UNCATEGORIZED_ID,
                    selection_context: "filter_category",
                    previous_category_id: activeCategory?.id ?? "none",
                  });
                  updateParams({ category: UNCATEGORIZED_ID });
                }}
              >
                미분류 {formatCount(countUncategorized(matchedNotes))}
              </Chip>
            ) : null}
          </div>
        </section>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-1">
        {emptyMessage ? (
          <p className="px-2 pt-12 text-center text-sm leading-6 text-slate-deep">
            {emptyMessage}
          </p>
        ) : (
          <ul
            className="space-y-2"
            onClickCapture={() => {
              savedScroll.current = window.scrollY;
            }}
          >
            {shownNotes.map((note, index) => (
              <li key={note.id}>
                <NoteCard
                  note={note}
                  onOpen={
                    query.trim() === ""
                      ? undefined
                      : () =>
                          track("search_result_opened", {
                            saved_item_id: note.id,
                            rank_position: index + 1,
                            category_id: categoryProp(note.categoryIds),
                          })
                  }
                />
              </li>
            ))}
          </ul>
        )}
        {hasMore ? <div ref={sentinel} aria-hidden className="h-px" /> : null}
      </div>
    </div>
  );
}
