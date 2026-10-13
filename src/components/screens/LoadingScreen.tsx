"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { withTimeout } from "@/lib/async";
import { MESSAGES, SUMMARY_TIMEOUT_MS } from "@/lib/constants";
import {
  SESSION_KEYS,
  getSession,
  setSession,
  writeDraft,
} from "@/lib/session";
import { summarizer } from "@/lib/summarizer";
import { SummarizeError } from "@/lib/summarizer/claude";
import { AlertDialog } from "../ui/Dialog";
import { MessageGlyph, Sparkle } from "../ui/Sparkle";

export function LoadingScreen() {
  const router = useRouter();
  const [failure, setFailure] = useState<"insufficient" | "failed" | null>(null);

  useEffect(() => {
    const url = getSession(SESSION_KEYS.pendingUrl);
    if (!url) {
      router.replace("/");
      return;
    }

    // 화면을 벗어나면(뒤로가기 등) 결과를 무시해 요청을 취소한 것과 같이 처리한다.
    let cancelled = false;
    withTimeout(summarizer.summarize(url), SUMMARY_TIMEOUT_MS)
      .then((result) => {
        if (cancelled) return;
        setSession(SESSION_KEYS.pendingUrl, "");
        writeDraft({ result, showToast: true });
        router.replace("/summary");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSession(SESSION_KEYS.pendingUrl, "");
        setFailure(error instanceof SummarizeError ? error.kind : "failed");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-linear-to-b from-lavender-field/50 to-white px-6 text-center">
      <Sparkle className="size-16" />
      <p role="status" className="mt-4 text-base font-semibold tracking-[-0.4px] text-ultra-violet">
        {MESSAGES.loading}
      </p>
      <h1 className="mt-1.5 text-2xl font-extrabold tracking-[-0.02em] text-ultra-violet">
        핵심만 추리고 있어요
      </h1>
      <MessageGlyph className="mt-6 size-40 drop-shadow-[0_12px_24px_rgba(134,47,231,0.18)]" />

      {failure ? (
        <AlertDialog
          message={
            failure === "insufficient" ? MESSAGES.insufficientContent : MESSAGES.fetchError
          }
          onConfirm={() => router.replace("/")}
        />
      ) : null}
    </div>
  );
}
