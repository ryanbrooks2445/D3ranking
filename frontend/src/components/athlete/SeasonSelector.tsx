"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export type SeasonTab = {
  id: string;
  label: string;
  sportCode: string;
};

export function SeasonSelector({ slug, seasons }: { slug: string; seasons: SeasonTab[] }) {
  const searchParams = useSearchParams();
  const active = searchParams.get("seasonId") ?? seasons[0]?.id;

  if (seasons.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {seasons.map((s) => {
        const isActive = s.id === active;
        return (
          <Link
            key={s.id}
            href={`/athletes/${slug}?seasonId=${s.id}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              isActive
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 ring-1 ring-slate-600 hover:text-white"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}
