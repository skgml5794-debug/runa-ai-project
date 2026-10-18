"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { KeyInfoGroup, Source } from "@/lib/types";
import { isIOS, openPostInApp } from "@/lib/open-app";
import { InstagramIcon, ThreadsIcon } from "../ui/icons";

/** 정사각형 썸네일. 이미지가 없으면 중립 기본 이미지로 대체한다. */
export function Thumbnail({
  source,
  src,
  href,
  showArrow = false,
}: {
  /** 이미지가 없을 때 보여줄 출처 앱 아이콘 */
  source: Source;
  src: string | null;
  href?: string;
  /** 원문 이동 화살표 표시 (Threads). 이미지가 없으면 출처와 관계없이 항상 표시한다. */
  showArrow?: boolean;
}) {
  // 외부 썸네일 주소가 만료되어 불러오지 못하면 기본 이미지로 대체한다.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src !== null && src !== failedSrc;
  const SourceIcon = source === "Threads" ? ThreadsIcon : InstagramIcon;
  const box = (
    <div className="relative mx-auto flex size-36 items-center justify-center overflow-hidden rounded-[1rem] border border-[#eceff3] bg-fog">
      {showImage ? (
        // 원본 썸네일은 임의의 외부 도메인이라 next/image 최적화 대상이 아니다.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="썸네일"
          className="size-full object-cover"
          draggable={false}
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <SourceIcon
          className="size-16 text-[#d5dbe3]"
          aria-label={`${source} 아이콘`}
        />
      )}
      {href && (showArrow || !showImage) ? (
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
      // 모바일에서는 브라우저가 아니라 앱으로 바로 연다. (앱이 없으면 스토어/브라우저)
      onClick={(event) => {
        // iOS의 Threads는 게시물 전용 앱 주소가 공개돼 있지 않아서, 링크를 직접 누른 것처럼 같은 탭에서
        // 열리게 둔다. (앱이 처리하는 https 주소이고, 앱이 없으면 브라우저로 열린다.)
        if (isIOS() && source === "Threads") {
          event.currentTarget.target = "_self";
          return;
        }
        if (openPostInApp(href, source)) event.preventDefault();
      }}
      className="mx-auto block w-fit rounded-[1rem]"
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

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-1.5 text-base font-bold text-midnight-ink">
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
      <p className="whitespace-pre-line text-pretty break-keep break-words text-[15px] leading-6 text-midnight-ink">
        {lines[0]}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {lines.map((line, index) => (
        <li key={index} className="flex gap-1.5 text-[15px] leading-6 text-midnight-ink">
          <Bullet />
          <span className="min-w-0 whitespace-pre-line text-pretty break-keep break-words">{line}</span>
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
    <section aria-labelledby="key-info-title" className="space-y-2">
      <h2
        id="key-info-title"
        className="flex items-center gap-1.5 text-base font-bold text-midnight-ink"
      >
        핵심 정보
      </h2>
      <div className="space-y-4 rounded-2xl bg-fog px-5 pb-7 pt-5">
        {visible.map((group) => (
          <div key={group.label} className="space-y-3">
            <KeyInfoLabel>{group.label}</KeyInfoLabel>
            <ul className="space-y-2.5">
              {group.items.map((item, index) => (
                <li
                  key={index}
                  className="flex gap-1.5 text-[15px] leading-6 text-midnight-ink"
                >
                  <Bullet />
                  <span className="min-w-0 whitespace-pre-line text-pretty break-keep break-words">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
