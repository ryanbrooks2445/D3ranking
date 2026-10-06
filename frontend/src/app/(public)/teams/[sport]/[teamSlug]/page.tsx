import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeamProfile, listTeamsForSport, type RosterRow } from "@/lib/teams";
import { computeTeamStatRanks } from "@/lib/teamStatRanks";
import { isPro } from "@/lib/auth";
import { FREE_TEAM_ROSTER_LIMIT } from "@/lib/paywall";
import { SITE_URL } from "@/lib/nav";
import { conferenceShortName, formatPerGame } from "@/lib/format";
import { TEAM_RATING_METHODOLOGY, TEAM_STATS_METHODOLOGY } from "@/lib/ranking/methodology";
import { TeamHeader } from "@/components/team/TeamHeader";
import { TeamStatsTable } from "@/components/team/TeamStatsTable";
import { RosterTable } from "@/components/team/RosterTable";
import { ConferenceStandingsTable } from "@/components/conference/ConferenceStandingsTable";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProGate } from "@/components/ProGate";

type Params = Promise<{ sport: string; teamSlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { sport, teamSlug } = await params;
  const data = await getTeamProfile(sport, teamSlug);
  if (!data) return { title: "Team not found" };
  const stat = data.team.seasonStat;
  const rankPart = stat?.nationalRank != null ? ` ranked #${stat.nationalRank} nationally` : "";
  const sportNoun = data.sport.label.replace(/^(Men's|Women's)\s+/, "");
  return {
    title: `${data.team.name} ${sportNoun}`,
    description: `${data.team.name} ${data.sport.label} ${data.season.label}:${rankPart} with a D3Rank rating of ${stat?.rating?.toFixed(1) ?? "—"}. Team statistics, roster, player ratings, and ${data.team.conference ? conferenceShortName(data.team.conference.name, data.team.conference.code) : "conference"} standing.`,
    alternates: { canonical: `${SITE_URL}/teams/${data.sport.code}/${data.team.slug}` },
  };
}

function leaderFromRoster(roster: RosterRow[], key: string) {
  let best: { name: string; slug: string; value: number } | null = null;
  for (const r of roster) {
    const v = Number((r.stats as Record<string, unknown> | null)?.[key]);
    if (!Number.isFinite(v)) continue;
    if (!best || v > best.value) best = { name: r.athlete.displayName, slug: r.athlete.slug, value: v };
  }
  return best;
}

export default async function TeamPage({ params }: { params: Params }) {
  const { sport, teamSlug } = await params;
  const data = await getTeamProfile(sport, teamSlug);
  if (!data) notFound();

  const { team, roster, conferenceTeams, conferenceSeason, season } = data;
  const sportCode = data.sport.code;
  const [pro, allTeams] = await Promise.all([isPro(), listTeamsForSport(sportCode)]);
  const statRanks = computeTeamStatRanks(allTeams.map((t) => ({ teamId: t.id, stat: t.seasonStat })));

  const visibleRoster = pro ? roster : roster.slice(0, FREE_TEAM_ROSTER_LIMIT);
  const isBasketball = sportCode === "mbb" || sportCode === "wbb";
  const leaders = isBasketball
    ? [
        { label: "Scoring", key: "points_per_game", unit: "PPG" },
        { label: "Rebounding", key: "rebounds_per_game", unit: "RPG" },
        { label: "Assists", key: "assists_per_game", unit: "APG" },
        { label: "Steals", key: "steals_per_game", unit: "SPG" },
        { label: "Blocks", key: "blocked_shots_per_game", unit: "BPG" },
      ]
        .map((l) => ({ ...l, leader: leaderFromRoster(roster, l.key) }))
        .filter((l) => l.leader)
    : [];
  const confShort = team.conference ? conferenceShortName(team.conference.name, team.conference.code) : null;

  return (
    <div className="space-y-10">
      <TeamHeader
        team={team}
        sport={data.sport}
        seasonLabel={season.label}
        conferenceNationalRank={conferenceSeason?.nationalRank}
        conferenceTeamCount={conferenceTeams.length || conferenceSeason?.teamCount}
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="team-stats">
          <SectionHeading id="team-stats" title="Team statistics" subtitle={`${season.label} · ranks among all Division III teams`} />
          <TeamStatsTable stat={team.seasonStat} ranks={statRanks.get(team.id)} />
          <p className="mt-2 text-xs text-slate-500">{TEAM_STATS_METHODOLOGY}</p>
        </section>

        <div className="space-y-10">
          {leaders.length > 0 && (
            <section aria-labelledby="team-leaders">
              <SectionHeading id="team-leaders" title="Team leaders" />
              <dl>
                {leaders.map((l) => (
                  <div key={l.key} className="flex items-baseline justify-between gap-4 border-b border-slate-800 py-2 text-sm">
                    <dt className="text-slate-400">
                      {l.label}
                      <Link href={`/athletes/${l.leader!.slug}`} className="ml-2 font-medium text-white hover:text-blue-300">
                        {l.leader!.name}
                      </Link>
                    </dt>
                    <dd className="num font-semibold text-white">
                      {formatPerGame(l.leader!.value)} <span className="text-xs font-normal text-slate-500">{l.unit}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {team.conference && conferenceTeams.length > 0 && (
            <section aria-labelledby="conf-standing">
              <SectionHeading
                id="conf-standing"
                title={`${confShort} standings`}
                subtitle="By D3Rank rating"
                href={`/conferences/${sportCode}/${team.conference.code}`}
                hrefLabel="Conference page"
              />
              <ConferenceStandingsTable
                teams={conferenceTeams}
                sportCode={sportCode}
                highlightTeamId={team.id}
                compact
              />
            </section>
          )}
        </div>
      </div>

      <section aria-labelledby="roster">
        <SectionHeading
          id="roster"
          title="Roster"
          subtitle={`${roster.length} ranked players · sorted by national rank`}
          href={`/rankings/players/${sportCode}`}
          hrefLabel="All player rankings"
        />
        <RosterTable roster={visibleRoster} sportCode={sportCode} showRatings={pro} />
        {!pro && (
          <div className="mt-3">
            <ProGate shown={visibleRoster.length} total={roster.length} />
          </div>
        )}
      </section>

      <section aria-labelledby="methodology" className="max-w-3xl">
        <SectionHeading id="methodology" title="About the rating" />
        {TEAM_RATING_METHODOLOGY.map((p) => (
          <p key={p} className="mt-2 text-sm leading-relaxed text-slate-400">
            {p}
          </p>
        ))}
      </section>
    </div>
  );
}
