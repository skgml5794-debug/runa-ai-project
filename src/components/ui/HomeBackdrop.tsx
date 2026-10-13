import { useId } from "react";

/**
 * 홈 상단 배경. 서로 겹치는 비정형 덩어리(블루 계열과 라벤더 계열)를 크게 흐려서
 * 흰 여백 없이 자연스럽게 섞이게 하고, 아래쪽으로 갈수록 흰색으로 사라진다.
 */
export function HomeBackdrop() {
  const id = useId();
  const blur = `${id}-blur`;
  const base = `${id}-base`;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -top-[90px] h-[62%] overflow-hidden opacity-50 [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]"
    >
      <svg
        viewBox="0 0 400 520"
        preserveAspectRatio="none"
        className="size-full"
      >
        <defs>
          <filter id={blur} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="34" />
          </filter>
          <linearGradient id={base} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9d2ff" stopOpacity="0.7" />
            <stop offset="1" stopColor="#e3d6fb" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {/* 바탕: 덩어리 사이에 흰 틈이 생기지 않게 전체를 옅게 채운다 */}
        <rect width="400" height="520" fill={`url(#${base})`} />
        <g filter={`url(#${blur})`}>
          <path
            fill="#8496ff"
            fillOpacity="0.55"
            d="M-60 -30C90 -60 250 -10 262 120C272 235 140 262 56 296C-30 330 -90 120 -60 -30Z"
          />
          <path
            fill="#b070f4"
            fillOpacity="0.45"
            d="M190 -40C320 -60 470 -10 462 140C456 250 340 238 292 190C236 134 146 52 190 -40Z"
          />
          <path
            fill="#96a0ff"
            fillOpacity="0.45"
            d="M40 170C130 112 318 138 366 262C398 352 280 416 168 396C54 376 -26 262 40 170Z"
          />
          <path
            fill="#c4aafa"
            fillOpacity="0.45"
            d="M-50 300C46 252 160 330 224 384C290 442 168 536 62 512C-34 490 -96 360 -50 300Z"
          />
          <path
            fill="#a0b0ff"
            fillOpacity="0.4"
            d="M214 322C304 268 452 322 462 432C468 516 340 548 262 496C180 442 154 372 214 322Z"
          />
        </g>
      </svg>
    </div>
  );
}
