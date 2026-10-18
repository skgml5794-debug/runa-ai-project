import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  /** 카테고리 고유 색 */
  tone?: { background: string; text: string };
  /** 선택하지 않은 칩을 카테고리 색 대신 회색 라인으로 보여준다. 선택하면 카테고리 색이 나온다. */
  outline?: boolean;
  /** 목록 화면용으로 조금 작게 (높이 40px, 글자 13px) */
  compact?: boolean;
  children: ReactNode;
}

const CHIP_BASE =
  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium";
const CHIP_SIZE = "min-h-11 px-4 text-sm";
const CHIP_SIZE_COMPACT = "min-h-10 px-3.5 text-[13px]";
const CHIP_SELECTED = "border border-voltage-violet bg-voltage-violet text-white";
const CHIP_IDLE = "border border-mist bg-white text-graphite";

/** 필터·선택용 칩. 선택 상태만 보라색으로 구분하고 카테고리별 색은 쓰지 않는다. */
export function Chip({
  selected = false,
  tone,
  outline = false,
  compact = false,
  className = "",
  type = "button",
  children,
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`${CHIP_BASE} ${compact ? CHIP_SIZE_COMPACT : CHIP_SIZE} transition-opacity disabled:opacity-40 ${
        selected
          ? tone
            ? "border border-transparent"
            : CHIP_SELECTED
          : tone && !outline
            ? "border border-transparent"
            : CHIP_IDLE
      } ${className}`}
      style={
        tone && (selected || !outline)
          ? { backgroundColor: tone.background, color: tone.text }
          : undefined
      }
      {...props}
    >
      {children}
    </button>
  );
}

/** 선택 UI와 같은 크기·스타일의 읽기 전용 칩 (상세 화면의 지정된 카테고리 표시) */
export function StaticChip({
  children,
  tone,
}: {
  children: ReactNode;
  /** 카테고리 고유 색 */
  tone?: { background: string; text: string };
}) {
  return (
    <span
      style={tone ? { backgroundColor: tone.background, color: tone.text } : undefined}
      className={`${CHIP_BASE} ${CHIP_SIZE} border border-transparent ${tone ? "" : "bg-fog text-graphite"}`}
    >
      {children}
    </span>
  );
}

/** 목록 카드 안의 읽기 전용 카테고리 태그 */
export function Tag({
  children,
  className = "bg-fog",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs text-graphite ${className}`}
    >
      {children}
    </span>
  );
}
