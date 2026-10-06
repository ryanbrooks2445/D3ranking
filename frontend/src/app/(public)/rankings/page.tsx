import type { Metadata } from "next";
import Link from "next/link";
import { getAllSports, getSport, isSportUnderConstruction } from "@/lib/sports";
import { getTopTeams } from "@/lib/teams";
import { getConferenceRankings } from "@/lib/conferenceSeasons";
import { getTopPlayers } from "@/lib/players";
import { getSportsWithTeamRankings } from "@/lib/seasons";
import { isPro } from "@/lib/auth";
import { DEFAULT_SPORT, SITE_URL } from "@/lib/nav";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TeamRankingTable } from "@/components/team/TeamRankingTable";
import { ConferenceRankingTable } from "@/components/conference/ConferenceRankingTable";
import { TopPlayersTable } from "@/components/player/TopPlayersTable";

export const metadata: Metadata = {
  title: "NCAA Division III Rankings",
  description:
    "National NCAA Division III rankings for teams, players, and conferences across every sport D3Rank covers. Transparent, data-driven, updated each season.",
  alternates: { canonical: `${SITE_URL}/rankings` },
};

const RANKING_TYPES = [
  { key: "teams", label: "Teams", blurb: "National team ratings built from roster strength.", path: "/rankings/teams" },
  { key: "players", label: "Players", blurb: "Composite player rankings for every sport.", path: "/rankings/players" },
  { key: "conferences", label: "Conferences", blurb: "Which leagues are strongest top to bottom.", path: "/rankings/conferences" },
] as const;

export default async function RankingsHubPage() {
  const sport = getSport(DEFAULT_SPORT);
  const sportLabel = sport?.label ?? "Men's Basketball";

  const [teams, conferences, players, pro, withTeams] = await Promise.all([
    getTopTeams(DEFAULT_SPORT, 25),
    getConferenceRankings(DEFAULT_SPORT, { key: "rank", dir: "asc" }),
    getTopPlayers(DEFAULT_SPORT, 10),
    isPro(),
    getSportsWithTeamRankings(),
  ]);
  const teamSports = new Set(withTeams.map((s) => s.code));
  const sports = getAllSports();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Rankings"
        title="NCAA Division III Rankings"
        meta="Teams, players, and conferences. Every ranking is computed from published statistics with a documented formula."
      />

      <nav aria-label="Ranking types" className="grid gap-px overflow-hidden rounded border border-slate-800 bg-slate-800 sm:grid-cols-3">
        {RANKING_TYPES.map((t) => (
          <Link key={t.key} href={`${t.path}/${DEFAULT_SPORT}`} className="bg-slate-950 px-4 py-3 hover:bg-slate-900">
            <span className="block text-sm font-semibold text-white">{t.label}</span>
            <span className="block text-xs text-slate-400">{t.blurb}</span>
          </Link>
        ))}
      </nav>

      <div className="grid gap-8 lg:grid-cols-5">
        <section aria-labelledby="top-teams" className="lg:col-span-3">
          <SectionHeading
            id="top-teams"
            title={`${sportLabel} Top 25`}
            subtitle="D3Rank team rating"
            href={`/rankings/teams/${DEFAULT_SPORT}`}
            hrefLabel="Full rankings"
          />
          <TeamRankingTable rows={teams} sportCode={DEFAULT_SPORT} compact />
        </section>

        <div className="space-y-8 lg:col-span-2">
          <section aria-labelledby="top-players">
            <SectionHeading
              id="top-players"
              title={`${sportLabel} top players`}
              href={`/rankings/players/${DEFAULT_SPORT}`}
              hrefLabel="All players"
            />
            <TopPlayersTable rows={players} sportCode={DEFAULT_SPORT} showRatings={pro} compact />
          </section>

          <section aria-labelledby="top-conferences">
            <SectionHeading
              id="top-conferences"
              title={`${sportLabel} conference rankings`}
              href={`/rankings/conferences/${DEFAULT_SPORT}`}
              hrefLabel="All conferences"
            />
            <ConferenceRankingTable rows={conferences?.rows.slice(0, 10) ?? []} sportCode={DEFAULT_SPORT} compact />
          </section>
        </div>
      </div>

      <section aria-labelledby="by-sport">
        <SectionHeading id="by-sport" title="Rankings by sport" subtitle="Team and conference rankings require per-player season totals and roll out sport by sport." />
        <div className="overflow-x-auto">
          <table className="data-table compact w-full">
            <thead>
              <tr>
                <th scope="col">Sport</th>
                {RANKING_TYPES.map((t) => (
                  <th key={t.key} scope="col">
                    {t.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sports.map((s) => {
                const underConstruction = isSportUnderConstruction(s.code);
                const hasTeam = teamSports.has(s.code);
                return (
                  <tr key={s.code}>
                    <th scope="row" className="font-semibold">
                      {s.label}
                    </th>
                    <td>
                      {hasTeam ? (
                        <Link href={`/rankings/teams/${s.code}`} className="text-blue-400 hover:text-blue-300">
                          Teams
                        </Link>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td>
                      {underConstruction ? (
                        <span className="text-slate-600">In progress</span>
                      ) : (
                        <Link href={`/rankings/players/${s.code}`} className="text-blue-400 hover:text-blue-300">
                          Players
                        </Link>
                      )}
                    </td>
                    <td>
                      {hasTeam ? (
                        <Link href={`/rankings/conferences/${s.code}`} className="text-blue-400 hover:text-blue-300">
                          Conferences
                        </Link>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
