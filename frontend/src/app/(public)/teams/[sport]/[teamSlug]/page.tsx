import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeamRoster } from "@/lib/teams";
import { OvrBadge } from "@/components/athlete/OvrBadge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string; teamSlug: string }>;
}) {
  const { sport, teamSlug } = await params;
  const data = await getTeamRoster(sport, teamSlug);
  if (!data) return { title: "Team | D3Rank" };
  return {
    title: `${data.team.name} ${data.season.sport.label} | D3Rank`,
    description: `Roster and player rankings for ${data.team.name} (${data.season.label}).`,
  };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ sport: string; teamSlug: string }>;
}) {
  const { sport, teamSlug } = await params;
  const data = await getTeamRoster(sport, teamSlug);
  if (!data) notFound();

  const { season, team, roster } = data;

  return (
    <div className="space-y-6">
      <header>
        <nav className="text-sm text-slate-500">
          <Link href={`/dashboard/sports/${sport}`} className="hover:text-slate-300">
            {season.sport.label}
          </Link>
          <span className="mx-2">›</span>
          <span className="text-slate-300">{team.name}</span>
        </nav>
        <h1 className="mt-4 text-3xl font-bold text-white">{team.name}</h1>
        <p className="mt-1 text-slate-400">
          {season.sport.label} · {season.label}
          {team.conference?.name ? ` · ${team.conference.name}` : ""}
        </p>
        {team.conference?.code && (
          <Link
            href={`/conferences/${sport}/${team.conference.code}`}
            className="mt-3 inline-block text-sm text-blue-400 hover:text-blue-300"
          >
            View conference rankings →
          </Link>
        )}
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">OVR</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((row, i) => (
              <tr key={row.id} className="border-t border-slate-700/80">
                <td className="px-4 py-3 text-slate-300">{row.globalRank ?? i + 1}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/athletes/${row.athlete.slug}`}
                    className="font-semibold text-white hover:text-blue-400"
                  >
                    {row.athlete.displayName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <OvrBadge rating={row.rating} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
