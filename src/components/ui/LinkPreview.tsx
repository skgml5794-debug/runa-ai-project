"use client";

import { Link2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Preview {
  title: string;
  faviconUrl: string | null;
}

const DEBOUNCE_MS = 500;

/**
 * 입력한 링크의 파비콘과 제목을 한 줄로 보여준다. 제목을 누르면 원본 링크가 새 탭에서 열린다.
 * 메타데이터를 못 가져오면(비공개·오류·시간 초과) 주소를 그대로 링크로 보여준다.
 * 같은 줄 높이를 항상 확보해 입력 중에도 화면이 흔들리지 않는다.
 */
export function LinkPreview({ url }: { url: string | null }) {
  // 응답이 어느 주소의 것인지 함께 저장해, 입력이 바뀌면 이전 결과를 쓰지 않는다.
  const [result, setResult] = useState<{ url: string; preview: Preview | null } | null>(null);
  const [failedIcon, setFailedIcon] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      let preview: Preview | null = null;
      try {
        const response = await fetch("/api/link-preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url }),
          signal: controller.signal,
        });
        if (response.ok) {
          const data = (await response.json()) as Partial<Preview>;
          if (typeof data.title === "string" && data.title.trim() !== "") {
            preview = {
              title: data.title,
              faviconUrl: typeof data.faviconUrl === "string" ? data.faviconUrl : null,
            };
          }
        }
      } catch {
        if (controller.signal.aborted) return;
      }
      setResult({ url, preview });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [url]);

  const current = url && result?.url === url ? result : null;
  const preview = current?.preview ?? null;
  const showIcon = preview?.faviconUrl && preview.faviconUrl !== failedIcon;

  return (
    <div className="mb-2 flex h-6 items-center px-1 text-[13px]" aria-live="polite">
      {url && current ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 items-center gap-1.5 text-graphite underline-offset-2 hover:underline"
        >
          {showIcon ? (
            // 외부 사이트 아이콘이라 next/image 최적화 대상이 아니다.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.faviconUrl!}
              alt=""
              width={16}
              height={16}
              className="size-4 shrink-0 rounded-[3px]"
              onError={() => setFailedIcon(preview.faviconUrl)}
            />
          ) : (
            <Link2 className="size-4 shrink-0 text-placeholder" aria-hidden />
          )}
          <span className="truncate">{preview ? preview.title : url}</span>
        </a>
      ) : null}
    </div>
  );
}
