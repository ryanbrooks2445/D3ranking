import type { ConferenceProfile } from "@/lib/conferenceSeasons";
import { formatRank, formatRating, formatInt } from "@/lib/format";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export function ConferenceHeader({ profile }: { profile: ConferenceProfile }) {
  const { conference, conferenceSeason: cs, sport, season, teams } = profile;
  const topTeam = teams.find((t) => t.seasonStat?.conferenceRank === 1);

  const figures = [
    { label: "National rank", value: formatRank(cs?.nationalRank), muted: cs?.nationalRank == null },
    { label: "Conference rating", value: formatRating(cs?.rating), muted: cs?.rating == null },
    { label: "Teams", value: formatInt(cs?.teamCount ?? teams.length) },
    { label: "Avg team rating", value: formatRating(cs?.avgTeamRating), muted: cs?.avgTeamRating == null },
    { label: "Top-25 teams", value: formatInt(cs?.teamsInTop25 ?? null), muted: cs?.teamsInTop25 == null },
  ];

  return (
    <header className="border-b border-slate-800 pb-5">
      <Breadcrumbs
        items={[
          { label: sport.label, href: `/rankings/teams/${sport.code}` },
          { label: "Conferences", href: `/conferences/${sport.code}` },
          { label: conference.displayName },
        ]}
      />
      <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
            {sport.label} · {season.label}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">{conference.displayName}</h1>
          {topTeam && (
            <p className="mt-1 text-sm text-slate-400">
              Top-rated team: <span className="text-slate-200">{topTeam.name}</span>
              {topTeam.seasonStat?.nationalRank != null && (
                <span className="text-slate-500"> · {formatRank(topTeam.seasonStat.nationalRank)} nationally</span>
              )}
            </p>
          )}
        </div>
        <dl className="grid grid-cols-3 gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-8">
          {figures.map((f) => (
            <div key={f.label} className="min-w-[4.5rem]">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{f.label}</dt>
              <dd className={`num mt-0.5 text-xl font-bold leading-none ${f.muted ? "text-slate-600" : "text-white"}`}>{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
