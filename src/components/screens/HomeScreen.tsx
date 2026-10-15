"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { MESSAGES } from "@/lib/constants";
import { parseLink } from "@/lib/link";
import { SESSION_KEYS, setSession, useSessionValue } from "@/lib/session";
import { Button } from "../ui/Button";
import { HomeBackdrop } from "../ui/HomeBackdrop";
import { Logo } from "../ui/Logo";
import { Sparkle } from "../ui/Sparkle";
import { AlertDialog } from "../ui/Dialog";

const TOPICS = [
  { label: "추천 제품", emoji: "🛍️" },
  { label: "레시피", emoji: "🍳" },
  { label: "데이트·피크닉 코스", emoji: "🧺" },
  { label: "생활·업무 노하우", emoji: "💡" },
  { label: "맛집·카페", emoji: "☕" },
] as const;

export function HomeScreen() {
  const router = useRouter();
  // 오류가 나거나 로딩 중 뒤로 돌아와도 입력한 링크를 유지한다.
  const link = useSessionValue(SESSION_KEYS.homeLink);
  // 안내 팝업 문구. null이면 닫힘.
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const submitting = useRef(false);

  const canSubmit = link.trim() !== "";

  const submit = () => {
    if (submitting.current) return;
    if (!canSubmit) {
      setAlertMessage(MESSAGES.emptyInput);
      return;
    }
    const parsed = parseLink(link);
    if (!parsed) {
      setAlertMessage(MESSAGES.fetchError);
      return;
    }
    submitting.current = true;
    setSession(SESSION_KEYS.pendingUrl, parsed.url);
    router.push("/loading");
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <HomeBackdrop />
      <header className="relative z-10 shrink-0 px-6 pt-10">
        <Logo />
      </header>
      <form
        className="relative z-10 flex flex-1 flex-col justify-center gap-8 px-6 pb-16"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-[2rem] font-extrabold leading-[1.25] tracking-[-0.2px] text-voltage-violet">
            {MESSAGES.homeHeadline.split("\n").map((line, index) => (
              <span key={line} className="block">
                {line}
                {index === 0 ? (
                  <Sparkle className="ml-2 inline-block size-7 align-[-2px]" float spread />
                ) : null}
              </span>
            ))}
          </h1>
          <p className="text-balance break-keep text-base text-graphite">{MESSAGES.homeSubtitle}</p>
          <ul className="mt-2 flex flex-wrap justify-center gap-1.5">
            {TOPICS.map(({ label, emoji }) => (
              <li
                key={label}
                className="flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-3 text-[13px] font-medium text-midnight-ink shadow-[0_1px_6px_rgba(31,41,55,0.08)]"
              >
                <span
                  aria-hidden
                  className="flex size-6 items-center justify-center rounded-full bg-fog text-[13px] leading-none"
                >
                  {emoji}
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <input
            aria-label="Instagram 또는 Threads 링크"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={link}
            onChange={(event) =>
              setSession(SESSION_KEYS.homeLink, event.target.value)
            }
            placeholder="인스타그램 또는 스레드 링크를 붙여넣어 주세요"
            className="min-h-12 w-full rounded-xl bg-fog px-4 text-base outline-none"
          />
          <Button type="submit" fullWidth>
            요약하기
          </Button>
        </div>
      </form>

      {alertMessage ? (
        <AlertDialog
          message={alertMessage}
          onConfirm={() => setAlertMessage(null)}
        />
      ) : null}
    </div>
  );
}
