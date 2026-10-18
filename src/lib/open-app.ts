import type { Source } from "./types";

/**
 * 모바일에서 브라우저보다 앱을 먼저 연다. 앱이 없으면 fallback 주소(스토어나 웹)로 이동한다.
 * - Android: intent 주소. 앱이 없으면 Chrome이 Play 스토어로 보낸다.
 * - iOS: 앱 주소(scheme)를 열어 보고, 잠시 뒤에도 화면이 그대로면 fallback으로 이동한다.
 * 데스크톱이면 false를 돌려주므로 호출한 쪽이 기본 동작(새 탭)을 그대로 두면 된다.
 */
export interface AppTarget {
  androidIntent: string;
  iosApp: string;
  /** iOS에서 앱이 열리지 않을 때 이동할 주소 (앱 스토어 또는 웹) */
  iosFallback: string;
}

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function launchApp(target: AppTarget): boolean {
  const ua = navigator.userAgent;
  const ios = isIOS();
  if (/Android/.test(ua)) {
    window.location.href = target.androidIntent;
    return true;
  }
  if (!ios) return false;

  // 앱 주소와 대체 주소가 같으면(유니버설 링크) iOS가 알아서 앱 또는 브라우저로 처리하므로 기다릴 필요가 없다.
  if (target.iosApp === target.iosFallback) {
    window.location.href = target.iosApp;
    return true;
  }

  let left = false;
  const markLeft = () => {
    left = true;
  };
  // 앱이 열리면 이 화면이 가려지거나 포커스를 잃는다.
  document.addEventListener("visibilitychange", markLeft, { once: true });
  window.addEventListener("pagehide", markLeft, { once: true });
  window.addEventListener("blur", markLeft, { once: true });
  window.location.href = target.iosApp;
  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", markLeft);
    window.removeEventListener("pagehide", markLeft);
    window.removeEventListener("blur", markLeft);
    if (!left && document.visibilityState === "visible") {
      window.location.href = target.iosFallback;
    }
  }, 1500);
  return true;
}

const SHORTCODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Instagram 게시물 주소의 shortcode를 앱이 쓰는 숫자 id로 바꾼다. 알 수 없으면 null */
export function instagramMediaId(url: string): string | null {
  const code = /\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/.exec(new URL(url).pathname)?.[1];
  if (!code || code.length > 11) return null;
  let id = BigInt(0);
  for (const char of code) {
    const value = SHORTCODE_ALPHABET.indexOf(char);
    if (value === -1) return null;
    id = id * BigInt(64) + BigInt(value);
  }
  return id.toString();
}

/** 저장한 게시물의 원본 링크를 앱에서 연다. 데스크톱이면 false (기본 링크 동작 유지) */
export function openPostInApp(url: string, source: Source): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const path = `${parsed.host}${parsed.pathname}${parsed.search}`;
  if (source === "Instagram") {
    const mediaId = instagramMediaId(url);
    return launchApp({
      androidIntent: `intent://${path}#Intent;scheme=https;package=com.instagram.android;end`,
      // iOS는 https 주소(유니버설 링크)를 웹 페이지에서 열면 브라우저로 열리는 경우가 많아서, 앱 전용 주소로 게시물을 직접 연다.
      // (이때 iOS가 "열겠습니까?" 확인창을 띄우는 것은 웹사이트에서 없앨 수 없다.) 앱이 안 열리면 웹 주소로 이동한다.
      iosApp: mediaId ? `instagram://media?id=${mediaId}` : url,
      iosFallback: url,
    });
  }
  return launchApp({
    androidIntent: `intent://${path}#Intent;scheme=https;package=com.instagram.barcelona;end`,
    iosApp: url,
    iosFallback: url,
  });
}
