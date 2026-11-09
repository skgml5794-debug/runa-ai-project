import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const fetchFreshThumbnail = vi.fn();
vi.mock("../thumbnail", () => ({ fetchFreshThumbnail }));

const { POST } = await import("../../app/api/thumbnail/route");
const { FetchFailedError } = await import("../errors");
const { resetRateLimit } = await import("../rate-limit");

const URL_OK = "https://www.instagram.com/p/AbC123/";

function call(body: unknown, ip = "1.1.1.1") {
  return POST(
    new Request("http://localhost/api/thumbnail", {
      method: "POST",
      headers: { "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  resetRateLimit();
  fetchFreshThumbnail.mockReset();
});

describe("POST /api/thumbnail", () => {
  it("새 썸네일 주소를 반환한다", async () => {
    fetchFreshThumbnail.mockResolvedValue("https://cdn.example/new.jpg");
    const response = await call({ url: URL_OK });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ thumbnailUrl: "https://cdn.example/new.jpg" });
  });

  it("썸네일이 없는 게시물은 null을 반환한다", async () => {
    fetchFreshThumbnail.mockResolvedValue(null);
    expect(await (await call({ url: URL_OK })).json()).toEqual({ thumbnailUrl: null });
  });

  it("지원하지 않는 링크와 잘못된 요청은 400이고 게시물을 읽지 않는다", async () => {
    expect((await call({ url: "https://example.com/x" })).status).toBe(400);
    expect((await call({ url: 1 })).status).toBe(400);
    expect((await call("not json")).status).toBe(400);
    expect(fetchFreshThumbnail).not.toHaveBeenCalled();
  });

  it("게시물을 읽지 못하면 502", async () => {
    fetchFreshThumbnail.mockRejectedValue(new FetchFailedError("실패"));
    expect((await call({ url: URL_OK })).status).toBe(502);
  });

  it("같은 사용자가 1분에 10번을 넘기면 429이고 요약 제한과는 따로 센다", async () => {
    fetchFreshThumbnail.mockResolvedValue(null);
    for (let i = 0; i < 10; i += 1) expect((await call({ url: URL_OK })).status).toBe(200);
    expect((await call({ url: URL_OK })).status).toBe(429);
  });
});
