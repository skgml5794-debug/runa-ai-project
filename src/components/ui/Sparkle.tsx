import { useId } from "react";

/** 큰 별 + 작은 별 모양의 AI 아이콘 (블루 그레이 그라데이션) */
export function Sparkle({
  className = "",
  float = false,
  spread = false,
}: {
  className?: string;
  /** 두 별이 서로 다른 주기로 위아래로 떠오른다. */
  float?: boolean;
  /** 작은 별을 큰 별에서 떨어뜨려, 움직여도 서로 붙지 않게 한다. */
  spread?: boolean;
}) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={`overflow-visible ${className}`}>
      <defs>
        <linearGradient id={id} x1="10" y1="10" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9fb0c6" />
          <stop offset="1" stopColor="#4b5a70" />
        </linearGradient>
      </defs>
      <g className={float ? "animate-float-a motion-reduce:animate-none" : undefined}>
      <path
        fill={`url(#${id})`}
        stroke={`url(#${id})`}
        strokeWidth="4"
        strokeLinejoin="round"
        d="M26 14c1.6 9.6 5.4 13.4 15 15-9.6 1.6-13.4 5.4-15 15-1.6-9.6-5.4-13.4-15-15 9.6-1.6 13.4-5.4 15-15Z"
      />
      </g>
      <g transform={spread ? "translate(12 -6)" : undefined}>
        <g className={float ? "animate-float-b motion-reduce:animate-none" : undefined}>
          <path
            fill={`url(#${id})`}
            stroke={`url(#${id})`}
            strokeWidth="3"
            strokeLinejoin="round"
            d="M47 8c.8 4.8 2.7 6.7 7.5 7.5-4.8.8-6.7 2.7-7.5 7.5-.8-4.8-2.7-6.7-7.5-7.5C44.3 14.7 46.2 12.8 47 8Z"
          />
        </g>
      </g>
    </svg>
  );
}

/** 서브타이틀 앞에 붙이는 작은 별 하나 (홈의 큰 별과 같은 모양) */
export function SparkleStar({ className = "" }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="8 8 40 40" aria-hidden className={className}>
      <defs>
        <linearGradient id={id} x1="10" y1="10" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9fb0c6" />
          <stop offset="1" stopColor="#4b5a70" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        stroke={`url(#${id})`}
        strokeWidth="4"
        strokeLinejoin="round"
        d="M26 14c1.6 9.6 5.4 13.4 15 15-9.6 1.6-13.4 5.4-15 15-1.6-9.6-5.4-13.4-15-15 9.6-1.6 13.4-5.4 15-15Z"
      />
    </svg>
  );
}

/** 메시지를 읽는 듯한 말풍선 솔리드 아이콘 (블루 그레이 그라데이션) */
export function MessageGlyph({ className = "" }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={className}>
      <defs>
        <linearGradient id={id} x1="20" y1="10" x2="100" y2="110" gradientUnits="userSpaceOnUse">
          <stop stopColor="#b8c4d4" stopOpacity="0.55" />
          <stop offset="1" stopColor="#4b5a70" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="M30 12h60a20 20 0 0 1 20 20v36a20 20 0 0 1-20 20H64L40 108V88h-10A20 20 0 0 1 10 68V32A20 20 0 0 1 30 12Z"
      />
      <g fill="#fff" className="animate-pulse">
        <rect x="30" y="30" width="60" height="8" rx="4" opacity="0.9" />
        <rect x="39" y="46" width="42" height="8" rx="4" opacity="0.7" />
        <rect x="34" y="62" width="52" height="8" rx="4" opacity="0.5" />
      </g>
    </svg>
  );
}
