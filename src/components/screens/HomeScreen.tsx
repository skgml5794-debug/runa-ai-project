"use client";

import { ArrowUp, ChevronRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { linkType, secondsSince, trackBoth } from "@/lib/analytics";
import { MESSAGES } from "@/lib/constants";
import { launchApp } from "@/lib/open-app";
import { consumeArrivalFromOnboarding } from "@/lib/onboarding";
import { SERVICES } from "@/lib/services";
import { parseLink } from "@/lib/link";
import { SESSION_KEYS, setSession, useSessionValue } from "@/lib/session";
import { HomeLogoLink } from "../ui/Logo";
import { InstagramIcon, ThreadsIcon } from "../ui/icons";
import { ItemArt, PlaceArt, TipArt } from "../ui/HomeArt";
import { AlertDialog } from "../ui/Dialog";
import { ScopeSheet } from "../ui/ScopeSheet";

const GUIDES = [
  { title: "가보고 싶은 곳", description: "맛집 · 카페 · 여행지", Art: PlaceArt },
  { title: "추천 받은 아이템", description: "옷 · 신발 · 생활용품", Art: ItemArt },
  { title: "나중에 써먹을 팁", description: "생활 꿀팁 · 레시피 · 노하우", Art: TipArt },
] as const;

export function HomeScreen() {
  const router = useRouter();
  // 오류가 나거나 로딩 중 뒤로 돌아와도 입력한 링크를 유지한다.
  const link = useSessionValue(SESSION_KEYS.homeLink);
  // 안내 팝업 문구. null이면 닫힘.
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [scopeOpen, setScopeOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // 시작하기에서 넘어온 직후에만 홈이 서서히 나타난다.
  useLayoutEffect(() => {
    if (consumeArrivalFromOnboarding()) rootRef.current?.classList.add("animate-fade-in");
  }, []);
  const submitting = useRef(false);
  // 화면을 열 때 이미 들어 있던(오류 뒤 복원된) 링크였는지
  const prefilled = useRef(link.trim() !== "");
  // 붙여넣기로 입력했는지 (입력창 onPaste)
  const pasted = useRef(false);
  // 입력을 시작한 시각. null이면 아직 입력하지 않았다.
  const typingStartedAt = useRef<number | null>(null);
  // 제출했거나 이탈을 이미 기록했으면 true
  const abandonDone = useRef(false);
  // 마지막으로 한 일: 입력, 붙여넣기, 잘못된 링크로 제출
  const lastStep = useRef<"typing" | "pasted" | "invalid_link">("typing");

  // 입력을 시작했지만 제출하지 않고 화면을 떠나거나 탭을 닫으면 이탈로 기록한다.
  useEffect(() => {
    const reportAbandoned = () => {
      if (typingStartedAt.current === null || abandonDone.current) return;
      abandonDone.current = true;
      trackBoth("Link Submission Abandoned", {
        last_step: lastStep.current,
        elapsed_time: secondsSince(typingStartedAt.current),
      });
    };
    window.addEventListener("pagehide", reportAbandoned);
    return () => {
      window.removeEventListener("pagehide", reportAbandoned);
      reportAbandoned();
    };
  }, []);

  // 홈이 보일 때 마운트당 한 번만 기록한다. 퍼널의 시작 단계.
  const viewedSent = useRef(false);
  useEffect(() => {
    if (viewedSent.current) return;
    viewedSent.current = true;
    trackBoth("Home Viewed");
  }, []);

  const canSubmit = link.trim() !== "";

  const submit = () => {
    if (submitting.current) return;
    if (!canSubmit) {
      setAlertMessage(MESSAGES.emptyInput);
      return;
    }
    const parsed = parseLink(link);
    if (!parsed) {
      trackBoth("Link Submission Failed", {
        link_type: "unknown",
        error_code: "invalid_url",
        error_message_shown: "fetchError",
      });
      lastStep.current = "invalid_link";
      setAlertMessage(MESSAGES.fetchError);
      return;
    }
    abandonDone.current = true;
    submitting.current = true;
    // 올바른 링크로 요약 요청을 넘기는 순간. submitting 가드 덕분에 제출당 한 번만 보낸다.
    trackBoth("Link Submitted", {
      link_type: linkType(parsed.source),
      input_method: pasted.current ? "paste" : "type",
      // 오류 뒤 복원된 링크를 이어서 제출한 경우와 새로 입력한 경우를 구분한다.
      prefilled: prefilled.current,
    });
    setSession(SESSION_KEYS.pendingUrl, parsed.url);
    router.push("/loading");
  };

  return (
    <div
      ref={rootRef}
      className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#ffffff]"
    >
      <header className="relative z-10 flex shrink-0 items-center justify-between px-5 pt-3">
        <HomeLogoLink tone="bg-placeholder" />
        <div className="flex items-center gap-1">
          {SERVICES.map((service) => (
            <a
              key={service.key}
              href={service.web}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${service.label} 열기`}
              onClick={(event) => {
                // 모바일이면 앱을 먼저 열고, 그 외(데스크톱)는 기본 동작(새 탭)을 따른다.
                if (launchApp(service.app)) event.preventDefault();
              }}
              className="flex size-10 items-center justify-center rounded-full"
            >
              {service.key === "instagram" ? (
                <InstagramIcon className="size-[22px] text-placeholder" />
              ) : (
                <ThreadsIcon className="size-[22px] text-placeholder" />
              )}
            </a>
          ))}
        </div>
      </header>
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 text-center">
        <h1 className="whitespace-pre-line font-display text-[32px] font-bold leading-[46px] tracking-[-0.2px] text-voltage-violet">
          {MESSAGES.homeHeadline}
        </h1>
      </div>
      <button
        type="button"
        onClick={() => setScopeOpen(true)}
        className="relative z-10 ml-6 mr-5 flex min-h-9 w-fit shrink-0 items-center gap-1 text-base text-graphite"
      >
        {MESSAGES.homeScope}
        <ChevronRight className="size-4 text-placeholder" aria-hidden />
      </button>
      <ul className="no-scrollbar relative z-10 flex shrink-0 snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-3 pt-2">
        {GUIDES.map(({ title, description, Art }) => (
          <li
            key={title}
            className="flex min-h-[132px] w-[56%] shrink-0 snap-start flex-col justify-between rounded-[20px] bg-white p-4 shadow-[0_6px_24px_rgba(21,25,36,0.10)]"
          >
            <Art />
            <div>
              <p className="text-base font-bold tracking-[-0.01em] text-midnight-ink">{title}</p>
              <p className="mt-1 text-[13px] leading-5 text-placeholder">{description}</p>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="relative z-10 shrink-0 px-5 pb-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="relative">
          <input
            ref={inputRef}
            aria-label="Instagram 또는 Threads 링크"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={link}
            onPaste={() => {
              pasted.current = true;
              lastStep.current = "pasted";
            }}
            onChange={(event) => {
              if (event.target.value.trim() !== "") {
                // 입력창을 열기만 한 것은 제외하고, 내용이 생긴 첫 순간에 한 번만 기록한다.
                // prefilled: 오류 뒤 복원된 링크를 이어서 고치는 경우라 새 입력과 구분한다.
                if (typingStartedAt.current === null) typingStartedAt.current = Date.now();
                abandonDone.current = false;
                if (lastStep.current === "invalid_link") {
                  lastStep.current = pasted.current ? "pasted" : "typing";
                }
              }
              setSession(SESSION_KEYS.homeLink, event.target.value);
            }}
            placeholder={MESSAGES.homeLinkPlaceholder}
            className={`min-h-14 w-full text-ellipsis rounded-2xl bg-fog pl-4 text-base outline-none placeholder:text-[15px] ${
              link !== "" ? "pr-[5.5rem]" : "pr-16"
            }`}
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
            {link !== "" ? (
              <button
                type="button"
                aria-label="입력 지우기"
                // 입력창의 포커스를 잃지 않게 한다.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setSession(SESSION_KEYS.homeLink, "");
                  inputRef.current?.focus();
                }}
                className="flex size-5 items-center justify-center rounded-full bg-[#c3cedb] text-white"
              >
                <X className="size-3" strokeWidth={3} aria-hidden />
              </button>
            ) : null}
            <button
              type="submit"
              aria-label="요약하기"
              className="flex size-10 items-center justify-center rounded-full bg-voltage-violet text-white"
            >
              <ArrowUp className="size-5" strokeWidth={2.4} aria-hidden />
            </button>
          </div>
        </div>
      </form>

      {scopeOpen ? <ScopeSheet onClose={() => setScopeOpen(false)} /> : null}
      {alertMessage ? (
        <AlertDialog
          message={alertMessage}
          onConfirm={() => setAlertMessage(null)}
        />
      ) : null}
    </div>
  );
}
