import Link from "next/link";

/** Ruled section label in the style of a sports section front. */
export function SectionHeading({
  title,
  subtitle,
  href,
  hrefLabel = "View all",
  id,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  id?: string;
}) {
  return (
    <div id={id} className="mb-3 flex items-end justify-between gap-4 border-b border-slate-700 pb-2">
      <div className="min-w-0">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 text-xs font-medium text-blue-400 hover:text-blue-300">
          {hrefLabel} →
        </Link>
      )}
    </div>
  );
}
