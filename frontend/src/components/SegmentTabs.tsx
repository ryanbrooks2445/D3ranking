"use client";

import Link from "next/link";

type Segment = { id: string; label: string };

export function SegmentTabs({
  sportCode,
  segments,
  currentSegmentId,
  baseHref,
}: {
  sportCode: string;
  segments: Segment[];
  currentSegmentId: string;
  /** If provided, segment links use this base (e.g. conference page). Otherwise use .../global. */
  baseHref?: string;
}) {
  if (segments.length <= 1) return null;

  const base = baseHref ?? `/dashboard/sports/${sportCode}/global`;

  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-700 pb-4" aria-label="View by segment">
      <Link
        href={base}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
          !currentSegmentId || currentSegmentId === "all"
            ? "bg-blue-600 text-white"
            : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
        }`}
      >
        All
      </Link>
      {segments.map((seg) => (
        <Link
          key={seg.id}
          href={`${base}?segment=${encodeURIComponent(seg.id)}`}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            currentSegmentId === seg.id
              ? "bg-blue-600 text-white"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
        >
          {seg.label}
        </Link>
      ))}
    </nav>
  );
}
