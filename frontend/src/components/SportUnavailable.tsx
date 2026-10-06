import Link from "next/link";
import { getSport } from "@/lib/sports";
import { EmptyState } from "@/components/ui/EmptyState";

/** Neutral state for sports that have player rankings but no team/conference layer yet. */
export function SportUnavailable({
  sportCode,
  feature,
  availableSports,
  hrefForSport,
}: {
  sportCode: string;
  feature: string;
  availableSports: { code: string; label: string }[];
  hrefForSport: (code: string) => string;
}) {
  const label = getSport(sportCode)?.label ?? sportCode.toUpperCase();
  return (
    <EmptyState
      title={`${feature} are not yet available for ${label}.`}
      body={
        <>
          <p>Team-level data requires per-player season totals, which the {label} pipeline does not export yet.</p>
          {availableSports.length > 0 && (
            <p className="mt-3">
              Available now:{" "}
              {availableSports.map((s, i) => (
                <span key={s.code}>
                  {i > 0 && ", "}
                  <Link href={hrefForSport(s.code)} className="text-blue-400 hover:text-blue-300">
                    {s.label}
                  </Link>
                </span>
              ))}
              .
            </p>
          )}
          <p className="mt-3">
            <Link href={`/rankings/players/${sportCode}`} className="text-blue-400 hover:text-blue-300">
              View {label} player rankings →
            </Link>
          </p>
        </>
      }
    />
  );
}
