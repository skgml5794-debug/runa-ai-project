"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { completeOnboarding, startOnboardingExit } from "@/lib/onboarding";
import { Button } from "../ui/Button";

/** 강조색. 제목 강조와 번호 박스가 같은 색을 쓴다. */
const ACCENT = "#1CC98A";

const STEPS: {
  title: string;
  description: string;
}[] = [
  {
    title: "인스타그램·스레드 링크 가져오기",
    description: "본문에 정보가 포함된 글만 가져올 수 있어요.",
  },
  {
    title: "AI 요약 확인하기",
    description: "AI가 핵심내용을 잘 요약했는지 확인하거나,\n직접 편집할 수 있어요.",
  },
  {
    title: "검색어로 찾기",
    description: "정보가 필요한 순간, 검색어로\n손쉽게 찾아볼 수 있어요.",
  },
];

/** 시작 화면 내용. 화면과, 홈으로 넘어갈 때 사라지는 잔상이 같은 모양을 쓴다. */
export function OnboardingContent({ onStart }: { onStart?: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <h1 className="text-[24px] font-bold leading-[1.45] tracking-[-0.3px] text-midnight-ink">
          SNS에서 발견한
          <br />
          <span style={{ color: ACCENT }}>정보를 요약해 저장</span>하고,
          <br />
          필요한 순간
          <br />
          키워드로 쉽게 찾아요
        </h1>
        <ul className="mt-9 space-y-5">
          {STEPS.map(({ title, description }, index) => (
            <li key={title} className="flex items-start gap-4">
              <span
                aria-hidden
                className="mt-[3px] flex size-[22px] shrink-0 items-center justify-center rounded-[7px] text-xs font-bold"
                style={{ background: `${ACCENT}1f`, color: ACCENT }}
              >
                {index + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[15px] font-semibold text-midnight-ink">{title}</p>
                <p className="mt-1 whitespace-pre-line break-keep text-[15px] leading-[1.5] text-placeholder">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <Button fullWidth className="min-h-14 rounded-2xl" onClick={onStart}>
        시작하기
      </Button>
    </div>
  );
}

/** 처음 방문한 사람에게만 한 번 보여주는 시작 안내. 열리는 순간 본 것으로 기록한다. */
export function OnboardingScreen() {
  const router = useRouter();
  useEffect(() => {
    completeOnboarding();
  }, []);

  return (
    <OnboardingContent
      onStart={() => {
        // 이 화면은 바로 사라지고, 같은 모양의 잔상이 서서히 사라지면서 홈이 서서히 나타난다.
        startOnboardingExit();
        router.replace("/");
      }}
    />
  );
}
