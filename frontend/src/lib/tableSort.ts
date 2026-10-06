export type SortDir = "asc" | "desc";
export type SortState = { key: string; dir: SortDir };

export type SortableColumnDef = {
  key: string;
  defaultDir?: SortDir;
};

/** Parse ?sort=&dir= with a fallback and a whitelist of sortable keys. */
export function parseSort(
  params: { sort?: string; dir?: string },
  allowed: SortableColumnDef[],
  fallback: SortState,
): SortState {
  const col = allowed.find((c) => c.key === params.sort);
  if (!col) return fallback;
  const dir: SortDir = params.dir === "asc" || params.dir === "desc" ? params.dir : (col.defaultDir ?? "desc");
  return { key: col.key, dir };
}

/** Next sort state when a header is clicked: toggle if active, else the column default. */
export function nextSort(current: SortState, key: string, defaultDir: SortDir = "desc"): SortState {
  if (current.key === key) return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key, dir: defaultDir };
}

/** Build an href preserving other query params and resetting pagination. */
export function sortHref(
  basePath: string,
  params: Record<string, string | undefined>,
  sort: SortState,
): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "sort" && k !== "dir" && k !== "page") search.set(k, v);
  }
  search.set("sort", sort.key);
  search.set("dir", sort.dir);
  return `${basePath}?${search.toString()}`;
}

/** Generic comparator for in-memory sorting of already-loaded rows. Nulls always last. */
export function compareValues(a: unknown, b: unknown, dir: SortDir): number {
  const aNull = a == null || a === "";
  const bNull = b == null || b === "";
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  let cmp: number;
  if (typeof a === "number" && typeof b === "number") cmp = a - b;
  else cmp = String(a).localeCompare(String(b), "en", { sensitivity: "base" });
  return dir === "asc" ? cmp : -cmp;
}

export function sortRows<T>(rows: T[], accessor: (row: T) => unknown, dir: SortDir): T[] {
  return [...rows].sort((x, y) => compareValues(accessor(x), accessor(y), dir));
}
