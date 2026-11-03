import { useId, type SVGProps } from "react";
import { InstagramIcon } from "./icons";

/** Instagram 로고를 공식 그라데이션 색으로 그린다. 그라데이션을 아이콘마다 따로 가진다. */
export function InstagramColorIcon(props: SVGProps<SVGSVGElement>) {
  const id = useId();
  return (
    <span className="relative inline-flex">
      <svg width="0" height="0" aria-hidden className="absolute">
        <defs>
          <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#feda75" />
            <stop offset="0.3" stopColor="#fa7e1e" />
            <stop offset="0.55" stopColor="#d62976" />
            <stop offset="0.8" stopColor="#962fbf" />
            <stop offset="1" stopColor="#4f5bd5" />
          </linearGradient>
        </defs>
      </svg>
      <InstagramIcon {...props} style={{ fill: `url(#${id})`, ...props.style }} />
    </span>
  );
}
