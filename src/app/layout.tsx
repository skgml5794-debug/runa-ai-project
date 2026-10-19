import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { AmplitudeInit } from "@/components/AmplitudeInit";
import { AppFrame } from "@/components/AppFrame";

export const metadata: Metadata = {
  title: "킵노트",
  description: "Instagram/Threads 링크를 요약·정리해 저장하는 킵노트",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
