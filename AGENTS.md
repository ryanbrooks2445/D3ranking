# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

D3 Rankings (d3rank.com) — NCAA Division III composite player rankings platform. Two-component monorepo:

| Component | Path | Stack |
|---|---|---|
| Python scraper/data pipeline | `/workspace/` (root) | Python 3.12, pandas, BeautifulSoup4, requests |
| Next.js frontend | `/workspace/frontend/` | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Prisma (PostgreSQL), NextAuth v5, Stripe |

Data flow: Python scraper → CSV in `data/` → `python export_frontend_data.py` → JSON in `frontend/public/data/` → Next.js reads from filesystem (dev).

### Running services

**PostgreSQL** must be running before the Next.js app starts:
```
sudo pg_ctlcluster 16 main start
```

**Next.js dev server** (port 3000):
```
cd frontend && npm run dev
```

**Python virtual environment** is at `.venv/`. Activate with `source .venv/bin/activate`.

### Key commands

- **Lint**: `cd frontend && npm run lint`
- **Build**: `cd frontend && npm run build`
- **Export data**: `source .venv/bin/activate && python export_frontend_data.py`

### Environment variables

`frontend/.env` must contain at minimum:
- `DATABASE_URL` — PostgreSQL connection string (dev: `postgresql://d3rank:d3rank@localhost:5432/d3rank`)
- `AUTH_SECRET` — any string for local dev
- `NEXT_PUBLIC_PREVIEW_PRO=true` — bypasses Stripe paywall locally

Stripe-related env vars (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`) are optional for local dev; the app works in free mode without them.

### Gotchas

- Prisma migrations must be applied (`npx prisma migrate dev`) before the Next.js app can start. The update script handles `prisma generate`.
- The `npm run build` script includes a fallback `DATABASE_URL` so builds succeed even without a real database, but `npm run dev` requires the real `.env`.
- ESLint has some pre-existing errors (prefer-const, no-html-link-for-pages) that are in the codebase, not from setup.
- The frontend reads data from `frontend/public/data/` in dev mode. Re-run `python export_frontend_data.py` from the repo root to regenerate.
