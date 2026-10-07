import Link from "next/link";
import { PRO_PRICE_SUMMARY } from "@/lib/billing";

/** Compact upgrade notice shown under a truncated free-tier list. */
export function ProGate({ shown, total, noun = "players" }: { shown: number; total: number; noun?: string }) {
  if (total <= shown) return null;
  return (
    <div className="flex flex-col items-start justify-between gap-3 border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm sm:flex-row sm:items-center">
      <p className="text-slate-300">
        Showing {shown} of {total.toLocaleString()} {noun}.{" "}
        <span className="text-slate-500">Pro unlocks the full list, OVR, and national rank for {PRO_PRICE_SUMMARY}.</span>
      </p>
      <Link
        href="/#pricing"
        className="flex h-9 shrink-0 items-center rounded bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-500"
      >
        Get Pro
      </Link>
    </div>
  );
}
