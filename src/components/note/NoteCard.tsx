"use client";

import Link from "next/link";
import { useState } from "react";
import type { Note } from "@/lib/types";
import { InstagramIcon, ThreadsIcon } from "../ui/icons";

/** 목록 행: 정사각형 썸네일, 제목 1줄, 요약 1줄 */
export function NoteCard({
  note,
  onOpen,
}: {
  note: Note;
  /** 카드를 눌러 상세로 이동할 때 호출 (검색 결과 추적용) */
  onOpen?: () => void;
}) {
  // 썸네일 주소가 만료되었거나 불러오지 못하면 출처 아이콘으로 대신한다.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = note.thumbnailUrl;
  const showImage = src !== null && src !== failedSrc;
  const SourceIcon = note.source === "Threads" ? ThreadsIcon : InstagramIcon;

  return (
    <Link
      href={`/notes/${note.id}`}
      onClick={onOpen}
      className="flex items-center gap-3 rounded-2xl bg-fog p-3 transition-colors hover:bg-fog-hover"
    >
      <div className="flex size-[61px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
        {showImage ? (
          // 원본 썸네일은 임의의 외부 도메인이라 next/image 최적화 대상이 아니다.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="size-full object-cover"
            draggable={false}
            referrerPolicy="no-referrer"
            onError={() => setFailedSrc(src)}
          />
        ) : (
          <SourceIcon className="size-7 text-[#d5dbe3]" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-bold text-midnight-ink">
          {note.title}
        </h2>
        {note.summaryLines.length > 0 ? (
          <p className="mt-0.5 truncate text-sm text-slate-deep">
            {note.summaryLines.join(" ")}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
