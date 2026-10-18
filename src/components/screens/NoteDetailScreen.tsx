"use client";

import { ChevronLeft, Ellipsis } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";
import { categoryProp, contentType, track } from "@/lib/analytics";
import { MESSAGES } from "@/lib/constants";
import { formatDate } from "@/lib/notes";
import { SESSION_KEYS, getSession } from "@/lib/session";
import { categoryColor } from "@/lib/category-colors";
import { useKeepnote } from "../KeepnoteProvider";
import {
  KeyInfoPanel,
  MetaLine,
  SectionTitle,
  SummaryBullets,
  Thumbnail,
} from "../note/NoteBlocks";
import { StaticChip } from "../ui/Chip";
import { ConfirmDialog } from "../ui/Dialog";

/** 마지막으로 본 킵노트 목록 상태(검색·정렬·킵박스)를 포함한 주소 */
function notesListHref(): string {
  const query = getSession(SESSION_KEYS.notesQuery);
  return query ? `/notes?${query}` : "/notes";
}

export function NoteDetailScreen() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { notes, categories, ready, deleteNote } = useKeepnote();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const note = notes.find((item) => item.id === id) ?? null;

  useEffect(() => {
    if (ready && !note && !deleting) router.replace(notesListHref());
  }, [ready, note, deleting, router]);

  // 킵노트 상세를 열었을 때 한 번만 기록한다. (킵노트가 바뀔 때만 다시)
  const openedId = note?.id;
  useEffect(() => {
    if (!note) return;
    track("saved_item_opened", {
      saved_item_id: note.id,
      content_type: contentType(note.url, note.source),
      category_id: categoryProp(note.categoryIds),
    });
    // note 객체가 아니라 id가 바뀔 때만 실행한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedId]);

  // 다른 화면으로 이동해 이 화면이 숨겨질 때 메뉴를 닫는다.
  useLayoutEffect(() => {
    return () => setMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  if (!note) return null;

  const noteCategories = note.categoryIds
    .map((categoryId) => categories.find((category) => category.id === categoryId))
    .filter((category) => category !== undefined);

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between px-4 pt-6">
        <button
          type="button"
          aria-label="뒤로가기"
          onClick={() => router.push(notesListHref())}
          className="flex size-11 items-center justify-center rounded-full text-midnight-ink"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="더보기"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex size-11 items-center justify-center rounded-full text-midnight-ink"
        >
          <Ellipsis className="size-6" aria-hidden />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 pb-8 pt-2">
        <div className="mb-12 space-y-4">
          <Thumbnail
            source={note.source}
            src={note.thumbnailUrl}
            href={note.url}
            showArrow={note.source === "Threads"}
          />
          <div className="space-y-1">
            <h1 className="break-words text-center text-[26px] font-bold leading-snug tracking-[-0.01em]">
              {note.title}
            </h1>
            <MetaLine
              source={note.source}
              authorId={note.authorId}
              dateLabel={formatDate(note.createdAt)}
            />
          </div>
        </div>

        {note.summaryLines.length > 0 ? (
          <section className="space-y-2">
            <SectionTitle>AI 요약</SectionTitle>
            <SummaryBullets lines={note.summaryLines} />
          </section>
        ) : null}

        <KeyInfoPanel groups={note.keyInfo} />

        {noteCategories.length > 0 ? (
          <section className="space-y-3">
            <SectionTitle>킵박스</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {noteCategories.map((category) => (
                <StaticChip key={category.id} tone={categoryColor(categories.indexOf(category))}>
                  {category.name}
                </StaticChip>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="메뉴 닫기"
            tabIndex={-1}
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 z-10 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-4 top-[4.75rem] z-20 w-36 overflow-hidden rounded-2xl border border-mist bg-white py-1"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                router.push(`/notes/${note.id}/edit`);
              }}
              className="flex min-h-11 w-full items-center px-4 text-left text-base text-midnight-ink hover:bg-fog"
            >
              수정
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setConfirmOpen(true);
              }}
              className="flex min-h-11 w-full items-center px-4 text-left text-base text-midnight-ink hover:bg-fog"
            >
              삭제
            </button>
          </div>
        </>
      ) : null}

      {confirmOpen ? (
        <ConfirmDialog
          message={MESSAGES.deleteNote}
          confirmLabel="삭제"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={async () => {
            setConfirmOpen(false);
            setDeleting(true);
            await deleteNote(note.id);
            router.replace(notesListHref());
          }}
        />
      ) : null}
    </div>
  );
}
