import Link from "next/link";
import Image from "next/image";
import type { TeamRow } from "@/lib/teams";
import { conferenceShortName, formatRank, formatRating, formatRecord, formatInt } from "@/lib/format";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type KeyFigure = { label: string; value: string; sub?: string; muted?: boolean };

export function TeamHeader({
  team,
  sport,
  seasonLabel,
  conferenceNationalRank,
  conferenceTeamCount,
}: {
  team: TeamRow;
  sport: { code: string; label: string };
  seasonLabel: string;
  conferenceNationalRank: number | null | undefined;
  conferenceTeamCount?: number;
}) {
  const stat = team.seasonStat;
  const confShort = team.conference ? conferenceShortName(team.conference.name, team.conference.code) : null;
  const record = formatRecord(stat?.wins, stat?.losses);
  const confRecord = formatRecord(stat?.conferenceWins, stat?.conferenceLosses);

  const figures: KeyFigure[] = [
    { label: "National rank", value: formatRank(stat?.nationalRank), muted: stat?.nationalRank == null },
    {
      label: `${confShort ?? "Conference"} rank`,
      value: formatRank(stat?.conferenceRank),
      sub: stat?.conferenceRank != null && conferenceTeamCount ? `of ${conferenceTeamCount}` : undefined,
      muted: stat?.conferenceRank == null,
    },
    { label: "D3Rank rating", value: formatRating(stat?.rating), muted: stat?.rating == null },
    ...(record !== "—" ? [{ label: "Overall", value: record }] : []),
    ...(confRecord !== "—" ? [{ label: `${confShort ?? "Conf."} record`, value: confRecord }] : []),
    { label: "Games", value: formatInt(stat?.gamesPlayed), muted: stat?.gamesPlayed == null },
  ];

  return (
    <header className="border-b border-slate-800 pb-5">
      <Breadcrumbs
        items={[
          { label: sport.label, href: `/rankings/teams/${sport.code}` },
          ...(team.conference
            ? [{ label: confShort ?? team.conference.name, href: `/conferences/${sport.code}/${team.conference.code}` }]
            : []),
          { label: team.name },
        ]}
      />
      <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {team.logoUrl ? (
            <Image src={team.logoUrl} alt="" width={56} height={56} className="h-14 w-14 shrink-0 object-contain" />
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center border border-slate-700 bg-slate-900 text-lg font-black text-slate-500"
              aria-hidden
            >
              {team.name.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
              {sport.label} · {seasonLabel}
            </p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">{team.name}</h1>
            {team.conference && (
              <p className="mt-1 text-sm text-slate-400">
                <Link href={`/conferences/${sport.code}/${team.conference.code}`} className="hover:text-white">
                  {team.conference.name}
                </Link>
                {conferenceNationalRank != null && (
                  <span className="text-slate-500"> · {formatRank(conferenceNationalRank)} conference nationally</span>
                )}
              </p>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-8">
          {figures.map((f) => (
            <div key={f.label} className="min-w-[4.5rem]">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{f.label}</dt>
              <dd className={`num mt-0.5 text-xl font-bold leading-none ${f.muted ? "text-slate-600" : "text-white"}`}>
                {f.value}
                {f.sub && <span className="ml-1 text-xs font-normal text-slate-500">{f.sub}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
