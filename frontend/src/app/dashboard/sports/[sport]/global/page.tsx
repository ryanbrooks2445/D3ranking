import type { Metadata } from "next";
import { getSport } from "@/lib/sports";
import { SITE_URL } from "@/lib/nav";
import { PlayerRankingsView } from "@/components/rankings/PlayerRankingsView";

type Params = Promise<{ sport: string }>;
type Search = Promise<{ segment?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { sport } = await params;
  const code = sport.toLowerCase();
  const label = getSport(code)?.label ?? code.toUpperCase();
  return {
    title: `Division III ${label} Player Rankings`,
    alternates: { canonical: `${SITE_URL}/rankings/players/${code}` },
  };
}

/** Legacy route; renders the same national player rankings as /rankings/players/[sport]. */
export default async function GlobalRankingsPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { sport } = await params;
  const { segment } = await searchParams;
  const code = sport.toLowerCase();
  const label = getSport(code)?.label ?? code.toUpperCase();

  return (
    <PlayerRankingsView
      sportCode={code}
      segmentParam={segment}
      basePath={`/dashboard/sports/${code}/global`}
      crumbs={[
        { label: "Player Rankings", href: "/dashboard" },
        { label: label, href: `/dashboard/sports/${code}` },
        { label: "Global" },
      ]}
    />
  );
}
