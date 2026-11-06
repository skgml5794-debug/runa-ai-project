import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { AmplitudeInit } from "@/components/AmplitudeInit";
import { AppFrame } from "@/components/AppFrame";

export const metadata: Metadata = {
  title: "킵노트",
  description: "Instagram/Threads 링크를 요약·정리해 저장하는 킵노트",
  // 앱 주소를 메신저·SNS에 붙여넣을 때 보이는 미리보기 제목. 브라우저 탭 제목(title)은 그대로 둔다.
  openGraph: {
    title: "킵노트 - 저장은 가볍게, 찾기는 쉽게",
    siteName: "킵노트",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "킵노트 - 저장은 가볍게, 찾기는 쉽게",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // 모바일 브라우저의 상태 표시줄·외곽 영역 색
  themeColor: "#ffffff",
  // Android Chrome: 키보드가 열리면 화면(레이아웃)이 줄어들어 입력창·버튼이 가려지지 않는다.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="min-h-full antialiased">
      <body className="min-h-full">
        <AmplitudeInit />
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
