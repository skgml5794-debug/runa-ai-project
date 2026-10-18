"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import { remapCategoryIds } from "@/lib/categories";
import { formatDate } from "@/lib/notes";
import { useKeepnote } from "../KeepnoteProvider";
import { SummaryEditor } from "../note/SummaryEditor";

/** 저장된 킵노트의 수정 화면. 새 요약 결과 화면과 같은 편집기를 쓴다. */
export function NoteEditScreen() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { notes, ready, updateNote, addCategories } = useKeepnote();
  const leaving = useRef(false);

  const note = notes.find((item) => item.id === id) ?? null;

  useEffect(() => {
    if (ready && !note && !leaving.current) router.replace("/notes");
  }, [ready, note, router]);

  if (!note) return null;

  const backToDetail = () => {
    leaving.current = true;
    router.replace(`/notes/${note.id}`);
  };

  return (
    <SummaryEditor
      initial={{
        url: note.url,
        thumbnailUrl: note.thumbnailUrl,
        source: note.source,
        authorId: note.authorId,
        // 수정해도 최초 저장 날짜를 유지한다.
        dateLabel: formatDate(note.createdAt),
        title: note.title,
        summaryLines: note.summaryLines,
        keyInfo: note.keyInfo,
        categoryIds: note.categoryIds,
      }}
      onSave={async (values, pending) => {
        const created = await addCategories(pending.map((item) => item.name));
        const categoryIds = remapCategoryIds(values.categoryIds, pending, created);
        await updateNote(note.id, {
          title: values.title,
          summaryLines: values.summaryLines,
          keyInfo: values.keyInfo,
          categoryIds,
        });
        created.forEach((category) =>
          track("category_created", {
            category_id: category.id,
            category_name_length: category.name.length,
            from_flow: "from_item_detail",
          }),
        );
        // 이번 수정에서 새로 선택된 킵박스만 기록한다.
        categoryIds
          .filter((id) => !note.categoryIds.includes(id))
          .forEach((id) =>
            track("category_selected", {
              category_id: id,
              selection_context: "edit_item",
              previous_category_id: "none",
            }),
          );
        backToDetail();
      }}
      onClose={backToDetail}
    />
  );
}
