import { readDataFileSafe } from "@/lib/data";
import Link from "next/link";
import { getSport } from "@/lib/sports";
import { isPro } from "@/lib/auth";
import { formatConferenceDisplayName } from "@/lib/conferences";
import { SportPlayerRankingsTable } from "@/components/SportPlayerRankingsTable";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string; conf: string }>;
}): Promise<Metadata> {
  const { sport, conf } = await params;
  const def = getSport(sport.toLowerCase());
  const sportLabel = def?.label ?? sport.toUpperCase();
  const confPath = `sports/${sport.toLowerCase()}/conferences/${conf.toLowerCase()}.json`;
  let conferenceName = conf;
  try {
    const raw = await readDataFileSafe(confPath);
    if (raw) {
      const rows = JSON.parse(raw) as Record<string, unknown>[];
      conferenceName = formatConferenceDisplayName(
        (rows[0] as Record<string, unknown>)?.conference as string | undefined ?? "",
        conf.toLowerCase(),
      );
    }
  } catch {
    // use conf code
  }
  return {
    title: `${conferenceName} — ${sportLabel} | D3 Rankings`,
  };
}

export default async function ConferenceRankingsPage({
  params,
}: {
  params: Promise<{ sport: string; conf: string }>;
}) {
  const { sport, conf } = await params;
  const code = sport.toLowerCase();
  const confCode = conf.toLowerCase();
  const def = getSport(code);
  const pro = await isPro();

  const confPath = `sports/${code}/conferences/${confCode}.json`;

  let rows: Record<string, unknown>[] = [];
  try {
    const raw = await readDataFileSafe(confPath);
    if (raw) {
      rows = JSON.parse(raw) as Record<string, unknown>[];
    }
  } catch {
    rows = [];
  }

  const conferenceName = formatConferenceDisplayName(
    (rows[0] as Record<string, unknown>)?.conference as string | undefined ?? "",
    confCode,
  );
  const sportLabel = def?.label ?? code.toUpperCase();

  const columns = (def?.columns ?? []).map((c) => ({
    key: c.key === "global_rank" ? "rank" : c.key,
    label: c.label,
    pct: c.pct,
  }));
  if (columns.length === 0) {
    columns.push(
      { key: "rank", label: "Rank", pct: false },
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
          <span className="font-semibold text-slate-300">{conferenceName}</span>
        </nav>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {conferenceName}
        </h1>
        <p className="mt-2 text-slate-400">
          {sportLabel} · 2025–26 · Top 5 free; full list with Pro
        </p>
      </header>

      <SportPlayerRankingsTable
        rows={rows}
        columns={columns}
        isPro={pro}
        freeRowLimit={5}
        title={`${sportLabel} · ${conferenceName}`}
      />
    </div>
  );
}
