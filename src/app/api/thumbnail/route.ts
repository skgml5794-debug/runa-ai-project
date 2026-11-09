import { FetchFailedError } from "../../../server/errors";
import { validateTarget } from "../../../server/post-meta";
import { allowRequest } from "../../../server/rate-limit";
import { fetchFreshThumbnail } from "../../../server/thumbnail";

const MAX_URL_LENGTH = 2_000;

function fail(error: string, status: number): Response {
  return Response.json({ error }, { status });
}

/** 저장된 킵노트의 만료된 썸네일을 다시 받기 위한 API. 요약 횟수 제한과 섞이지 않도록 별도 키로 제한한다. */
export async function POST(request: Request): Promise<Response> {
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowRequest(`thumbnail:${client}`)) return fail("rate_limited", 429);

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
    return Response.json({ thumbnailUrl: await fetchFreshThumbnail(url) });
  } catch (error) {
    if (error instanceof FetchFailedError) return fail("fetch_failed", 502);
    return fail("unknown", 500);
  }
}
