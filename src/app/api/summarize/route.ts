import { summarizeWithClaude } from "../../../server/claude-summary";
import {
  AiFailedError,
  FetchFailedError,
  InsufficientContentError,
  NotConfiguredError,
} from "../../../server/errors";
import { fetchPostMeta, validateTarget } from "../../../server/post-meta";
import { allowRequest } from "../../../server/rate-limit";

const MAX_URL_LENGTH = 2_000;

function fail(error: string, status: number): Response {
  return Response.json({ error }, { status });
}

/**
 * 링크 요약 API. Anthropic API 키는 이 서버 코드에서만 쓰이며 브라우저로 전달되지 않는다.
 * 오류 코드로 실패 단계를 구분한다. (본문 수집 실패 / 요약할 정보 부족 / 설정·AI 오류)
 * 본문이 없으면 요약하지 않고 실패를 반환한다. (가짜 결과로 대체하지 않음)
 */
export async function POST(request: Request): Promise<Response> {
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowRequest(client)) return fail("rate_limited", 429);

  let url: unknown;
  try {
    ({ url } = (await request.json()) as { url?: unknown });
  } catch {
    return fail("invalid_request", 400);
  }
  if (typeof url !== "string" || url.length > MAX_URL_LENGTH || !validateTarget(url)) {
    return fail("invalid_link", 400);
  }

  try {
    const post = await fetchPostMeta(url);
    return Response.json(await summarizeWithClaude(post));
  } catch (error) {
    if (error instanceof InsufficientContentError) return fail("insufficient_content", 422);
    if (error instanceof FetchFailedError) return fail("fetch_failed", 502);
    if (error instanceof NotConfiguredError) return fail("not_configured", 503);
    if (error instanceof AiFailedError) return fail("ai_failed", 502);
    return fail("unknown", 500);
  }
}
