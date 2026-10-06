/** GET form to /search; works without JavaScript. */
export function SearchInput({
  className = "",
  defaultValue = "",
  placeholder = "Search players, teams, conferences",
  autoFocus = false,
  size = "sm",
}: {
  className?: string;
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  size?: "sm" | "lg";
}) {
  const sizing = size === "lg" ? "h-11 text-base" : "h-9 text-sm";
  return (
    <form action="/search" role="search" className={`relative ${className}`}>
      <label htmlFor={`site-search-${size}`} className="sr-only">
        Search
      </label>
      <svg
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden
      >
        <circle cx="7" cy="7" r="4.5" />
        <path d="M10.5 10.5L14 14" strokeLinecap="round" />
      </svg>
      <input
        id={`site-search-${size}`}
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className={`w-full rounded border border-slate-700 bg-slate-900 pl-8 pr-3 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none ${sizing}`}
      />
    </form>
  );
}
