import Link from "next/link";
import { getAllSports } from "@/lib/sports";
import { getSeason } from "@/lib/data";

export default async function DashboardPage() {
  const sports = getAllSports();
  const season = await getSeason("mbb");

  return (
    <div className="space-y-12">
      <section className="rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-slate-900/90 to-slate-900/50 px-8 py-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Player Rankings
        </h1>
        <p className="mt-4 max-w-xl mx-auto text-lg text-slate-400">
          NCAA Division III composite rankings · {season} season
        </p>
        <p className="mt-2 text-slate-500">
          Global and by conference · Official conference data
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <span className="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 ring-1 ring-slate-700">
            12 sports
          </span>
          <span className="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 ring-1 ring-slate-700">
            30+ conferences
          </span>
          <span className="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 ring-1 ring-slate-700">
            Official data
          </span>
        </div>
      </section>

      <section>
        <h2 className="mb-5 text-base font-bold uppercase tracking-wider text-slate-400">
          Select a sport
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sports.map((s) => (
            <Link
              key={s.code}
              href={`/dashboard/sports/${s.code}`}
              className="group flex items-center gap-5 rounded-2xl border-2 border-slate-700 bg-slate-900/80 p-6 transition hover:border-blue-500/50 hover:bg-slate-800/80"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-600/30 text-lg font-bold text-blue-400 ring-2 ring-blue-500/30 transition group-hover:bg-blue-600/50 group-hover:ring-blue-400/50">
                {s.code.toUpperCase().slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold text-white group-hover:text-blue-200 transition">
                  {s.label}
                </span>
                <span className="block text-sm text-slate-500 mt-0.5">
                  View global & conference rankings
                </span>
              </span>
              <span className="text-2xl text-slate-500 transition group-hover:text-blue-400 group-hover:translate-x-0.5" aria-hidden>
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/50 px-6 py-5 text-center">
        <p className="text-slate-400">
          <span className="font-semibold text-slate-300">Free:</span> Top 25 global + top 5 per conference.{" "}
          <span className="font-semibold text-slate-300">Pro:</span> Full lists, OVR, rank, score, and search after a 7-day free trial.{" "}
          <Link href="/#pricing" className="font-semibold text-blue-400 hover:text-blue-300 underline">
            Try Pro Free
          </Link>
        </p>
      </section>
    </div>
  );
}
