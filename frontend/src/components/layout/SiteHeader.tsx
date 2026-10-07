import Link from "next/link";
import { isPro } from "@/lib/auth";
import { PRIMARY_NAV } from "@/lib/nav";
import { NavLinks } from "@/components/layout/NavLinks";
import { MobileNav } from "@/components/layout/MobileNav";
import { SearchInput } from "@/components/ui/SearchInput";

export async function SiteHeader() {
  const pro = await isPro();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0b1220]/95 backdrop-blur-sm">
      <div className="site-container relative flex h-14 items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center text-lg font-black tracking-tight text-white">
          D3<span className="text-blue-500">Rank</span>
        </Link>

        <nav className="hidden h-full items-stretch md:flex" aria-label="Primary">
          <NavLinks items={PRIMARY_NAV} />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SearchInput className="hidden w-64 md:block" />
          {pro ? (
            <Link
              href="/dashboard/settings"
              className="hidden h-9 items-center rounded border border-emerald-500/40 px-3 text-xs font-semibold text-emerald-400 md:flex"
            >
              Pro
            </Link>
          ) : (
            <Link
              href="/#pricing"
              className="hidden h-9 items-center rounded bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-500 md:flex"
            >
              Get Pro
            </Link>
          )}
          <MobileNav items={PRIMARY_NAV} isPro={pro} />
        </div>
      </div>
    </header>
  );
}
