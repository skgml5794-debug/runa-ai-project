/**
 * 홈 카드·시작 화면 아이콘의 공통 틀. 그라데이션·그림자 없이 단색 면으로만 그린다.
 * 면마다 같은 색의 둥근 외곽선(ROUND)을 둘러 하단 메뉴 아이콘처럼 모서리가 둥글게 보이게 한다.
 */
export function ArtGlyph({ children }: { children: React.ReactNode }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="size-8">
      <g transform="translate(16 16) scale(1.12) translate(-16 -16)">{children}</g>
    </svg>
  );
}

/** 색 면에 같은 색 외곽선을 둘러 모서리를 둥글게 만든다. */
export const round = (color: string, width = 3.4) => ({
  fill: color,
  stroke: color,
  strokeWidth: width,
  strokeLinejoin: "round" as const,
});

/** 가보고 싶은 곳: 파란 지도 핀 */
export function PlaceArt() {
  return (
    <ArtGlyph>
      <path
        d="M16 4.5c4.9 0 8.2 3.6 8.2 8 0 5.6-5.7 10-8.2 13.1-2.5-3.1-8.2-7.5-8.2-13.1 0-4.4 3.3-8 8.2-8z"
        {...round("#3f8cff")}
      />
      <circle cx="16" cy="12.5" r="3.6" fill="#fff" />
      <circle cx="16" cy="12.5" r="1.5" fill="#3f8cff" />
    </ArtGlyph>
  );
}

/** 추천 받은 아이템: 보라색 쇼핑백 */
export function ItemArt() {
  return (
    <ArtGlyph>
      <path
        d="M11.5 12V10.5a4.5 4.5 0 0 1 9 0V12"
        fill="none"
        stroke="#b9a0ff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M7.5 12.5h17l-1.3 12a1.5 1.5 0 0 1-1.5 1.3H10.3a1.5 1.5 0 0 1-1.5-1.3z" {...round("#7a4dff")} />
      <circle cx="12.3" cy="16.2" r="1.4" fill="#fff" />
      <circle cx="19.7" cy="16.2" r="1.4" fill="#fff" />
      <path d="M13 21c1.7 1.9 4.3 1.9 6 0" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </ArtGlyph>
  );
}

/** 나중에 써먹을 팁: 청록색 전구 */
export function TipArt() {
  return (
    <ArtGlyph>
      <path
        d="M16 4.5a8 8 0 0 1 4.5 14.6c-.8.6-1.2 1.4-1.2 2.3v.4h-6.6v-.4c0-.9-.4-1.7-1.2-2.3A8 8 0 0 1 16 4.5z"
        {...round("#2fc3dd")}
      />
      <path d="M13.2 12l2.8 3 2.8-3" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 15v4" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
      <rect x="12.8" y="24.5" width="6.4" height="2.6" rx="1.3" {...round("#0f7fa8", 2)} />
    </ArtGlyph>
  );
}
