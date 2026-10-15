import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  /** 킵박스 고유 색. 선택하지 않았을 때만 적용하고, 선택하면 기본 선택색으로 바뀐다. */
  tone?: { background: string; text: string };
  children: ReactNode;
}

const CHIP_BASE =
  "inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-medium";
const CHIP_SELECTED = "border border-voltage-violet bg-voltage-violet text-white";
const CHIP_IDLE = "border border-mist bg-white text-graphite";

/** 필터·선택용 칩. 선택 상태만 보라색으로 구분하고 킵박스별 색은 쓰지 않는다. */
export function Chip({
  selected = false,
  tone,
  className = "",
  type = "button",
  children,
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`${CHIP_BASE} transition-opacity disabled:opacity-40 ${
        selected ? CHIP_SELECTED : tone ? "border border-transparent" : CHIP_IDLE
      } ${className}`}
      style={!selected && tone ? { backgroundColor: tone.background, color: tone.text } : undefined}
      {...props}
    >
      {children}
    </button>
  );
}

/** 선택 UI와 같은 크기·스타일의 읽기 전용 칩 (상세 화면의 지정된 킵박스 표시) */
export function StaticChip({ children }: { children: ReactNode }) {
  return (
    <span className={`${CHIP_BASE} border border-transparent bg-fog text-graphite`}>
      {children}
    </span>
  );
}

/** 목록 카드 안의 읽기 전용 킵박스 태그 */
export function Tag({
  children,
  className = "bg-fog",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={style}
      className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs text-graphite ${className}`}
    >
      {children}
    </span>
  );
}
