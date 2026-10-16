"use client";

import { ArrowDownWideNarrow, ArrowUpNarrowWide, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
 * 킵노트 화면. 검색어·정렬·선택한 킵박스는 URL 쿼리에 보관해
 * 상세에서 돌아오거나 킵박스 관리 화면에서 돌아와도 유지된다.
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

  // 마지막 목록 상태를 기억해 상세의 `목록으로`에서 복원한다.
  useEffect(() => {
    setSession(SESSION_KEYS.notesQuery, searchParams.toString());
  }, [searchParams]);

  // 삭제되어 없는 킵박스가 선택된 상태면 `전체`로 되돌린다.
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

  const applySearch = () =>
    updateParams({ q: text.trim() === "" ? null : text });

  const visibleNotes = ready
    ? filterAndSortNotes(notes, {
        query,
        categoryId: uncategorizedActive ? UNCATEGORIZED_ID : (activeCategory?.id ?? null),
        sort,
      })
    : [];

  // 한 번에 15개씩 보여주고, 아래로 스크롤하면 15개를 더 불러온다. 검색·정렬·킵박스가 바뀌면 처음부터.
  const filterKey = `${query}|${sort}|${categoryParam ?? ""}`;
  const [paging, setPaging] = useState({ key: filterKey, limit: PAGE_SIZE });
  if (paging.key !== filterKey) setPaging({ key: filterKey, limit: PAGE_SIZE });
  const limit = paging.key === filterKey ? paging.limit : PAGE_SIZE;
  const shownNotes = visibleNotes.slice(0, limit);
  const hasMore = visibleNotes.length > limit;
  const scrollRoot = useRef<HTMLDivElement>(null);
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
      { root: scrollRoot.current, rootMargin: "120px" },
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

  // 킵박스 칩 하나가 선택되면 나머지 킵박스 칩은 라인 형태로 바뀐다. (전체는 그대로)
  const filterActive = activeCategory !== null || uncategorizedActive;
  const SortIcon = sort === "newest" ? ArrowDownWideNarrow : ArrowUpNarrowWide;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-4 bg-white px-6 pb-3 pt-10">
        <p className="text-base text-slate-deep">
          필요한 정보만 모아두고, 언제든 다시 찾아보세요
        </p>
        <div className="flex items-center gap-2">
          <label className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-xl bg-fog-soft px-4">
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
          </label>
          <button
            type="button"
            aria-label={
              sort === "newest"
                ? "최신순 정렬 (눌러서 과거순으로 변경)"
                : "과거순 정렬 (눌러서 최신순으로 변경)"
            }
            onClick={() =>
              updateParams({ sort: sort === "newest" ? "oldest" : null })
            }
            className="flex size-12 shrink-0 items-center justify-center rounded-xl text-placeholder"
          >
            <SortIcon className="size-6" aria-hidden />
          </button>
        </div>

        <section aria-label="킵박스" className="space-y-1">
          <div aria-hidden className="h-2.5" />
          <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6">
            <Chip
              selected={activeCategory === null && !uncategorizedActive}
              onClick={() => updateParams({ category: null })}
            >
              전체 {matchedNotes.length}
            </Chip>
            {categories.map((category, index) => (
              <Chip
                key={category.id}
                tone={categoryColor(index)}
                outline={filterActive}
                selected={activeCategory?.id === category.id}
                onClick={() => updateParams({ category: category.id })}
              >
                {category.name} {formatCount(countByCategory(matchedNotes, category.id))}
              </Chip>
            ))}
            {countUncategorized(notes) > 0 ? (
              <Chip
                selected={uncategorizedActive}
                onClick={() => updateParams({ category: UNCATEGORIZED_ID })}
              >
                미분류 {formatCount(countUncategorized(matchedNotes))}
              </Chip>
            ) : null}
          </div>
        </section>
      </div>

      <div ref={scrollRoot} className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-1">
        {emptyMessage ? (
          <p className="px-2 pt-12 text-center text-sm leading-6 text-slate-deep">
            {emptyMessage}
          </p>
        ) : (
          <ul className="space-y-3">
            {shownNotes.map((note) => (
              <li key={note.id}>
                <NoteCard note={note} categories={categories} />
              </li>
            ))}
          </ul>
        )}
        {hasMore ? <div ref={sentinel} aria-hidden className="h-px" /> : null}
      </div>
    </div>
  );
}
