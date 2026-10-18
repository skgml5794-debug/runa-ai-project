import Link from "next/link";
import { formatDate } from "@/lib/notes";
import type { Category, Note } from "@/lib/types";
import { Tag } from "../ui/Chip";

/** 목록 카드: 제목, 요약(2줄), 킵박스, 저장 날짜 */
export function NoteCard({
  note,
  categories,
  onOpen,
}: {
  note: Note;
  categories: readonly Category[];
  /** 카드를 눌러 상세로 이동할 때 호출 (검색 결과 추적용) */
  onOpen?: () => void;
}) {
  const tags = note.categoryIds
    .map((id) => categories.find((category) => category.id === id))
    .filter((category): category is Category => Boolean(category));

  return (
    <Link
      href={`/notes/${note.id}`}
      onClick={onOpen}
      className="block rounded-2xl bg-fog px-8 pb-5 pt-6 transition-colors hover:bg-fog-hover"
    >
      <h2 className="truncate text-base font-bold text-midnight-ink">
        {note.title}
      </h2>
      {note.summaryLines.length > 0 ? (
        <p className="mt-1.5 line-clamp-2 break-words text-sm leading-6 text-graphite">
          {note.summaryLines.join(" ")}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {tags.map((category) => (
          <Tag key={category.id} className="bg-white">
            {category.name}
          </Tag>
        ))}
        <p className="shrink-0 text-xs text-slate-deep">
          {formatDate(note.createdAt)}
        </p>
      </div>
    </Link>
  );
}
