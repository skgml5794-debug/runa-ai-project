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
        <div className="flex flex-col items-center space-y-3 text-center">
          <Sparkle className="size-14" float />
          <p className="text-base text-graphite">
            링크만 넣으면 핵심만 추려서 저장해요
          </p>
          <h1 className="font-display text-[2rem] font-extrabold leading-[1.2] tracking-[-0.3px] text-voltage-violet">
            {MESSAGES.homeHeadline}
          </h1>
        </div>
        <div className="space-y-3">
          <div className="relative rounded-xl bg-fog">
            <textarea
              aria-label="Instagram 또는 Threads 링크"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              rows={5}
              value={link}
              onChange={(event) =>
                setSession(SESSION_KEYS.homeLink, event.target.value)
              }
              onKeyDown={(event) => {
                // 링크는 한 줄이므로 Enter는 줄바꿈 대신 요약하기로 처리한다. (한글 조합 중 Enter 제외)
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="인스타그램 또는 스레드 링크를 붙여넣어 주세요"
              className="block min-h-44 w-full resize-none rounded-xl bg-transparent px-4 pb-16 pt-4 text-base outline-none"
            />
            <Button type="submit" size="sm" className="absolute bottom-3 right-3">
              요약하기
            </Button>
          </div>
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
