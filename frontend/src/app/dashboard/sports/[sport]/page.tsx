import { readDataFileSafe, getSeasonDisplay, getDataQualityNote } from "@/lib/data";
import Link from "next/link";
import { getSport, isSportUnderConstruction } from "@/lib/sports";
import { formatConferenceDisplayName } from "@/lib/conferences";
import { UnderConstructionBanner } from "@/components/UnderConstructionBanner";

type ConfIndexRow = {
  conference_code: string;
  conference: string;
  player_count?: number;
  ranked_count?: number;
};

export default async function SportPage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  const code = sport.toLowerCase();
  const def = getSport(code);

  const indexPath = `sports/${code}/conferences/index.json`;
  const { seasonLabel, note: seasonNote } = await getSeasonDisplay(code);
  const dataQualityNote = getDataQualityNote(code);

  let conferences: ConfIndexRow[] = [];
  try {
    const raw = await readDataFileSafe(indexPath);
    if (raw) {
      conferences = JSON.parse(raw) as ConfIndexRow[];
      conferences.sort((a, b) =>
        (a.conference ?? "").localeCompare(b.conference ?? ""),
      );
    }
  } catch {
    conferences = [];
  }

  const sportLabel = def?.label ?? code.toUpperCase();

  if (isSportUnderConstruction(code)) {
    return (
      <div className="space-y-8">
        <header>
          <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
            <Link href="/dashboard" className="hover:text-slate-300 transition">
              Player Rankings
            </Link>
            <span className="text-slate-600" aria-hidden>›</span>
            <span className="font-semibold text-slate-300">{sportLabel}</span>
          </nav>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {sportLabel}
          </h1>
        </header>
        <UnderConstructionBanner sportLabel={sportLabel} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
          <Link href="/dashboard" className="hover:text-slate-300 transition">
            Player Rankings
          </Link>
          <span className="text-slate-600" aria-hidden>
            ›
          </span>
          <span className="font-semibold text-slate-300">{sportLabel}</span>
        </nav>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {sportLabel}
        </h1>
        <p className="mt-2 text-slate-400">
          NCAA D3 composite rankings · {seasonLabel} season
        </p>
        {seasonNote && (
          <p className="mt-1 text-sm text-amber-400/90">
            {seasonNote}
          </p>
        )}
        {dataQualityNote && (
          <p className="mt-1 text-sm text-slate-500 max-w-xl">
            {dataQualityNote}
          </p>
        )}
      </header>

      <Link
        href={`/dashboard/sports/${code}/global`}
        className="group flex items-center gap-6 rounded-2xl border-2 border-slate-600 bg-slate-900/80 p-8 transition hover:border-blue-500/60 hover:bg-slate-800/80"
      >
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600/30 text-2xl font-black text-blue-400 ring-2 ring-blue-500/40">
          #1
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xl font-bold text-white">
            Global rankings
          </span>
          <span className="block text-slate-400 mt-1">
            All ranked players across every conference
          </span>
        </span>
        <span className="text-3xl text-slate-500 transition group-hover:text-blue-400 group-hover:translate-x-1" aria-hidden>
          →
        </span>
      </Link>

      <section>
        <h2 className="mb-4 text-base font-bold uppercase tracking-wider text-slate-500">
          By conference
        </h2>
        {conferences.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {conferences.map((c) => (
              <Link
                key={c.conference_code}
                href={`/dashboard/sports/${code}/conferences/${c.conference_code}`}
                className="rounded-xl border-2 border-slate-700 bg-slate-900/60 px-5 py-4 transition hover:border-slate-600 hover:bg-slate-800/60"
              >
                <span className="block font-semibold text-white">
                  {formatConferenceDisplayName(c.conference, c.conference_code)}
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  {typeof c.player_count === "number"
                    ? `${c.player_count.toLocaleString()} players`
                    : "—"}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-8 text-center text-slate-400">
            No conference data for {sportLabel}. Run the export scripts to populate.
          </div>
        )}
      </section>
    </div>
  );
}
