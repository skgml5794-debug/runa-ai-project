"use client";

import { useState } from "react";
import { ArrowUpRight, ImageIcon } from "lucide-react";
import type { KeyInfoGroup, Source } from "@/lib/types";
import { SparkleStar } from "../ui/Sparkle";

/** 정사각형 썸네일. 이미지가 없으면 중립 기본 이미지로 대체한다. */
export function Thumbnail({
  src,
  href,
  showArrow = false,
}: {
  src: string | null;
  href?: string;
  /** 원문 이동 화살표 표시 (Threads만 사용) */
  showArrow?: boolean;
}) {
  // 외부 썸네일 주소가 만료되어 불러오지 못하면 기본 이미지로 대체한다.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src !== null && src !== failedSrc;
  const box = (
    <div className="relative mx-auto flex size-36 items-center justify-center overflow-hidden rounded-2xl bg-fog">
      {showImage ? (
        // 원본 썸네일은 임의의 외부 도메인이라 next/image 최적화 대상이 아니다.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="썸네일"
          className="size-full object-cover"
          draggable={false}
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <ImageIcon className="size-12 text-slate" aria-label="썸네일 없음" />
      )}
      {href && showArrow ? (
        // 원문으로 이동함을 알리는 화살표. 배경 박스 없이 아이콘만 둔다.
        <ArrowUpRight
          aria-hidden
          strokeWidth={2.75}
          className="pointer-events-none absolute bottom-2 right-2 size-6 text-white drop-shadow-[0_1px_3px_rgba(17,24,39,0.55)]"
        />
      ) : null}
    </div>
  );
  if (!href) return box;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="원본 링크 열기"
      className="mx-auto block w-fit rounded-2xl"
    >
      {box}
    </a>
  );
}

/** 출처 앱, 작성자 ID, 저장 날짜 */
export function MetaLine({
  source,
  authorId,
  dateLabel,
}: {
  source: Source;
  authorId: string;
  dateLabel: string;
}) {
  return (
    <p className="text-center text-sm text-slate">
      {[source, authorId && authorId !== "unknown" ? `@${authorId}` : "Unknown", dateLabel].join(" · ")}
    </p>
  );
}

export function SectionTitle({
  children,
  star = false,
}: {
  children: React.ReactNode;
  /** 제목 앞에 작은 별 아이콘을 붙인다. (킵노트 상세) */
  star?: boolean;
}) {
  return (
    <h2 className="flex items-center gap-1.5 text-lg font-bold text-midnight-ink">
      {star ? <SparkleStar className="size-4 shrink-0" /> : null}
      {children}
    </h2>
  );
}

export function Bullet() {
  return (
    <span
      aria-hidden
      className="mt-[0.72em] size-[3px] shrink-0 rounded-full bg-midnight-ink"
    />
  );
}

/** 핵심 요약: 한 문단이면 그대로, 여러 줄(이전에 저장한 킵노트)이면 불릿으로 보여준다. */
export function SummaryBullets({ lines }: { lines: string[] }) {
  if (lines.length === 1) {
    return (
      <p className="whitespace-pre-line break-words text-base leading-[26px] text-midnight-ink">
        {lines[0]}
      </p>
    );
  }
  return (
    <ul className="space-y-1">
      {lines.map((line, index) => (
        <li key={index} className="flex gap-2.5 text-base leading-[26px] text-midnight-ink">
          <Bullet />
          <span className="min-w-0 whitespace-pre-line break-words">{line}</span>
        </li>
      ))}
    </ul>
  );
}

export function KeyInfoLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-graphite">
      {children}
    </span>
  );
}

/** 핵심 정보: 항목이 있는 유형만 별도 영역으로 표시하고, 전부 비어 있으면 영역 자체를 숨긴다. */
export function KeyInfoPanel({ groups }: { groups: KeyInfoGroup[] }) {
  const visible = groups.filter((group) => group.items.length > 0);
  if (visible.length === 0) return null;
  return (
    <section aria-labelledby="key-info-title" className="space-y-3">
      <h2
        id="key-info-title"
        className="flex items-center gap-1.5 text-lg font-bold text-midnight-ink"
      >
        <SparkleStar className="size-4 shrink-0" />
        핵심 정보
      </h2>
      <div className="space-y-4 rounded-2xl bg-fog p-4">
        {visible.map((group) => (
          <div key={group.label} className="space-y-2">
            <KeyInfoLabel>{group.label}</KeyInfoLabel>
            <ul className="space-y-1 pl-3">
              {group.items.map((item, index) => (
                <li
                  key={index}
                  className="flex gap-2.5 text-base leading-[26px] text-midnight-ink"
                >
                  <Bullet />
                  <span className="min-w-0 whitespace-pre-line break-words">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
