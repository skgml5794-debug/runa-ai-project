import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { summarizeWithClaude, validateOutput, DEFAULT_MODEL } = await import("../claude-summary");
const { AiFailedError, InsufficientContentError, NotConfiguredError } = await import("../errors");

const SOURCE = "Kim on Instagram\n오늘 쓴 Stanley 퀜처 H2.0 텀블러 후기. 얼음이 하루 종일 가요. 세척은 베이킹소다로 하면 좋아요.";
const POST = {
  url: "https://www.instagram.com/p/AbC123/",
  source: "Instagram" as const,
  authorId: "kim",
  title: "Kim on Instagram",
  text: "오늘 쓴 Stanley 퀜처 H2.0 텀블러 후기. 얼음이 하루 종일 가요. 세척은 베이킹소다로 하면 좋아요.",
  pinnedComment: "",
  thumbnailUrl: null,
};

const GOOD = {
  sufficient: true,
  title: "스탠리 텀블러 후기",
  summary: " 얼음이 하루 종일 유지되는 텀블러 후기.\n세척은 베이킹소다가 좋다. ",
  products: ["Stanley 퀜처 H2.0"],
  places: [],
  tip: "베이킹소다로 세척하면 냄새가 덜 남는다",
};

function fakeClient(output: unknown, stop = "end_turn") {
  const parse = vi.fn().mockResolvedValue({ stop_reason: stop, parsed_output: output });
  return { parse, client: { messages: { parse } } };
}

afterEach(() => vi.unstubAllEnvs());

describe("validateOutput", () => {
  it("핵심 요약은 한 문단, 방법과 노하우는 Tip 하나로 정리한다", () => {
    const result = validateOutput(GOOD, SOURCE);
    expect(result.summaryLines).toEqual(["얼음이 하루 종일 유지되는 텀블러 후기. 세척은 베이킹소다가 좋다."]);
    expect(result.keyInfo).toEqual([
      { label: "제품", items: ["Stanley 퀜처 H2.0"] },
      { label: "Tip", items: ["베이킹소다로 세척하면 냄새가 덜 남는다"] },
    ]);
  });

  it("제품명은 원문에 있는 표기 그대로만 남기고, 지어낸 제품은 버린다", () => {
    const result = validateOutput(
      { ...GOOD, products: ["Stanley 퀜처 H2.0", "스탠리 텀블러 40oz", "Hydro Flask"] },
      SOURCE,
    );
    expect(result.keyInfo.find((g) => g.label === "제품")?.items).toEqual(["Stanley 퀜처 H2.0"]);
  });

  it("대소문자·공백 차이는 같은 표기로 본다", () => {
    const result = validateOutput({ ...GOOD, products: ["stanley퀜처 h2.0"] }, SOURCE);
    expect(result.keyInfo[0]).toEqual({ label: "제품", items: ["stanley퀜처 h2.0"] });
  });

  it("확인된 정보가 없는 유형은 만들지 않는다", () => {
    const result = validateOutput({ ...GOOD, products: [], tip: "  " }, SOURCE);
    expect(result.keyInfo).toEqual([]);
  });

  it("정보 부족으로 판단하거나 제목·요약이 비면 정보 부족 오류다", () => {
    expect(() => validateOutput({ ...GOOD, sufficient: false }, SOURCE)).toThrow(InsufficientContentError);
    expect(() => validateOutput(null, SOURCE)).toThrow(InsufficientContentError);
    expect(() => validateOutput({ ...GOOD, summary: " " }, SOURCE)).toThrow(InsufficientContentError);
    expect(() => validateOutput({ ...GOOD, title: " " }, SOURCE)).toThrow(InsufficientContentError);
  });
});

describe("summarizeWithClaude", () => {
  it("가짜 클라이언트로 결과를 만들고 기본 모델을 쓴다", async () => {
    const { parse, client } = fakeClient(GOOD);
    const result = await summarizeWithClaude(POST, client);
    expect(result).toMatchObject({ url: POST.url, authorId: "kim", title: "스탠리 텀블러 후기", originalText: POST.text });
    const params = parse.mock.calls[0][0];
    expect(params.model).toBe(DEFAULT_MODEL);
    expect(DEFAULT_MODEL).toBe("claude-haiku-5-5");
    expect(JSON.stringify(params.messages)).toContain("<post>");
    expect(params.system).toContain("원문에 쓰인 표기 그대로");
    // 전달체 문장 금지, 명사형·단문형, Tip은 "~선택"처럼 간결하게
    expect(params.system).toContain("~했다고 합니다");
    expect(params.system).toContain("명사형·단문형");
    expect(params.system).toContain("~선택하면 됩니다");
  });

  it("고정 댓글을 본문과 함께 전달하고, 고정 댓글에 있는 제품명도 원문 표기 그대로 남긴다", async () => {
    const pinned = "구매 링크: 이코복스 커피 드리퍼 V60-02\n서울 용산구 우사단로14길 4";
    const { parse, client } = fakeClient({ ...GOOD, products: ["이코복스 커피 드리퍼 V60-02", "없는 제품"] });
    const result = await summarizeWithClaude({ ...POST, pinnedComment: pinned }, client);
    const prompt = JSON.stringify(parse.mock.calls[0][0].messages);
    expect(prompt).toContain("<pinned_comment>");
    expect(prompt).toContain("이코복스 커피 드리퍼 V60-02");
    expect(parse.mock.calls[0][0].system).toContain("중복 없이");
    expect(result.keyInfo.find((g) => g.label === "제품")?.items).toEqual(["이코복스 커피 드리퍼 V60-02"]);
    expect(result.originalText).toContain("우사단로14길");
  });

  it("고정 댓글이 없으면 pinned_comment 없이 본문만 전달한다", async () => {
    const { parse, client } = fakeClient(GOOD);
    await summarizeWithClaude(POST, client);
    expect(JSON.stringify(parse.mock.calls[0][0].messages)).not.toContain("pinned_comment");
  });

  it("본문이 비어 있어도 확보한 제목 정보로 모델이 판단하게 한다", async () => {
    const { parse, client } = fakeClient({ ...GOOD, sufficient: false });
    await expect(summarizeWithClaude({ ...POST, text: "" }, client)).rejects.toThrow(InsufficientContentError);
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it("ANTHROPIC_MODEL로 모델을 바꿀 수 있다", async () => {
    vi.stubEnv("ANTHROPIC_MODEL", "claude-sonnet-5-5");
    const { parse, client } = fakeClient(GOOD);
    await summarizeWithClaude(POST, client);
    expect(parse.mock.calls[0][0].model).toBe("claude-sonnet-5-5");
  });

  it("거절·잘림·API 오류는 정보 부족이 아니라 AI 실패다", async () => {
    await expect(summarizeWithClaude(POST, fakeClient(GOOD, "refusal").client)).rejects.toThrow(AiFailedError);
    await expect(summarizeWithClaude(POST, fakeClient(GOOD, "max_tokens").client)).rejects.toThrow(AiFailedError);
    const broken = { messages: { parse: vi.fn().mockRejectedValue(new Error("401")) } };
    await expect(summarizeWithClaude(POST, broken)).rejects.toThrow(AiFailedError);
  });

  it("API 키가 없으면 호출하지 않고 설정 오류를 낸다", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    await expect(summarizeWithClaude(POST)).rejects.toThrow(NotConfiguredError);
  });
});
