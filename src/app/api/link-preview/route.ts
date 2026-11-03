import { FetchFailedError } from "../../../server/errors";
import { fetchLinkPreview } from "../../../server/link-preview";
import { validateTarget } from "../../../server/post-meta";
import { allowRequest } from "../../../server/rate-limit";

const MAX_URL_LENGTH = 2_000;

function fail(error: string, status: number): Response {
  return Response.json({ error }, { status });
}

/**
 * 링크 미리보기 API. 제목·아이콘을 읽을 뿐 요약(Claude 호출)은 하지 않는다.
 * 요약 횟수 제한과 섞이지 않도록 별도 키로 제한한다.
 */
export async function POST(request: Request): Promise<Response> {
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowRequest(`preview:${client}`)) return fail("rate_limited", 429);

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
    return Response.json(await fetchLinkPreview(url));
  } catch (error) {
    if (error instanceof FetchFailedError) return fail("fetch_failed", 502);
    return fail("unknown", 500);
  }
}
