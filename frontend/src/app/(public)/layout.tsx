import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="site-container flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="text-xl font-black tracking-tight text-white">
            D3<span className="text-blue-500">Rank</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-400">
            <Link href="/search" className="hover:text-white">
              Search
            </Link>
            <Link href="/dashboard" className="hover:text-white">
              Rankings
            </Link>
          </nav>
        </div>
      </header>
      <main className="site-container px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
