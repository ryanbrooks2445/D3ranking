import Link from "next/link";
import { getAllSports } from "@/lib/sports";
import { CheckoutButton } from "@/components/CheckoutButton";
import { getSeason } from "@/lib/data";

export default async function Home() {
  const sports = getAllSports();
  const season = await getSeason("mbb");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 min-h-[3.5rem] max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:h-16 sm:px-6">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-white"
          >
            D3 Rankings
          </Link>
          <nav className="flex items-center">
            <Link
              href="/dashboard"
              className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              View rankings
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-20">
        <section className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            NCAA Division III
            <br />
            <span className="text-blue-400">Composite Player Rankings</span>
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-lg text-slate-400 leading-relaxed">
            Data pulled from official conference sites. One place to compare
            players across 12 sports and 30+ D3 conferences. Free preview;
            unlock full lists, OVR, rank, and search with Pro.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="min-h-[48px] rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white transition hover:bg-blue-500"
            >
              Browse rankings
            </Link>
            <CheckoutButton className="min-h-[48px] rounded-lg border border-slate-600 bg-slate-800/50 px-6 py-3 text-base font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800">
              Start 7-day free trial
            </CheckoutButton>
          </div>
        </section>

        <section className="mt-16 sm:mt-20">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-center">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-5">
              <span className="text-2xl font-bold text-white">12</span>
              <span className="block text-sm text-slate-400 mt-0.5">Sports</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-5">
              <span className="text-2xl font-bold text-white">30+</span>
              <span className="block text-sm text-slate-400 mt-0.5">Conferences</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-5">
              <span className="text-2xl font-bold text-white">Official</span>
              <span className="block text-sm text-slate-400 mt-0.5">Conference data</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-5">
              <span className="text-2xl font-bold text-white">{season}</span>
              <span className="block text-sm text-slate-400 mt-0.5">Season</span>
            </div>
          </div>
        </section>

        <section className="mt-16 sm:mt-20">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Browse by sport
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {sports.map((s) => (
              <Link
                key={s.code}
                href={`/dashboard/sports/${s.code}`}
                className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4 transition hover:border-slate-600 hover:bg-slate-800/50"
              >
                <span className="font-medium text-white">{s.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section
          id="pricing"
          className="mt-16 sm:mt-20 rounded-2xl border border-slate-800 bg-slate-900/40 p-8"
        >
          <h2 className="text-lg font-semibold text-white">Pricing</h2>
          <p className="mt-2 text-slate-400">
            Free: Top 25 global + top 5 per conference. Pro: Full lists, OVR, rank, and search.
          </p>
          <p className="mt-3 text-lg font-medium text-white">
            $19.99/year · 7-day free trial
          </p>
          <CheckoutButton className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500">
            Start free trial
          </CheckoutButton>
        </section>
      </main>
    </div>
  );
}
