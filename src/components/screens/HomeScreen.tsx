"use client";

import { ArrowRight, Coffee, CookingPot, Lightbulb, MapPin, ThumbsUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { categoryColor } from "@/lib/category-colors";
import { MESSAGES } from "@/lib/constants";
import { parseLink } from "@/lib/link";
import { SESSION_KEYS, setSession, useSessionValue } from "@/lib/session";
import { Logo } from "../ui/Logo";
import { Sparkle } from "../ui/Sparkle";
import { AlertDialog } from "../ui/Dialog";

const TOPICS = [
  { label: "추천 제품", Icon: ThumbsUp },
  { label: "레시피", Icon: CookingPot },
  { label: "데이트·피크닉 코스", Icon: MapPin },
  { label: "생활·업무 노하우", Icon: Lightbulb },
  { label: "맛집·카페", Icon: Coffee },
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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#f4f6f9]">
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
        <div className="flex flex-col items-center space-y-3 text-center">
          <Sparkle className="size-10" float spread />
          <p className="text-base text-graphite">
            링크만 넣으면 핵심만 추려서 저장해요
          </p>
          <h1 className="-mt-1.5 font-display text-[2rem] font-extrabold leading-[1.2] tracking-[-0.3px] text-voltage-violet">
            {MESSAGES.homeHeadline}
          </h1>
        </div>
        <div className="space-y-4">
          <div className="flex gap-2">
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
          <ul className="flex flex-wrap justify-center gap-1.5">
            {TOPICS.map(({ label, Icon }, index) => (
              <li
                key={label}
                className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-midnight-ink shadow-[0_1px_6px_rgba(31,41,55,0.08)]"
              >
                <Icon
                  className="size-4"
                  fill="currentColor"
                  strokeWidth={1.5}
                  style={{ color: categoryColor(index).background }}
                  aria-hidden
                />
                {label}
              </li>
            ))}
          </ul>
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
