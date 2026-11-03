"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { linkType, trackBoth } from "@/lib/analytics";
import { MESSAGES } from "@/lib/constants";
import { parseLink } from "@/lib/link";
import { SESSION_KEYS, setSession } from "@/lib/session";
import { useToast } from "./ui/Toast";

const PROMPT_PATHS = ["/", "/notes", "/categories"];
const LAST_KEY = "keepnote:clipboardPrompted";

/**
 * 링크를 복사하고 킵노트로 돌아왔을 때, 복사한 링크가 Instagram/Threads 게시물이면 토스트로 물어본다.
 * 토스트를 누르면 홈에서 링크를 제출한 것과 같은 순서(로딩 → 요약)로 이어진다.
 * 클립보드를 읽을 수 없거나(권한 거부 등) 링크가 아니면 아무것도 하지 않는다. 같은 링크는 한 번만 묻는다.
 */
export function ClipboardLinkPrompt() {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const check = async () => {
      if (document.visibilityState !== "visible" || !PROMPT_PATHS.includes(pathRef.current)) return;
      try {
        if (!navigator.clipboard?.readText) return;
        const parsed = parseLink((await navigator.clipboard.readText()).trim());
        if (!parsed || window.sessionStorage.getItem(LAST_KEY) === parsed.url) return;
        window.sessionStorage.setItem(LAST_KEY, parsed.url);
        toast.show(MESSAGES.clipboardLink, () => {
          // 홈 입력창에서 제출한 것과 같은 Link Submitted 이벤트로 보낸다.
          trackBoth("Link Submitted", {
            link_type: linkType(parsed.source),
            input_method: "clipboard",
            prefilled: false,
          });
          setSession(SESSION_KEYS.pendingUrl, parsed.url);
          router.push("/loading");
        });
      } catch {
        // 클립보드를 읽을 수 없으면 건너뛴다.
      }
    };
    // 앱 전환(모바일)·창 전환(데스크톱)으로 돌아올 때와, 복사한 뒤 화면을 처음 열 때 확인한다.
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    void check();
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [router, toast]);

  return null;
}
