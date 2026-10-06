import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSport } from "@/lib/sports";
import { SITE_URL } from "@/lib/nav";
import { PlayerRankingsView } from "@/components/rankings/PlayerRankingsView";
import { SportSwitcher } from "@/components/SportSwitcher";

type Params = Promise<{ sport: string }>;
type Search = Promise<{ segment?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { sport } = await params;
  const def = getSport(sport.toLowerCase());
  if (!def) return { title: "Player Rankings" };
  return {
    title: `Division III ${def.label} Player Rankings`,
    description: `National NCAA Division III ${def.label.toLowerCase()} player rankings. Every ranked player with composite rating, per-game production, team, and conference.`,
    alternates: { canonical: `${SITE_URL}/rankings/players/${def.code}` },
  };
}

export default async function PlayerRankingsPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { sport } = await params;
  const { segment } = await searchParams;
  const code = sport.toLowerCase();
  const def = getSport(code);
  if (!def) notFound();

  return (
    <PlayerRankingsView
      sportCode={code}
      segmentParam={segment}
      basePath={`/rankings/players/${code}`}
      crumbs={[{ label: "Rankings", href: "/rankings" }, { label: "Players" }, { label: def.label }]}
      sportSwitcher={<SportSwitcher current={code} hrefFor={(c) => `/rankings/players/${c}`} />}
    />
  );
}
