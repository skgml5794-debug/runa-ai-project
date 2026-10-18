"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BoxIcon, HomeIcon, NoteIcon } from "./ui/icons";

const ITEMS = [
  { href: "/", label: "홈", Icon: HomeIcon },
  { href: "/notes", label: "킵노트", Icon: NoteIcon },
  { href: "/categories", label: "카테고리", Icon: BoxIcon },
] as const;

/** 홈·킵노트·카테고리 화면에서만 표시한다. 로딩·요약 결과·상세·수정 화면에서는 숨긴다. */
export function BottomNav() {
  const pathname = usePathname();
  if (!ITEMS.some((item) => item.href === pathname)) return null;

  return (
    <nav
      aria-label="하단 메뉴"
      className="sticky bottom-0 z-20 shrink-0 border-t border-[#e9edf2] bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-3">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[69px] flex-col items-center justify-start gap-1 pt-2.5 text-xs font-medium ${
                  active ? "text-voltage-violet" : "text-[#b4bcc9]"
                }`}
              >
                <Icon className="size-6" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
