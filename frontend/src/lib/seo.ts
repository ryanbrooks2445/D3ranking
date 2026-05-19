import type { Metadata } from "next";

export function athleteProfileMetadata(opts: {
  name: string;
  ovr?: number | null;
  sportLabel: string;
  team?: string | null;
  summary?: string | null;
}): Metadata {
  const ovrPart = opts.ovr != null ? ` ${opts.ovr} OVR` : "";
  const title = `${opts.name}${ovrPart} | ${opts.sportLabel} | D3Rank`;
  const description =
    opts.summary?.slice(0, 160) ??
    `${opts.name} — NCAA Division III ${opts.sportLabel} player profile${opts.team ? ` at ${opts.team}` : ""}. Stats, OVR, and rankings on D3Rank.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
    },
  };
}
