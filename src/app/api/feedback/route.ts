import { parseFeedback } from "../../../server/feedback";
import { allowRequest } from "../../../server/rate-limit";
import { getSupabase } from "../../../server/supabase";

function fail(error: string, status: number): Response {
  return Response.json({ error }, { status });
}

/** 중복 submission_id(UNIQUE 위반)의 Postgres 오류 코드 */
const UNIQUE_VIOLATION = "23505";

/**
 * 익명 피드백 저장 API. 노트·링크 등 사용자 데이터는 받지 않는다.
 * 요약 횟수 제한과 섞이지 않도록 별도 키로 제한한다.
 * 같은 submission_id가 다시 오면 이미 저장된 것으로 보고 성공 처리한다.
 */
export async function POST(request: Request): Promise<Response> {
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowRequest(`feedback:${client}`)) return fail("rate_limited", 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_request", 400);
  }
  const feedback = parseFeedback(body);
  if (!feedback) return fail("invalid_request", 400);

  const supabase = getSupabase();
  if (!supabase) return fail("not_configured", 503);

  // 읽기 권한이 없으므로 결과를 되읽지 않는 insert만 쓴다.
  const { error } = await supabase.from("feedback").insert({
    submission_id: feedback.submissionId,
    rating: feedback.rating,
    most_useful: feedback.mostUseful,
    pain_points: feedback.painPoints,
    comment: feedback.comment,
  });
  if (error && error.code !== UNIQUE_VIOLATION) return fail("save_failed", 502);

  return Response.json({ ok: true });
}
