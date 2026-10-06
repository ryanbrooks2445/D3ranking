"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive, type NavItem } from "@/lib/nav";

export function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname() ?? "/";
  return (
    <>
      {items.map((item) => {
        const active = isNavActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`relative flex h-full items-center px-3 text-sm font-medium transition-colors ${
              active ? "text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {item.label}
            {active && (
              <span className="absolute inset-x-3 -bottom-px hidden h-0.5 bg-blue-500 md:block" aria-hidden />
            )}
          </Link>
        );
      })}
    </>
  );
}
