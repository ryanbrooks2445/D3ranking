import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getConferenceProfile } from "@/lib/conferenceSeasons";
import { getRankedPlayerSeasons, getStatLeaders } from "@/lib/players";
import { getLeaderCategories } from "@/lib/statCategories";
import { isPro } from "@/lib/auth";
import { FREE_CONFERENCE_LIMIT } from "@/lib/paywall";
import { SITE_URL } from "@/lib/nav";
import { parseSort, sortRows } from "@/lib/tableSort";
import { CONFERENCE_RATING_METHODOLOGY } from "@/lib/ranking/methodology";
import { formatConferenceDisplayName } from "@/lib/conferences";
import type { TeamRow } from "@/lib/teams";
import { ConferenceHeader } from "@/components/conference/ConferenceHeader";
import { ConferenceStandingsTable } from "@/components/conference/ConferenceStandingsTable";
import { TopPlayersTable } from "@/components/player/TopPlayersTable";
import { StatLeaderTable } from "@/components/player/StatLeaderTable";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProGate } from "@/components/ProGate";

type Params = Promise<{ sport: string; conf: string }>;
type Search = Promise<{ sort?: string; dir?: string }>;

const STANDINGS_SORT = [
  { key: "confRank", defaultDir: "asc" as const, accessor: (t: TeamRow) => t.seasonStat?.conferenceRank },
  { key: "team", defaultDir: "asc" as const, accessor: (t: TeamRow) => t.name },
  { key: "rating", defaultDir: "desc" as const, accessor: (t: TeamRow) => t.seasonStat?.rating },
  { key: "nationalRank", defaultDir: "asc" as const, accessor: (t: TeamRow) => t.seasonStat?.nationalRank },
  { key: "ppg", defaultDir: "desc" as const, accessor: (t: TeamRow) => t.seasonStat?.pointsPerGame },
  { key: "fg", defaultDir: "desc" as const, accessor: (t: TeamRow) => t.seasonStat?.fieldGoalPct },
  { key: "tp", defaultDir: "desc" as const, accessor: (t: TeamRow) => t.seasonStat?.threePointPct },
  { key: "ranked", defaultDir: "desc" as const, accessor: (t: TeamRow) => t.seasonStat?.rankedPlayerCount },
];

const TOP_PLAYERS_PRO_LIMIT = 15;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { sport, conf } = await params;
  const profile = await getConferenceProfile(sport, conf);
  const name = profile?.conference.displayName ?? formatConferenceDisplayName("", conf);
  const sportLabel = profile?.sport.label ?? "";
  const sportNoun = sportLabel.replace(/^(Men's|Women's)\s+/, "");
  return {
    title: `${name} ${sportNoun} Rankings`,
    description: profile
      ? `${name} ${sportLabel} standings by D3Rank rating, national conference rank, team statistics, top players, and stat leaders for ${profile.season.label}.`
      : undefined,
    alternates: { canonical: `${SITE_URL}/conferences/${sport.toLowerCase()}/${conf.toLowerCase()}` },
  };
}

export default async function ConferencePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { sport, conf } = await params;
  const sp = await searchParams;
  const profile = await getConferenceProfile(sport, conf);
  if (!profile) notFound();

  const sportCode = profile.sport.code;
  const confCode = profile.conference.code;
  const [pro, players] = await Promise.all([isPro(), getRankedPlayerSeasons(sportCode, confCode)]);

  const sort = parseSort(sp, STANDINGS_SORT, { key: "confRank", dir: "asc" });
  const sortDef = STANDINGS_SORT.find((s) => s.key === sort.key) ?? STANDINGS_SORT[0];
  const standings = sortRows(profile.teams, sortDef.accessor, sort.dir);

  const rankedPlayers = [...players].sort((a, b) => (a.globalRank ?? 1e9) - (b.globalRank ?? 1e9));
  const topPlayers = rankedPlayers.slice(0, pro ? TOP_PLAYERS_PRO_LIMIT : FREE_CONFERENCE_LIMIT);
  const categories = getLeaderCategories(sportCode).slice(0, 3);
  const basePath = `/conferences/${sportCode}/${confCode}`;

  return (
    <div className="space-y-10">
      <ConferenceHeader profile={profile} />

      <section aria-labelledby="standings">
        <SectionHeading
          id="standings"
          title="Standings"
          subtitle="Ordered by D3Rank team rating. Win-loss records will appear when results data is available."
        />
        <ConferenceStandingsTable
          teams={standings}
          sportCode={sportCode}
          sort={{ basePath, params: sp, current: sort }}
        />
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="top-players">
          <SectionHeading
            id="top-players"
            title="Top players"
            subtitle={`${players.length} ranked players in the conference`}
            href={`/dashboard/sports/${sportCode}/conferences/${confCode}`}
            hrefLabel="Full conference rankings"
          />
          <TopPlayersTable rows={topPlayers} sportCode={sportCode} showRatings={pro} />
          {!pro && (
            <div className="mt-3">
              <ProGate shown={topPlayers.length} total={players.length} />
            </div>
          )}
        </section>

        {categories.length > 0 && (
          <section aria-labelledby="leaders">
            <SectionHeading id="leaders" title="Stat leaders" href={`/stats/${sportCode}?conference=${confCode}`} hrefLabel="All categories" />
            <div className="space-y-6">
              {categories.map((c) => (
                <StatLeaderTable key={c.key} category={c} leaders={getStatLeaders(players, c, 5)} sportCode={sportCode} />
              ))}
            </div>
          </section>
        )}
      </div>

      <section aria-labelledby="methodology" className="max-w-3xl">
        <SectionHeading id="methodology" title="How conferences are rated" />
        {CONFERENCE_RATING_METHODOLOGY.map((p) => (
          <p key={p} className="mt-2 text-sm leading-relaxed text-slate-400">
            {p}
          </p>
        ))}
        <p className="mt-3 text-sm">
          <Link href={`/rankings/conferences/${sportCode}`} className="text-blue-400 hover:text-blue-300">
            See all conference rankings →
          </Link>
        </p>
      </section>
    </div>
  );
}
