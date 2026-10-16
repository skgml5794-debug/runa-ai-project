/** 앱 로고: K 심볼. 배경 없는 이미지를 마스크로 써서 연한 회색으로 칠한다. */
export function Logo() {
  return (
    <span
      role="img"
      aria-label="킵노트"
      className="block h-4 w-[15.5px] bg-[#b4bcc9]"
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
