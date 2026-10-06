import Link from "next/link";

function pageHref(basePath: string, params: Record<string, string | undefined>, page: number): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== "page") search.set(k, v);
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({
  basePath,
  params,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const linkClass = "inline-flex h-9 min-w-[2.25rem] items-center justify-center border border-slate-700 px-3 text-sm text-slate-300 hover:border-slate-500 hover:text-white";
  const disabledClass = "inline-flex h-9 min-w-[2.25rem] items-center justify-center border border-slate-800 px-3 text-sm text-slate-600";

  return (
    <nav className="flex items-center justify-between gap-4 text-sm" aria-label="Pagination">
      <p className="num text-slate-500">
        {start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()}
      </p>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={pageHref(basePath, params, page - 1)} className={linkClass} rel="prev">
            Previous
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled>Previous</span>
        )}
        <span className="num px-2 text-slate-400">
          {page} / {pageCount}
        </span>
        {page < pageCount ? (
          <Link href={pageHref(basePath, params, page + 1)} className={linkClass} rel="next">
            Next
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled>Next</span>
        )}
      </div>
    </nav>
  );
}
