import Link from "next/link";

export type FilterOption = { value: string; label: string };

export type FilterField = {
  name: string;
  label: string;
  options: FilterOption[];
  value?: string;
  /** Label for the "no filter" option. */
  allLabel?: string;
};

/**
 * Server-rendered GET filter form. Hidden inputs preserve the current sort.
 * Submits with the native button; no client JavaScript required.
 */
export function FilterBar({
  basePath,
  fields,
  preserve = {},
  activeCount = 0,
}: {
  basePath: string;
  fields: FilterField[];
  preserve?: Record<string, string | undefined>;
  activeCount?: number;
}) {
  return (
    <form
      action={basePath}
      method="get"
      className="flex flex-wrap items-end gap-3 border-b border-slate-800 pb-4"
    >
      {Object.entries(preserve).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      {fields.map((field) => (
        <label key={field.name} className="flex min-w-[10rem] flex-col gap-1 text-xs font-medium text-slate-400">
          {field.label}
          <select
            name={field.name}
            defaultValue={field.value ?? ""}
            className="h-9 rounded border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
          >
            <option value="">{field.allLabel ?? "All"}</option>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <button
        type="submit"
        className="h-9 rounded border border-slate-600 bg-slate-800 px-3 text-sm font-medium text-white hover:bg-slate-700"
      >
        Apply
      </button>
      {activeCount > 0 && (
        <Link href={basePath} className="h-9 px-2 text-sm leading-9 text-slate-400 hover:text-white">
          Clear
        </Link>
      )}
    </form>
  );
}
