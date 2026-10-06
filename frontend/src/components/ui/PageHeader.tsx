import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";

/**
 * Standard page masthead: breadcrumbs, small eyebrow, title, one-line meta, optional actions.
 * Deliberately compact — the content below is the point of the page.
 */
export function PageHeader({
  crumbs,
  eyebrow,
  title,
  meta,
  actions,
  children,
}: {
  crumbs?: Crumb[];
  eyebrow?: string;
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-slate-800 pb-4">
      {crumbs && <Breadcrumbs items={crumbs} />}
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">{eyebrow}</p>
          )}
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
          {meta && <div className="mt-1 text-sm text-slate-400">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
