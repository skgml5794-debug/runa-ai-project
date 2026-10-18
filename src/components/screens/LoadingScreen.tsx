"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { linkType, track } from "@/lib/analytics";
import { withTimeout } from "@/lib/async";
import { MESSAGES, SUMMARY_TIMEOUT_MS } from "@/lib/constants";
import {
  SESSION_KEYS,
  getSession,
  setSession,
  writeDraft,
} from "@/lib/session";
import { parseLink } from "@/lib/link";
import { summarizer } from "@/lib/summarizer";
import { SummarizeError } from "@/lib/summarizer/claude";
import { AlertDialog } from "../ui/Dialog";
import { Sparkle } from "../ui/Sparkle";

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
        track("link_submission_succeeded", {
          link_type: linkType(result.source),
          validation_status: "success",
        });
        writeDraft({ result, showToast: true });
        router.replace("/summary");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSession(SESSION_KEYS.pendingUrl, "");
        const kind = error instanceof SummarizeError ? error.kind : "failed";
        track("link_submission_failed", {
          link_type: linkType(parseLink(url)?.source),
          error_code: kind === "insufficient" ? "insufficient_content" : "fetch_failed",
          error_message_shown: kind === "insufficient" ? "insufficientContent" : "fetchError",
        });
        setFailure(kind);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-linear-to-b from-lavender-field/50 to-white px-5 pb-32 text-center">
      <Sparkle className="size-[51px]" />
      <p role="status" className="mt-4 text-base font-semibold tracking-[-0.4px] text-ultra-violet">
        {MESSAGES.loading}
      </p>
      <h1 className="mt-1.5 text-2xl font-extrabold tracking-[-0.02em] text-ultra-violet">
        핵심만 추리고 있어요
      </h1>
      <svg aria-hidden viewBox="0 0 38 38" className="mt-10 size-[38px] animate-spin">
        <circle cx="19" cy="19" r="16" fill="none" stroke="#e8ecf1" strokeWidth="4" />
        <circle
          cx="19"
          cy="19"
          r="16"
          fill="none"
          stroke="#b8c0cc"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="30 100"
        />
      </svg>

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
