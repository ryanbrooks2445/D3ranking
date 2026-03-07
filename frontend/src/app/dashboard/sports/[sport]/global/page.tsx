import { readDataFileSafe } from "@/lib/data";
import Link from "next/link";
import { getSport } from "@/lib/sports";
import { isPro } from "@/lib/auth";
import { SportPlayerRankingsTable } from "@/components/SportPlayerRankingsTable";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string }>;
}): Promise<Metadata> {
  const { sport } = await params;
  const def = getSport(sport.toLowerCase());
  const label = def?.label ?? sport.toUpperCase();
  return {
    title: `Global rankings — ${label} | D3 Rankings`,
  };
}

export default async function GlobalRankingsPage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  const code = sport.toLowerCase();
  const def = getSport(code);
  const pro = await isPro();

  const isMbb = code === "mbb";
  let rows: Record<string, unknown>[] = [];

  if (isMbb) {
    const raw = await readDataFileSafe("d3_mbb_player_rankings_2025_26.json");
    if (raw) {
      const d3Rows = JSON.parse(raw) as Record<string, unknown>[];
      rows = d3Rows.map((r) => ({
        ...r,
        points_per_game: r.ppg,
        rebounds_per_game: r.rpg,
        assists_per_game: r.apg,
        turnovers_per_game: r.tov_pg,
        steals_per_game: r.spg,
        blocked_shots_per_game: r.bpg,
        rating: r.rating ?? null,
      }));
    }
  }

  if (rows.length === 0) {
    const raw = await readDataFileSafe(`sports/${code}/rankings_2025-26.json`);
    if (raw) {
      rows = JSON.parse(raw) as Record<string, unknown>[];
    }
  }

  rows.sort(
    (a, b) => (Number(a.global_rank) ?? 0) - (Number(b.global_rank) ?? 0),
  );

  const sportLabel = def?.label ?? code.toUpperCase();
  const columns = (def?.columns ?? []).map((c) => ({
    key: c.key === "rank" ? "global_rank" : c.key,
    label: c.label,
    pct: c.pct,
  }));
  if (columns.length === 0) {
    columns.push(
      { key: "global_rank", label: "Rank", pct: false },
      { key: "player_name", label: "Player", pct: false },
      { key: "team", label: "Team", pct: false },
      { key: "rating", label: "OVR", pct: false },
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
          <Link href="/dashboard" className="hover:text-slate-300 transition">
            Player Rankings
          </Link>
          <span className="text-slate-600" aria-hidden>›</span>
          <Link
            href={`/dashboard/sports/${code}`}
            className="hover:text-slate-300 transition"
          >
            {sportLabel}
          </Link>
          <span className="text-slate-600" aria-hidden>›</span>
          <span className="font-semibold text-slate-300">Global</span>
        </nav>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Global rankings — {sportLabel}
        </h1>
        <p className="mt-2 text-slate-400">
          All D3 players · 2025–26 · Top 25 free; full list with Pro
        </p>
      </header>

      <SportPlayerRankingsTable
        rows={rows}
        columns={columns}
        isPro={pro}
        freeRowLimit={25}
      />
    </div>
  );
}
