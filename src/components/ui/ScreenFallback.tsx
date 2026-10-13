/** Suspense 대기 중에 보여줄 빈 화면 */
export function ScreenFallback() {
  return <div className="flex-1" aria-busy="true" />;
}
