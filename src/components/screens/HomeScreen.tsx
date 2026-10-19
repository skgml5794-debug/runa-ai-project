"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { linkType, secondsSince, track, trackBoth } from "@/lib/analytics";
import { MESSAGES } from "@/lib/constants";
import { parseLink } from "@/lib/link";
import { launchApp } from "@/lib/open-app";
import { useOnboarded } from "@/lib/onboarding";
import { SESSION_KEYS, setSession, useSessionValue } from "@/lib/session";
import { HomeLogoLink } from "../ui/Logo";
import { Sparkle } from "../ui/Sparkle";
import { AlertDialog } from "../ui/Dialog";

const SERVICES = [
  {
    label: "Instagram",
    web: "https://www.instagram.com",
    app: {
      androidIntent: "intent://www.instagram.com/#Intent;scheme=https;package=com.instagram.android;end",
      iosApp: "instagram://app",
      iosFallback: "https://apps.apple.com/app/instagram/id389801252",
    },
  },
  {
    label: "Threads",
    web: "https://www.threads.com",
    app: {
      androidIntent: "intent://www.threads.com/#Intent;scheme=https;package=com.instagram.barcelona;end",
      iosApp: "barcelona://",
      iosFallback: "https://apps.apple.com/app/threads/id6446901002",
    },
  },
] as const;

export function HomeScreen() {
  const router = useRouter();
  const onboarded = useOnboarded();
  // 오류가 나거나 로딩 중 뒤로 돌아와도 입력한 링크를 유지한다.
  const link = useSessionValue(SESSION_KEYS.homeLink);
  // 안내 팝업 문구. null이면 닫힘.
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const submitting = useRef(false);
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

  // 처음 방문이면 홈 대신 온보딩을 먼저 보여준다.
  useEffect(() => {
    if (onboarded === false) router.replace("/onboarding");
  }, [onboarded, router]);

  const canSubmit = link.trim() !== "";

  const submit = () => {
    if (submitting.current) return;
    if (!canSubmit) {
      setAlertMessage(MESSAGES.emptyInput);
      return;
    }
    const parsed = parseLink(link);
    track("link_submit_started", {
      link_type: linkType(parsed?.source),
      input_method: pasted.current ? "paste" : "type",
      category_selected_on_submit: "none",
    });
    if (!parsed) {
      track("link_submission_failed", {
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
    setSession(SESSION_KEYS.pendingUrl, parsed.url);
    router.push("/loading");
  };

  if (!onboarded) return <div className="min-h-0 flex-1 bg-[#f4f6f9]" />;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#f4f6f9]">
      <header className="relative z-10 shrink-0 px-5 pt-6">
        <HomeLogoLink />
      </header>
      <form
        className="relative z-10 flex flex-1 flex-col justify-center gap-6 px-5 pb-6"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex flex-col items-center space-y-3 text-center">
          <Sparkle className="size-10" float spread />
          <p className="text-base text-graphite">
            링크만 넣으면 핵심만 추려서 저장해요
          </p>
          <h1 className="-mt-1.5 font-display text-[2rem] font-extrabold leading-[1.2] tracking-[-0.3px] text-voltage-violet">
            {MESSAGES.homeHeadline}
          </h1>
        </div>
        <div>
          <div className="flex gap-2">
            <input
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
                  typingStartedAt.current ??= Date.now();
                  abandonDone.current = false;
                  if (lastStep.current === "invalid_link") {
                    lastStep.current = pasted.current ? "pasted" : "typing";
                  }
                }
                setSession(SESSION_KEYS.homeLink, event.target.value);
              }}
              placeholder="인스타그램 또는 스레드 링크를 붙여넣어 주세요"
              className="min-h-14 min-w-0 flex-1 text-ellipsis rounded-2xl border border-[#e3e7ed] bg-white px-4 text-base outline-none placeholder:text-[15px] focus:border-slate"
            />
            <button
              type="submit"
              aria-label="요약하기"
              className="flex h-14 w-12 shrink-0 items-center justify-center rounded-2xl bg-voltage-violet text-white"
            >
              <ArrowRight className="size-[18.4px]" aria-hidden />
            </button>
          </div>
        </div>
      </form>
      <nav aria-label="바로가기" className="relative z-10 grid shrink-0 grid-cols-2 pb-2">
        {SERVICES.map((service) => (
          <a
            key={service.label}
            href={service.web}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              // 모바일이면 앱을 먼저 열고, 그 외(데스크톱)는 기본 동작(새 탭)을 따른다.
              if (launchApp(service.app)) event.preventDefault();
            }}
            // 화면 가로를 반으로 나눈 각 칸의 가운데에 (화살표 + 글자)를 둔다.
            className="flex min-h-11 items-center justify-center gap-1 text-[15px] font-medium leading-none text-slate-deep"
          >
            <ArrowUpRight className="size-[18px] shrink-0" aria-hidden />
            {service.label}
          </a>
        ))}
      </nav>

      {alertMessage ? (
        <AlertDialog
          message={alertMessage}
          onConfirm={() => setAlertMessage(null)}
        />
      ) : null}
    </div>
  );
}
