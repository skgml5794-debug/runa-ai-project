"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { categoryProp, contentType, track } from "@/lib/analytics";
import { remapCategoryIds } from "@/lib/categories";
import { MESSAGES } from "@/lib/constants";
import { formatDate } from "@/lib/notes";
import {
  SESSION_KEYS,
  clearDraftSession,
  parseDraft,
  useHydrated,
  useSessionValue,
  writeDraft,
} from "@/lib/session";
import { useKeepnote } from "../KeepnoteProvider";
import { SummaryEditor } from "../note/SummaryEditor";
import { useToast } from "../ui/Toast";

/** 저장 전 새 요약 결과 화면. 새로고침해도 요약 결과는 유지한다. */
export function SummaryScreen() {
  const router = useRouter();
  const toast = useToast();
  const { addNote, addCategories } = useKeepnote();
  const hydrated = useHydrated();
  const raw = useSessionValue(SESSION_KEYS.draft);
  const draft = useMemo(() => parseDraft(raw), [raw]);
  const leaving = useRef(false);

  useEffect(() => {
    if (hydrated && !draft && !leaving.current) router.replace("/");
  }, [hydrated, draft, router]);

  // 이 화면을 벗어나면(저장, 닫기, 다른 화면으로 이동) 요약 완료 토스트도 닫는다.
  useLayoutEffect(() => {
    return () => toast.dismiss();
  }, [toast]);

  useEffect(() => {
    if (!draft?.showToast) return;
    toast.show(MESSAGES.summaryDone);
    writeDraft({ ...draft, showToast: false });
  }, [draft, toast]);

  if (!draft) return null;
  const { result } = draft;

  return (
    <SummaryEditor
      firstSummary
      initial={{
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        source: result.source,
        authorId: result.authorId,
        // 저장 전이므로 오늘 날짜(저장 예정일)를 표시한다.
        dateLabel: formatDate(new Date().toISOString()),
        title: result.title,
        summaryLines: result.summaryLines,
        keyInfo: result.keyInfo,
        categoryIds: [],
      }}
      onSave={async (values, pending) => {
        const created = await addCategories(pending.map((item) => item.name));
        const categoryIds = remapCategoryIds(values.categoryIds, pending, created);
        await addNote({
          ...result,
          title: values.title,
          summaryLines: values.summaryLines,
          keyInfo: values.keyInfo,
          categoryIds,
        });
        created.forEach((category) =>
          track("category_created", {
            category_id: category.id,
            category_name_length: category.name.length,
            from_flow: "on_submit",
          }),
        );
        categoryIds.forEach((id) =>
          track("category_selected", {
            category_id: id,
            selection_context: "on_submit",
            previous_category_id: "none",
          }),
        );
        track("save_confirmed", {
          save_method: "standard",
          category_id: categoryProp(categoryIds),
          content_type: contentType(result.url, result.source),
        });
        leaving.current = true;
        clearDraftSession();
        router.replace("/notes");
      }}
      onClose={() => {
        leaving.current = true;
        clearDraftSession();
        router.replace("/");
      }}
    />
  );
}
