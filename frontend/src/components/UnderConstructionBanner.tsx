import Link from "next/link";

export function UnderConstructionBanner({ sportLabel }: { sportLabel: string }) {
  return (
    <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 p-10 text-center">
      <p className="text-lg font-semibold text-amber-200">
        {sportLabel} rankings are under construction
      </p>
      <p className="mt-2 text-slate-400">
        We&apos;re working on it. Check back soon.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-block rounded-xl bg-slate-700 px-6 py-3 text-base font-medium text-white transition hover:bg-slate-600"
      >
        Back to all sports
      </Link>
    </div>
  );
}
