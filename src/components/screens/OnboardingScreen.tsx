"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { track, trackBoth } from "@/lib/analytics";
import { completeOnboarding, useOnboarded } from "@/lib/onboarding";
import { Button } from "../ui/Button";
import { CheckIcon, CrossIcon, InstagramIcon, ThreadsIcon, TriangleIcon } from "../ui/icons";
import { Sparkle } from "../ui/Sparkle";

/** Instagram 로고 그라데이션 정의. 로고에 style={{ fill: "url(#ig-gradient)" }}로 쓴다. */
function BrandGradients() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        <linearGradient id="ig-gradient" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#feda75" />
          <stop offset="0.3" stopColor="#fa7e1e" />
          <stop offset="0.55" stopColor="#d62976" />
          <stop offset="0.8" stopColor="#962fbf" />
          <stop offset="1" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** 채워진(솔리드) 기본 이미지 아이콘. 박스 모양 자체가 아이콘이다. */
function SolidImageIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm1.6 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5.2 18.4l4-4.6 2.9 3.2 2.2-2.4 4.5 3.8z"
      />
    </svg>
  );
}

/** 흐릿하게 보이는 자리표시 줄 */
function Bar({ className = "" }: { className?: string }) {
  return <div className={`h-[7px] rounded-full bg-[#e6eaf0] ${className}`} />;
}

/** 강조 카드. 테두리 없이 그림자로만 구분한다. */
function Focus({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white px-5 pb-6 pt-4 shadow-[0_8px_24px_rgba(31,41,55,0.12)]">
      {children}
    </div>
  );
}

/** 링크처럼 보이는 자리표시 줄 */
function LinkRow({ icon, text, tint }: { icon: ReactNode; text: string; tint: string }) {
  return (
    <div className="flex w-full items-center gap-3 rounded-2xl px-4 py-3" style={{ background: tint }}>
      {icon}
      <p className="min-w-0 truncate text-xs text-[#6b7589]">{text}</p>
    </div>
  );
}

/** 1장: 링크가 핵심 요약으로 바뀐다. */
function LinkToSummary() {
  return (
    <div className="mx-auto -mt-2 flex w-full max-w-[300px] flex-col items-center gap-3">
      <BrandGradients />
      <div className="flex w-[84%] flex-col gap-2">
        <LinkRow
          icon={<InstagramIcon className="size-5 shrink-0" style={{ fill: "url(#ig-gradient)" }} aria-hidden />}
          text="instagram.com/p/Cx9aB2dKe1/"
          tint="#fcf0f5"
        />
        <LinkRow
          icon={<ThreadsIcon className="size-5 shrink-0 text-black" aria-hidden />}
          text="threads.com/@keepnote/post/DAq7Lm3"
          tint="#e3e6eb"
        />
      </div>
      <svg viewBox="0 0 28 30" className="h-7 w-[26px] text-[#c9cfd9]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {/* 오른쪽으로 부드럽게 휘어 아래로 내려오는 화살표 */}
        <path d="M10 3Q22 12 14 25" />
        <path d="M20.6 22.6L14 25L15.2 18.1" />
      </svg>
      <div className="w-[92%]">
        <Focus>
          <div className="flex items-center gap-1.5">
            <Sparkle className="size-[18px] shrink-0 translate-y-px" />
            <p className="text-sm font-semibold leading-none tracking-[-0.03em] text-midnight-ink">AI 요약</p>
          </div>
          <div className="mt-3 space-y-2.5">
            {["w-full", "w-11/12", "w-2/3"].map((width) => (
              <div key={width} className="flex items-center gap-1.5">
                {/* 불릿을 요약 아이콘과 같은 세로선(가운데)에 맞춘다. */}
                <span className="flex w-[18px] shrink-0 justify-center">
                  <span className="size-1 rounded-full bg-[#e6eaf0]" />
                </span>
                <Bar className={width} />
              </div>
            ))}
          </div>
        </Focus>
      </div>
    </div>
  );
}

/**
 * 아래로 갈수록 작고 연해지는 카드. 위 카드가 아래 카드를 살짝 덮도록 불투명하게 그린다.
 * level 0이 가장 진하고 크다.
 */
const CARD_LEVELS = [
  { width: "w-full", bg: "bg-white", text: "opacity-100", shadow: "shadow-[0_8px_24px_rgba(31,41,55,0.14)]" },
  { width: "w-[94%]", bg: "bg-[#fbfcfd]", text: "opacity-70", shadow: "shadow-[0_6px_18px_rgba(31,41,55,0.10)]" },
  { width: "w-[88%]", bg: "bg-[#f8f9fb]", text: "opacity-45", shadow: "shadow-[0_4px_12px_rgba(31,41,55,0.07)]" },
] as const;

function LevelCard({ level, children }: { level: 0 | 1 | 2; children: ReactNode }) {
  const style = CARD_LEVELS[level];
  return (
    <div
      className={`relative mx-auto rounded-2xl px-6 py-4 ${style.width} ${style.bg} ${style.shadow} ${level > 0 ? "-mt-3 pt-6" : ""}`}
      style={{ zIndex: 30 - level * 10 }}
    >
      <div className={style.text}>{children}</div>
    </div>
  );
}

/** 2장: 본문에 정보가 있다면 더 정확하게 저장할 수 있다. */
function TextOnly() {
  return (
    <div className="mx-auto -mt-2 flex w-full max-w-[310px] flex-col">
      <LevelCard level={0}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-semibold tracking-[-0.03em] text-midnight-ink">본문에 글이 있는 게시물</p>
            <Bar className="w-[78%]" />
            <Bar className="w-[56%]" />
          </div>
          <CheckIcon className="size-6 shrink-0 text-[#34b27b]" />
        </div>
      </LevelCard>
      <LevelCard level={1}>
        <div className="flex items-center justify-between gap-3">
          <div className="-ml-1 flex min-w-0 flex-1 items-center gap-1.5">
            <SolidImageIcon className="size-5 shrink-0 text-[#dfe4ec]" />
            <p className="min-w-0 truncate whitespace-nowrap text-sm font-normal tracking-[-0.03em] text-slate-deep">영상에 내용이 포함된 게시물</p>
          </div>
          <TriangleIcon className="size-6 shrink-0 text-[#c9cfd9]" />
        </div>
      </LevelCard>
      <LevelCard level={2}>
        <div className="flex items-center justify-between gap-3">
          <div className="-ml-1 flex min-w-0 flex-1 items-center gap-1.5">
            <SolidImageIcon className="size-5 shrink-0 text-[#dfe4ec]" />
            <p className="min-w-0 truncate whitespace-nowrap text-sm font-normal tracking-[-0.03em] text-slate-deep">댓글에 내용이 포함된 게시물</p>
          </div>
          <CrossIcon className="size-6 shrink-0 text-[#c9cfd9]" />
        </div>
      </LevelCard>
    </div>
  );
}

const SLIDES = [
  { title: ["링크 속 핵심만 쏙,", "킵노트에 저장해요"], art: <LinkToSummary /> },
  { title: ["본문에 정보가 있다면", "더 정확하게", "가져올 수 있어요"], art: <TextOnly /> },
] as const;

/** 이 거리(px)보다 많이 밀면 다음/이전 화면으로 넘긴다. */
const SWIPE_DISTANCE = 50;

/** 처음 방문했을 때 홈보다 먼저 보여주는 2장짜리 안내. 화면을 좌우로 밀어서도 넘길 수 있다. */
export function OnboardingScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  // 손가락을 따라 움직이는 거리. null이면 드래그 중이 아님.
  const [dragX, setDragX] = useState<number | null>(null);
  const start = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  const last = index === SLIDES.length - 1;
  // 사용자가 실제로 본 슬라이드
  const seen = useRef(new Set<number>());
  // 아직 온보딩을 마치지 않은 사용자에게 첫 슬라이드가 보일 때 한 번만 기록한다.
  const onboarded = useOnboarded();
  const startedSent = useRef(false);
  useEffect(() => {
    if (onboarded !== false || startedSent.current) return;
    startedSent.current = true;
    track("onboarding_started", { total_steps: SLIDES.length });
  }, [onboarded]);
  useEffect(() => {
    seen.current.add(index);
  }, [index]);

  const begin = (x: number, y: number) => {
    start.current = { x, y, horizontal: null };
  };
  const move = (x: number, y: number) => {
    const from = start.current;
    if (!from) return;
    const dx = x - from.x;
    const dy = y - from.y;
    // 처음 움직인 방향으로 가로 스와이프인지 세로 스크롤인지 정한다.
    if (from.horizontal === null && Math.hypot(dx, dy) > 8) from.horizontal = Math.abs(dx) > Math.abs(dy);
    if (from.horizontal) {
      // 맨 앞·맨 뒤에서는 저항감을 준다.
      const blocked = (dx > 0 && index === 0) || (dx < 0 && last);
      setDragX(blocked ? dx / 4 : dx);
    }
  };
  const end = () => {
    const from = start.current;
    start.current = null;
    const dx = dragX ?? 0;
    setDragX(null);
    if (!from?.horizontal) return;
    if (dx <= -SWIPE_DISTANCE && !last) setIndex(index + 1);
    else if (dx >= SWIPE_DISTANCE && index > 0) setIndex(index - 1);
  };

  const next = () => {
    if (!last) {
      setIndex(index + 1);
      return;
    }
    trackBoth("Onboarding Completed", {
      completed_steps: seen.current.size,
      skipped_steps: SLIDES.length - seen.current.size,
    });
    completeOnboarding();
    router.replace("/");
  };

  return (
    <div
      className="flex min-h-0 flex-1 touch-pan-y select-none flex-col overflow-hidden bg-[#f4f6f9] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-10"
      // 터치(휴대폰)와 마우스(PC)를 모두 지원한다.
      onTouchStart={(event) => begin(event.touches[0].clientX, event.touches[0].clientY)}
      onTouchMove={(event) => move(event.touches[0].clientX, event.touches[0].clientY)}
      onTouchEnd={end}
      onTouchCancel={end}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse") begin(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (event.pointerType === "mouse") move(event.clientX, event.clientY);
      }}
      onPointerUp={(event) => {
        if (event.pointerType === "mouse") end();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse" && start.current) end();
      }}
    >
      <div className="flex shrink-0 justify-center gap-2" aria-label={`${index + 1} / ${SLIDES.length}`}>
        {SLIDES.map((_, dot) => (
          <span
            key={dot}
            aria-hidden
            className={`size-[9px] rounded-full ${dot === index ? "bg-voltage-violet" : "bg-[#d5dbe3]"}`}
          />
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div
          className={`flex h-full ${dragX === null ? "transition-transform duration-300 ease-out" : ""}`}
          style={{ transform: `translateX(calc(${-index * 100}% + ${dragX ?? 0}px))` }}
        >
          {SLIDES.map((slide, slideIndex) => (
            <div
              key={slideIndex}
              aria-hidden={slideIndex !== index}
              className="flex h-full w-full shrink-0 flex-col items-center justify-start gap-8 px-5 pb-6 pt-[16vh]"
            >
              <h1 className="text-center text-[1.75rem] font-extrabold leading-[1.4] tracking-[-0.3px] text-midnight-ink">
                {slide.title.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </h1>
              {slide.art}
            </div>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between px-5">
        <button
          type="button"
          onClick={() => setIndex(index - 1)}
          className={`min-h-12 px-3 text-base text-placeholder ${index === 0 ? "invisible" : ""}`}
          tabIndex={index === 0 ? -1 : 0}
        >
          이전
        </button>
        <Button onClick={next}>{last ? "시작하기" : "다음"}</Button>
      </div>
    </div>
  );
}
