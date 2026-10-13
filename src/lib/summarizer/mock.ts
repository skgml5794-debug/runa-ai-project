import { extractAuthorId, parseLink } from "../link";
import type { SummaryResult } from "../types";
import type { LinkSummarizer } from "./types";

/**
 * 임시 mock 요약 서비스. 외부 호출과 비용이 발생하지 않는다.
 *
 * 테스트용 입력 규칙 (링크 안에 해당 단어가 들어 있으면 동작한다)
 * - `fail`: 요약 실패를 재현한다. (오류 팝업 확인용)
 * - `hang`: 응답하지 않는다. (30초 시간 초과 확인용)
 * - Threads 링크는 썸네일이 없는 결과를 반환한다. (기본 이미지 확인용)
 */

function gradientThumbnail(from: string, to: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
    `</linearGradient></defs><rect width="400" height="400" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

type Sample = Omit<SummaryResult, "url" | "source" | "authorId" | "thumbnailUrl"> & {
  thumbnail: string;
};

const SAMPLES: Sample[] = [
  {
    thumbnail: gradientThumbnail("#ebdafd", "#ad6df4"),
    title: "성수동 신상 카페 3곳 한 번에 정리",
    summaryLines: [
      "성수동에 새로 문을 연 카페 3곳을 분위기와 대표 메뉴 기준으로 비교했다.",
      "첫 번째 카페는 로스터리를 겸해 원두를 직접 볶고, 드립 커피가 강점이다.",
      "두 번째 카페는 디저트 중심이며 주말 오후에는 대기가 1시간 이상 걸린다.",
      "세 번째 카페는 좌석 간격이 넓어 작업이나 미팅에 적합하다.",
      "평일 오전 방문이 가장 한적하다.",
    ],
    keyInfo: [
      { label: "장소", items: ["성수동 연무장길 카페 A", "성수동 아차산로 카페 B", "서울숲 인근 카페 C"] },
      { label: "제품", items: ["싱글 오리진 드립 커피", "바스크 치즈케이크"] },
      { label: "노하우", items: ["평일 오전 10시 이전 방문하면 대기가 거의 없다."] },
    ],
    originalText:
      "성수동 신상 카페 3곳 정리. A는 로스터리 카페, B는 디저트 맛집, C는 작업하기 좋은 넓은 카페. 평일 오전 추천. 주말 대기 1시간.",
  },
  {
    thumbnail: gradientThumbnail("#d6fcf4", "#6fd3c1"),
    title: "하루 15분 홈트 루틴, 이렇게 시작하세요",
    summaryLines: [
      "기구 없이 하루 15분으로 전신을 단련하는 홈트레이닝 루틴을 소개한다.",
      "스쿼트, 플랭크, 푸시업을 40초 운동과 20초 휴식으로 3세트 반복한다.",
      "시작 주에는 횟수보다 정확한 자세를 우선한다.",
      "운동 후 5분 스트레칭으로 근육통을 줄인다.",
    ],
    keyInfo: [
      { label: "방법", items: ["40초 운동 + 20초 휴식 × 3세트", "운동 후 5분 스트레칭"] },
      { label: "노하우", items: ["첫 주는 횟수보다 자세에 집중한다.", "같은 시간대에 해야 습관이 된다."] },
    ],
    originalText:
      "하루 15분 홈트 루틴. 스쿼트 플랭크 푸시업 40초 운동 20초 휴식 3세트. 첫 주는 자세에 집중. 운동 후 스트레칭 5분.",
  },
  {
    thumbnail: gradientThumbnail("#fde8f3", "#f59ac8"),
    title: "건성 피부를 위한 겨울철 보습 제품 추천",
    summaryLines: [
      "건조해지는 겨울철에 쓰기 좋은 보습 제품을 단계별로 추천한다.",
      "세안 직후 3분 안에 토너와 에센스를 바르면 수분 손실을 줄일 수 있다.",
      "크림은 세라마이드 성분이 들어간 제품이 장벽 회복에 도움이 된다.",
      "마지막에 페이스 오일을 한두 방울 덧바르면 보습이 오래간다.",
      "각질 제거는 주 1회 이하로 줄인다.",
      "난방이 강한 실내에서는 가습기를 함께 쓰는 것이 좋다.",
    ],
    keyInfo: [
      { label: "제품", items: ["세라마이드 장벽 크림", "히알루론산 에센스", "스쿠알란 페이스 오일"] },
      { label: "방법", items: ["세안 후 3분 안에 토너 → 에센스 → 크림 → 오일 순서로 바른다."] },
    ],
    originalText:
      "겨울 보습 루틴. 세안 직후 3분 안에 토너 에센스. 세라마이드 크림 추천. 페이스 오일 마무리. 각질 제거 주 1회. 가습기 사용.",
  },
  {
    thumbnail: gradientThumbnail("#fff1d6", "#f5b95a"),
    title: "도쿄 2박 3일 여행에서 꼭 알아야 할 것들",
    summaryLines: [
      "도쿄 2박 3일 일정에서 이동과 예산을 아끼는 방법을 정리했다.",
      "교통은 지하철 24시간권보다 IC 카드 충전이 대부분 더 유리하다.",
      "아사쿠사와 우에노는 같은 날 묶어서 걷는 동선이 효율적이다.",
      "식사는 편의점과 규동 체인을 섞으면 하루 3천 엔 이하로 가능하다.",
    ],
    keyInfo: [
      { label: "장소", items: ["아사쿠사 센소지", "우에노 공원", "시부야 스크램블 교차로"] },
      { label: "노하우", items: ["IC 카드는 공항에서 바로 발급하고 모바일로 충전한다.", "점심 시간을 피하면 대기가 짧다."] },
    ],
    originalText:
      "도쿄 2박3일 팁. IC카드 충전, 아사쿠사 우에노 같은 날, 규동 편의점으로 식비 절약, 시부야 야경.",
  },
];

function hash(input: string): number {
  let value = 0;
  for (let i = 0; i < input.length; i += 1) {
    value = (value * 31 + input.charCodeAt(i)) >>> 0;
  }
  return value;
}

export class MockLinkSummarizer implements LinkSummarizer {
  constructor(private readonly delayMs = 1600) {}

  async summarize(url: string): Promise<SummaryResult> {
    const lowered = url.toLowerCase();
    if (lowered.includes("hang")) {
      return new Promise<SummaryResult>(() => {});
    }
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    if (lowered.includes("fail")) {
      throw new Error("Mock summarizer failure");
    }

    const parsed = parseLink(url);
    if (!parsed) throw new Error("Unsupported link");

    const seed = hash(url);
    const sample = SAMPLES[seed % SAMPLES.length];
    return {
      url: parsed.url,
      source: parsed.source,
      // 실제 서비스와 같이 주소에서 읽은 아이디만 쓰고, 알 수 없으면 비워 둔다.
      authorId: extractAuthorId(parsed.url),
      thumbnailUrl: parsed.source === "Threads" ? null : sample.thumbnail,
      title: sample.title,
      summaryLines: [...sample.summaryLines],
      keyInfo: sample.keyInfo.map((group) => ({
        label: group.label,
        items: [...group.items],
      })),
      originalText: sample.originalText,
    };
  }
}
