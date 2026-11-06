"use client";

import { ChevronLeft, Star, X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  COMMENT_MAX,
  MOST_USEFUL_OPTIONS,
  PAIN_POINT_OPTIONS,
} from "@/lib/feedback-options";
import {
  recordFeedbackSubmitted,
  resolveFeedbackPrompt,
  submitFeedback,
  useFeedbackPromptOpen,
} from "@/lib/feedback";
import { useFrameElement } from "./AppFrame";
import { Button } from "./ui/Button";
import { FIELD_LINE } from "./ui/field";
import { round } from "./ui/HomeArt";

const ACCENT = "#1CC98A";
const STEPS = 3;

/** 선택 항목 공통 모양(2단계 목록, 3단계 칩). 선택하면 서브컬러(초록) 라인·글자에 연한 배경 */
const OPTION_BASE = "flex min-h-14 items-center rounded-2xl border px-4 text-base";
const OPTION_IDLE = "border-[#e5e9ef] bg-white text-graphite";
const OPTION_SELECTED = "font-semibold";
const SELECTED_COLOR = "#2ccf98";
const SELECTED_STYLE = {
  borderColor: SELECTED_COLOR,
  color: SELECTED_COLOR,
  backgroundColor: `${SELECTED_COLOR}17`,
};

const TITLES = [
  "킵노트 사용 경험은 어떠셨나요?",
  "어떤 점이 가장 유용했나요?",
  "어떤 점이 개선되면 좋을까요?",
] as const;

const SUBTITLES = [
  "만족도를 별점으로 알려주세요.",
  "하나만 골라주세요.",
  "해당하는 항목을 모두 골라주세요.",
] as const;

/** 첫 노트 저장 직후 한 번 뜨는 3단계 피드백 팝업. 노출 규칙은 lib/feedback.ts에 있다. */
export function FeedbackPrompt() {
  const open = useFeedbackPromptOpen();
  const frame = useFrameElement();
  if (!open || !frame) return null;
  return createPortal(<FeedbackSheet />, frame);
}

function FeedbackSheet() {
  const [step, setStep] = useState(0);
  const [rating, setRating] = useState(0);
  const [mostUseful, setMostUseful] = useState<string | null>(null);
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error" | "done">("idle");
  // 재시도해도 같은 값을 보내 서버가 중복 저장하지 않게 한다.
  const submissionId = useRef(crypto.randomUUID());
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const busy = status === "submitting";
  const close = () => {
    if (busy) return;
    resolveFeedbackPrompt(status === "done" ? "submitted" : "dismissed");
  };
  const handleEscape = useEffectEvent(close);

  useEffect(() => {
    panel.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleEscape();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (advance.current) clearTimeout(advance.current);
    };
  }, []);

  const chooseRating = (value: number) => {
    setRating(value);
    // 선택한 별점이 채워지는 것을 잠깐 보여준 뒤 다음 단계로 간다.
    if (advance.current) clearTimeout(advance.current);
    advance.current = setTimeout(() => setStep(1), 250);
  };

  const submit = async () => {
    if (busy || rating === 0) return;
    setStatus("submitting");
    const ok = await submitFeedback({
      submissionId: submissionId.current,
      rating,
      mostUseful,
      painPoints,
      comment: comment.trim(),
    });
    if (ok) {
      recordFeedbackSubmitted();
      setStatus("done");
    } else {
      setStatus("error");
    }
  };

  const done = status === "done";

  return (
    <div className="fixed inset-0 z-[60] flex framed:absolute items-end bg-midnight-ink/40 pb-[var(--keyboard-inset,0px)]">
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="피드백"
        className="flex max-h-[calc(92dvh-var(--keyboard-inset,0px))] w-full animate-dialog-in flex-col rounded-t-3xl bg-white outline-none"
      >
        <div className="px-5 pt-5 short:pt-2">
          <div className="-mx-2.5 -mt-1 flex items-center justify-between">
            {step > 0 && !done ? (
              <button
                type="button"
                aria-label="이전 단계"
                disabled={busy}
                onClick={() => setStep(step - 1)}
                className="flex size-11 items-center justify-center rounded-full text-midnight-ink disabled:opacity-40"
              >
                <ChevronLeft className="size-6" aria-hidden />
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              aria-label="닫기"
              disabled={busy}
              onClick={close}
              className="flex size-11 items-center justify-center rounded-full text-midnight-ink disabled:opacity-40"
            >
              <X className="size-6" aria-hidden />
            </button>
          </div>
          {done ? null : (
            <div
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={STEPS}
              aria-valuenow={step + 1}
              aria-label={`${step + 1} / ${STEPS} 단계`}
              className="mt-3 flex gap-1.5"
            >
              {Array.from({ length: STEPS }, (_, index) => (
                <span
                  key={index}
                  className="h-1 flex-1 rounded-full"
                  style={{ backgroundColor: index <= step ? ACCENT : "#e6ebf2" }}
                />
              ))}
            </div>
          )}
        </div>

        {done ? (
          <div className="flex flex-col items-center px-5 pb-5 pt-1 text-center">
            <svg aria-hidden viewBox="0 0 32 32" className="size-16">
              <circle cx="16" cy="16" r="11.5" {...round(ACCENT)} />
              <path
                d="M10.8 16.4l3.7 3.7 6.8-7.4"
                fill="none"
                stroke="#fff"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-5 text-xl font-bold text-midnight-ink">소중한 의견 감사합니다</p>
            <p className="mt-2 text-[15px] leading-6 text-placeholder">
              보내주신 의견은 킵노트를 더 좋게 만드는 데 사용할게요.
            </p>
            <Button className="mt-10 w-full self-stretch" onClick={close}>
              확인
            </Button>
          </div>
        ) : (
          <>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pt-7 short:pt-3">
              <h2 className="whitespace-pre-line text-[22px] font-bold leading-[1.4] tracking-[-0.3px] text-midnight-ink">
                {TITLES[step]}
              </h2>
              <p className="mt-2 text-[15px] text-placeholder">{SUBTITLES[step]}</p>

              {step === 0 ? (
                <div className="flex justify-center gap-1 py-10 short:py-3" role="radiogroup" aria-label="만족도">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={rating === value}
                      aria-label={`${value}점`}
                      onClick={() => chooseRating(value)}
                      className="flex size-14 items-center justify-center rounded-full"
                    >
                      <Star
                        className="size-10"
                        strokeWidth={2}
                        style={
                          value <= rating
                            ? { color: ACCENT, fill: ACCENT }
                            : { color: "#dfe5ec", fill: "#dfe5ec" }
                        }
                        aria-hidden
                      />
                    </button>
                  ))}
                </div>
              ) : null}

              {step === 1 ? (
                <div className="space-y-2.5 py-7 short:py-3" role="radiogroup" aria-label="가장 유용했던 기능">
                  {MOST_USEFUL_OPTIONS.map((option) => {
                    const selected = mostUseful === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setMostUseful((current) => (current === option.value ? null : option.value))}
                        style={selected ? SELECTED_STYLE : undefined}
                        className={`${OPTION_BASE} w-full text-left ${
                          selected ? OPTION_SELECTED : OPTION_IDLE
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {step === 2 ? (
                <div className="py-7 short:py-3">
                  <div className="flex flex-wrap gap-2">
                    {PAIN_POINT_OPTIONS.map((option) => {
                      const selected = painPoints.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={selected}
                          style={selected ? SELECTED_STYLE : undefined}
                          className={`${OPTION_BASE} min-h-12 text-[15px] ${
                            selected ? OPTION_SELECTED : OPTION_IDLE
                          }`}
                          onClick={() =>
                            setPainPoints((current) =>
                              current.includes(option.value)
                                ? current.filter((value) => value !== option.value)
                                : [...current, option.value],
                            )
                          }
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="relative mt-5">
                    <textarea
                      aria-label="자유 의견"
                      value={comment}
                      maxLength={COMMENT_MAX}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="자유롭게 의견을 남겨주세요. 어떤 의견이든 좋아요!"
                      rows={4}
                      className={`block w-full resize-none rounded-2xl border px-4 py-3 text-base leading-6 outline-none placeholder:text-[15px] placeholder:text-placeholder ${FIELD_LINE}`}
                    />
                    <p className="mt-1.5 text-right text-xs text-placeholder">
                      {comment.length} / {COMMENT_MAX.toLocaleString()}
                    </p>
                  </div>
                  {status === "error" ? (
                    <p role="alert" className="mt-3 text-sm text-danger">
                      전송하지 못했어요. 잠시 후 다시 시도해 주세요.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
              {step === 0 ? (
                <button
                  type="button"
                  onClick={close}
                  className="min-h-14 w-full text-base text-slate"
                >
                  나중에
                </button>
              ) : step === 1 ? (
                <Button className="w-full" onClick={() => setStep(2)}>
                  다음
                </Button>
              ) : (
                <Button className="w-full" disabled={busy} onClick={submit}>
                  {busy ? "보내는 중..." : status === "error" ? "다시 시도" : "의견 보내기"}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
