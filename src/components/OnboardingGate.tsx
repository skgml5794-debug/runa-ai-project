"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useOnboarded } from "@/lib/onboarding";

/** 처음 방문한 사람은 어느 주소로 들어와도 온보딩을 먼저 보여준다. */
export function OnboardingGate() {
  const pathname = usePathname();
  const router = useRouter();
  const onboarded = useOnboarded();
  const needsOnboarding = onboarded === false && pathname !== "/onboarding";
  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding, router]);
  return null;
}
