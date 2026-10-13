"use client";

import { useRouter } from "next/navigation";
import { Fragment, type ReactNode } from "react";

/**
 * Cache Components는 이전 화면을 숨겨서 상태를 보존한다.
 * 링크·push·replace로 새로 이동할 때는 화면 상태(편집 내용, 열린 메뉴, 팝업 등)를 처음부터 시작하고,
 * 브라우저 뒤로/앞으로 가기에서는 이전 상태를 그대로 복원한다.
 * 검색어·정렬 같은 쿼리만 바뀌는 이동은 같은 화면으로 취급되어 상태가 유지된다.
 */
export function FreshScreen({ children }: { children: ReactNode }) {
  const { bfcacheId } = useRouter();
  return <Fragment key={bfcacheId}>{children}</Fragment>;
}
