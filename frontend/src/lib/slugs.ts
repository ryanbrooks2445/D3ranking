/** URL-safe slug from a display name. */
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Assign unique slugs when names collide. */
export function assignUniqueSlugs(names: string[]): Map<string, string> {
  const used = new Map<string, number>();
  const out = new Map<string, string>();
  for (const name of names) {
    const base = slugifyName(name) || "athlete";
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    const slug = count === 0 ? base : `${base}-${count + 1}`;
    out.set(name, slug);
  }
  return out;
}

export function slugifyTeam(name: string): string {
  return slugifyName(name) || "team";
}
