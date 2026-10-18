import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // 같은 Wi-Fi의 휴대폰에서 개발 서버(172.30.1.89:3000)를 열 때 개발용 리소스 요청을 허용한다. (개발 모드 전용)
  allowedDevOrigins: ["172.30.1.89"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
