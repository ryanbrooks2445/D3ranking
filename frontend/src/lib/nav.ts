/** Sport whose team/conference layers are fully populated; used for default routes. */
export const DEFAULT_SPORT = "mbb";

export type NavItem = { label: string; href: string; match: string };

export const PRIMARY_NAV: NavItem[] = [
  { label: "Players", href: `/rankings/players/${DEFAULT_SPORT}`, match: "/rankings/players" },
  { label: "Teams", href: `/teams/${DEFAULT_SPORT}`, match: "/teams" },
  { label: "Rankings", href: "/rankings", match: "/rankings" },
  { label: "Conferences", href: `/conferences/${DEFAULT_SPORT}`, match: "/conferences" },
  { label: "Stats", href: `/stats/${DEFAULT_SPORT}`, match: "/stats" },
];

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.match === "/rankings") {
    return pathname === "/rankings" || (pathname.startsWith("/rankings/") && !pathname.startsWith("/rankings/players"));
  }
  return pathname === item.match || pathname.startsWith(`${item.match}/`);
}

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://d3rank.com";
