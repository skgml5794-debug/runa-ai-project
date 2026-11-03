import Link from "next/link";

/** 앱 로고: K 심볼. 배경 없는 이미지를 마스크로 써서 글자색으로 칠한다. */
export function Logo({
  className = "h-4 w-[15.5px]",
  tone = "bg-midnight-ink",
}: {
  className?: string;
  tone?: string;
}) {
  return (
    <span
      role="img"
      aria-label="킵노트"
      className={`block ${tone} ${className}`}
      style={{
        maskImage: "url(/logo-k.png)",
        WebkitMaskImage: "url(/logo-k.png)",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

/** 로고를 누르면 홈으로 이동한다. 홈·킵노트·카테고리 화면 상단에 같은 위치로 둔다. */
export function HomeLogoLink({
  className = "",
  tone,
}: {
  className?: string;
  tone?: string;
}) {
  return (
    <Link href="/" aria-label="홈으로 이동" className={`block w-fit ${className}`}>
      <Logo tone={tone} />
    </Link>
  );
}
