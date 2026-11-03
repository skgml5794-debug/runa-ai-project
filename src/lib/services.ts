/** 링크를 가져올 수 있는 서비스. 모바일에서는 앱을 먼저 열고, 데스크톱에서는 새 탭으로 연다. */
export const SERVICES = [
  {
    key: "instagram",
    label: "인스타그램",
    web: "https://www.instagram.com",
    app: {
      androidIntent: "intent://www.instagram.com/#Intent;scheme=https;package=com.instagram.android;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.instagram.android;end",
      iosApp: "https://www.instagram.com/",
      iosFallback: "https://www.instagram.com/",
    },
  },
  {
    key: "threads",
    label: "스레드",
    web: "https://www.threads.com",
    app: {
      androidIntent: "intent://www.threads.com/#Intent;scheme=https;package=com.instagram.barcelona;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.instagram.barcelona;end",
      iosApp: "https://www.threads.com/",
      iosFallback: "https://www.threads.com/",
    },
  },
] as const;
