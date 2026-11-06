import "server-only";
import {
  COMMENT_MAX,
  MOST_USEFUL_VALUES,
  PAIN_POINT_VALUES,
} from "../lib/feedback-options";

export interface FeedbackInput {
  submissionId: string;
  rating: number;
  mostUseful: string | null;
  painPoints: string[];
  comment: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 요청 본문을 검증해 저장할 값으로 정리한다. 잘못된 값이 하나라도 있으면 null. */
export function parseFeedback(body: unknown): FeedbackInput | null {
  if (typeof body !== "object" || body === null) return null;
  const raw = body as Record<string, unknown>;

  const { submissionId, rating, mostUseful, painPoints, comment } = raw;
  if (typeof submissionId !== "string" || !UUID.test(submissionId)) return null;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return null;
  }

  if (
    mostUseful != null &&
    !(typeof mostUseful === "string" && (MOST_USEFUL_VALUES as readonly string[]).includes(mostUseful))
  ) {
    return null;
  }

  const points = painPoints ?? [];
  if (
    !Array.isArray(points) ||
    points.length > PAIN_POINT_VALUES.length ||
    !points.every(
      (point) => typeof point === "string" && (PAIN_POINT_VALUES as readonly string[]).includes(point),
    ) ||
    new Set(points).size !== points.length
  ) {
    return null;
  }

  if (comment != null && typeof comment !== "string") return null;
  const text = typeof comment === "string" ? comment.trim() : "";
  if (text.length > COMMENT_MAX) return null;

  return {
    submissionId,
    rating,
    mostUseful: typeof mostUseful === "string" ? mostUseful : null,
    painPoints: points as string[],
    comment: text === "" ? null : text,
  };
}
