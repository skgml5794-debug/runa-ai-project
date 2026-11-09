import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "soft" | "ghost" | "dark" | "danger";
type Size = "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white",
  soft: "bg-fog text-graphite",
  dark: "bg-midnight-ink text-white",
  danger: "bg-danger text-white",
  ghost: "border border-midnight-ink bg-transparent text-midnight-ink",
};

const SIZES: Record<Size, string> = {
  md: "px-6 py-4 text-base",
  sm: "px-4 py-3 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`min-h-11 rounded-xl font-semibold transition-opacity disabled:opacity-40 ${
        VARIANTS[variant]
      } ${SIZES[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    />
  );
}

/** 팝업(다이얼로그·시트)의 버튼 글자: 15px, 굵기 500. 팝업마다 같은 크기로 보이도록 모든 팝업 버튼에 쓴다. */
export const POPUP_BUTTON_TEXT = "!text-[15px] !font-medium";
