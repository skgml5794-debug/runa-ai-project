"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { flushCancelReports, linkType, sessionId, trackBoth } from "@/lib/analytics";
import { uid, withTimeout } from "@/lib/async";
import { MESSAGES, SUMMARY_TIMEOUT_MS } from "@/lib/constants";
import {
  SESSION_KEYS,
  getSession,
  setSession,
  writeDraft,
} from "@/lib/session";
import { parseLink } from "@/lib/link";
import { addPendingCancel, removePendingCancel, type CancelReason } from "@/lib/pending-cancel";
import { summarizer } from "@/lib/summarizer";
import { SummarizeError } from "@/lib/summarizer/claude";
import { AlertDialog } from "../ui/Dialog";
import { Sparkle } from "../ui/Sparkle";

export function LoadingScreen() {
  const router = useRouter();
  const [failure, setFailure] = useState<"insufficient" | "failed" | null>(null);
  // 성공·실패 이벤트가 이미 기록됐으면 true. 이후 화면을 벗어나는 것은 취소가 아니다.
  const settled = useRef(false);
  const cancelReported = useRef(false);
  // 화면이 실제로 떠 있는지. 개발 모드의 마운트·해제 반복과 진짜 이탈을 구분한다.
  const mounted = useRef(false);

  useEffect(() => {
    const url = getSession(SESSION_KEYS.pendingUrl);
    if (!url) {
      router.replace("/");
      return;
    }

    // 화면을 벗어나면(뒤로가기 등) 결과를 무시해 요청을 취소한 것과 같이 처리한다.
    let cancelled = false;
    const startedAt = Date.now();
    mounted.current = true;

    const attemptId = uid();

    // 요약이 끝나기 전에 화면을 벗어난 경우만 기록한다. (성공·실패한 뒤 이동은 제외)
    // 탭을 닫을 때는 전송 전에 페이지가 사라질 수 있어, 먼저 저장소에 남기고 보낸다.
    // 보내지 못한 기록은 다음 방문에 다시 보낸다. (lib/pending-cancel.ts)
    const reportCancelled = (reason: CancelReason, sendNow: boolean) => {
      if (settled.current || cancelReported.current) return;
      cancelReported.current = true;
      const linkKind = linkType(parseLink(url)?.source);
      const leftAt = Date.now();
      const stored = addPendingCancel({
        id: attemptId,
        linkType: linkKind,
        reason,
        startedAt,
        leftAt,
        sessionId: sessionId(),
      });
      if (!stored) {
        // 저장소를 쓸 수 없으면 기록 없이 바로 보낸다.
        trackBoth("Summary Loading Cancelled", {
          link_type: linkKind,
          cancel_reason: reason,
          elapsed_ms: leftAt - startedAt,
        });
        return;
      }
      if (sendNow) void flushCancelReports();
    };
    // 뒤로가기 캐시(persisted)로 들어가는 경우는 페이지가 복원돼 요약이 끝날 수 있으므로
    // 바로 보내지 않고 기록만 남긴다. 끝나면 아래에서 기록을 지운다.
    const onPageHide = (event: PageTransitionEvent) =>
      reportCancelled("page_closed", !event.persisted);
    window.addEventListener("pagehide", onPageHide);
    withTimeout(summarizer.summarize(url), SUMMARY_TIMEOUT_MS)
      .then((result) => {
        if (cancelled) return;
        settled.current = true;
        removePendingCancel(attemptId);
        setSession(SESSION_KEYS.pendingUrl, "");
        // 요약 생성 성공. 기존 link_submission_succeeded를 대체해 같은 순간에 두 번 보내지 않는다.
        trackBoth("Summary Generated", {
          link_type: linkType(result.source),
          validation_status: "success",
        });
        writeDraft({
          result,
          showToast: true,
          summaryGenerationDurationMs: Date.now() - startedAt,
        });
        router.replace("/summary");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        settled.current = true;
        removePendingCancel(attemptId);
        setSession(SESSION_KEYS.pendingUrl, "");
        const kind = error instanceof SummarizeError ? error.kind : "failed";
        trackBoth("Link Submission Failed", {
          link_type: linkType(parseLink(url)?.source),
          error_code: kind === "insufficient" ? "insufficient_content" : "fetch_failed",
          error_message_shown: kind === "insufficient" ? "insufficientContent" : "fetchError",
        });
        setFailure(kind);
      });

    return () => {
      cancelled = true;
      mounted.current = false;
      window.removeEventListener("pagehide", onPageHide);
      // 개발 모드에서는 해제 직후 같은 화면이 다시 마운트된다. 다음 틱에도 해제된 상태일 때만 이탈로 본다.
      setTimeout(() => {
        if (!mounted.current) reportCancelled("navigated_away", true);
      }, 0);
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
