"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isNavActive, type NavItem } from "@/lib/nav";
import { SearchInput } from "@/components/ui/SearchInput";

export function MobileNav({ items, isPro }: { items: NavItem[]; isPro: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-11 w-11 items-center justify-center text-slate-300 hover:text-white"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          {open ? (
            <path d="M4 4l12 12M16 4L4 16" strokeLinecap="round" />
          ) : (
            <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
          )}
        </svg>
      </button>
      {open && (
        <div id="mobile-nav" className="absolute inset-x-0 top-full border-b border-slate-800 bg-[#0b1220] shadow-lg">
          <div className="site-container px-4 py-3">
            <SearchInput className="mb-3" />
            <nav className="flex flex-col divide-y divide-slate-800" aria-label="Primary">
              {items.map((item) => {
                const active = isNavActive(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-[44px] items-center justify-between py-2 text-base ${
                      active ? "font-semibold text-white" : "text-slate-300"
                    }`}
                  >
                    {item.label}
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden />}
                  </Link>
                );
              })}
              <Link href="/dashboard/settings" className="flex min-h-[44px] items-center py-2 text-base text-slate-300">
                {isPro ? "Account" : "Pro"}
              </Link>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
