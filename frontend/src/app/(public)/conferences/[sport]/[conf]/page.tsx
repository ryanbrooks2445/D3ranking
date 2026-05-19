import Link from "next/link";
import { readDataFileSafe, getSportRankingsJsonPath } from "@/lib/data";
import { getSport, filterRowsBySegment, getSportSegmentColumns } from "@/lib/sports";
import { formatConferenceDisplayName } from "@/lib/conferences";
import { getProfileSlugMapForSport, slugMapToRecord } from "@/lib/athletes";
import { SportPlayerRankingsTable } from "@/components/SportPlayerRankingsTable";

const PROFILE_SPORTS = new Set(["mbb", "baseball"]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string; conf: string }>;
}) {
  const { sport, conf } = await params;
  const def = getSport(sport);
  return {
    title: `${formatConferenceDisplayName("", conf)} ${def?.label ?? sport} | D3Rank`,
  };
}

export default async function PublicConferencePage({
  params,
  searchParams,
}: {
  params: Promise<{ sport: string; conf: string }>;
  searchParams: Promise<{ segment?: string }>;
}) {
  const { sport, conf } = await params;
  const { segment } = await searchParams;
  const code = sport.toLowerCase();
  const confCode = conf.toLowerCase();
  const def = getSport(code);

  const confPath = `sports/${code}/conferences/${confCode}.json`;
  const raw = await readDataFileSafe(confPath);
  let rows: Record<string, unknown>[] = raw ? (JSON.parse(raw) as Record<string, unknown>[]) : [];

  const segmentId = segment ?? def?.segments?.[0]?.id;
  if (segmentId) {
    rows = filterRowsBySegment(code, segmentId, rows);
  }

  const conferenceName = formatConferenceDisplayName(
    (rows[0]?.conference as string) ?? "",
    confCode,
  );

  let profileSlugLookup: Record<string, string> | undefined;
  if (PROFILE_SPORTS.has(code)) {
    try {
      profileSlugLookup = slugMapToRecord(await getProfileSlugMapForSport(code));
    } catch {
      profileSlugLookup = undefined;
    }
  }

  const columns = def
    ? getSportSegmentColumns(def, segmentId ?? "").map((c) => ({
        key: c.key,
        label: c.label,
        pct: c.pct,
      }))
    : [];

  return (
    <div className="space-y-6">
      <header>
        <nav className="text-sm text-slate-500">
          <Link href={`/dashboard/sports/${code}`} className="hover:text-slate-300">
            {def?.label ?? code}
          </Link>
          <span className="mx-2">›</span>
          <span className="text-slate-300">{conferenceName || confCode}</span>
        </nav>
        <h1 className="mt-4 text-3xl font-bold text-white">{conferenceName || confCode}</h1>
        <p className="mt-1 text-slate-400">Conference player rankings · public view</p>
        <Link
          href={`/dashboard/sports/${code}/conferences/${confCode}`}
          className="mt-3 inline-block text-sm text-blue-400 hover:text-blue-300"
        >
          Open in Pro rankings dashboard →
        </Link>
      </header>

      <SportPlayerRankingsTable
        rows={rows}
        columns={columns}
        isPro={true}
        freeRowLimit={rows.length}
        profileSlugLookup={profileSlugLookup}
        sportCode={code}
        segmentId={segmentId}
      />
    </div>
  );
}
