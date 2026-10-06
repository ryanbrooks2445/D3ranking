import Link from "next/link";
import { getAllSports } from "@/lib/sports";

/**
 * Horizontal sport tabs for section pages. Sports not in `enabled` still link
 * through so users can see the unavailable state and the player rankings link.
 */
export function SportSwitcher({
  current,
  hrefFor,
  enabled,
}: {
  current: string;
  hrefFor: (code: string) => string;
  enabled?: Set<string>;
}) {
  const sports = getAllSports();
  return (
    <nav aria-label="Sport" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-slate-800">
        {sports.map((s) => {
          const active = s.code === current;
          const available = !enabled || enabled.has(s.code);
          return (
            <li key={s.code}>
              <Link
                href={hrefFor(s.code)}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-10 items-center px-3 text-sm whitespace-nowrap ${
                  active ? "font-semibold text-white" : available ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-400"
                }`}
              >
                {s.label}
                {active && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-blue-500" aria-hidden />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
