import Link from "next/link";
import { categoryColor } from "@/lib/category-colors";
import { formatDate } from "@/lib/notes";
import type { Category, Note } from "@/lib/types";
import { Tag } from "../ui/Chip";

/** 목록 카드: 제목, 요약(2줄), 킵박스, 저장 날짜 */
export function NoteCard({
  note,
  categories,
}: {
  note: Note;
  categories: readonly Category[];
}) {
  const tags = note.categoryIds
    .map((id) => categories.find((category) => category.id === id))
    .filter((category): category is Category => Boolean(category));

  return (
    <Link
      href={`/notes/${note.id}`}
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
          <Tag
            key={category.id}
            style={{
              backgroundColor: categoryColor(categories.indexOf(category)).background,
              color: categoryColor(categories.indexOf(category)).text,
            }}
          >
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
