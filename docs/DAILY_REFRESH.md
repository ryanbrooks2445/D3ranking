# Daily rankings refresh

d3rank.com does **not** scrape at request time. Vercel serves the Next.js app and loads ranking JSON from GitHub raw (`frontend/public/data` on `main`). See [VERCEL.md](../VERCEL.md).

```
Sidearm / Clippd  →  data/*.csv  →  export_frontend_data.py  →  frontend/public/data/**
                                                              →  GitHub raw (live site)
                                                              →  optional Postgres sync (profiles)
                                                              →  optional Instagram @d3rank post
```

## What runs automatically

[`.github/workflows/daily-rankings-refresh.yml`](../.github/workflows/daily-rankings-refresh.yml) runs every day at **10:00 UTC** (about **6:00 AM America/New_York** during EDT, **5:00 AM** during EST).

It also has **Run workflow** (`workflow_dispatch`) on the Actions tab so you can refresh on demand.

The job:

1. Installs Python 3.12 and `requirements.txt`
2. Runs `scripts/run_daily_refresh.py`, which calls:
   - `run_basketball_rankings.py --refresh` — live MBB Sidearm/C2C scrape + rank (default season 2026–27)
   - `run_all_sports.py --skip-codes baseball` — other Sidearm sports (Sidearm year=2026 / 2026–27)
   - `run_baseball_2026_27.py` — baseball 2026–27 (same season constants)
   - `run_golf_rankings.py` — men’s/women’s golf via Clippd (season 2026–27 / Clippd 2027, falls back if empty)
   - `export_frontend_data.py` — writes `frontend/public/data`
3. Generates `artifacts/instagram/daily-rankings.jpg` + caption (MBB top 5).
4. If repo secret `DATABASE_URL` is set, runs `frontend` `npm run db:sync-rankings`. If the secret is missing, this step is skipped (the public site uses GitHub JSON).
5. Commits and pushes `data/`, `frontend/public/data`, and `artifacts/instagram` to the branch that triggered the workflow (`main` for the schedule).
6. If `IG_USER_ID` and `IG_ACCESS_TOKEN` are set, publishes the graphic to Instagram @d3rank. Missing secrets or a publish error do **not** fail the job. Setup: **[docs/INSTAGRAM.md](INSTAGRAM.md)**.

Per-conference scrape failures are skipped; yesterday’s CSV is left in place. Empty scrapes do not overwrite existing conference files. Export still runs so a flaky conference does not block the rest of the site. The Actions log prints a per-job **OK / FAILED** summary.

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Full scrape + export (long; hits many conference sites)
python scripts/run_daily_refresh.py

# Re-export current CSVs only
python scripts/run_daily_refresh.py --skip-scrape

# One job, e.g. golf then export
python scripts/run_daily_refresh.py --only golf,export

# Import / file check (no network, no writes)
python scripts/run_daily_refresh.py --check

# Instagram graphic only (no post)
python scripts/instagram_daily_post.py --generate
```

Same scripts as the workflow. After a local export:

```bash
git add data frontend/public/data
git commit -m "Refresh rankings data"
git push origin main
```

The live site reads GitHub raw with a short cache (`revalidate: 60`). A Vercel rebuild is not required for data-only updates.

## Manual trigger and pause

- **Run now:** GitHub → **Actions** → **Daily rankings refresh** → **Run workflow**. Optional inputs: skip scrape, skip commit (dry run), skip Instagram, or a subset of jobs.
- **Pause the schedule:** Actions → **Daily rankings refresh** → ⋮ → **Disable workflow**. Re-enable the same way. Or comment out the `schedule:` block in the YAML.

## Confirm the first scheduled run

After this workflow is on `main`:

1. Open the next **Daily rankings refresh** run (or trigger it manually without skip-commit).
2. Check the summary in the log: scrape jobs OK/FAILED, export OK.
3. Confirm the bot commit on `main` touching `frontend/public/data`.
4. Hard-refresh d3rank.com a minute later (GitHub raw cache).

If a site blocks GitHub Actions IPs, the job still exports last-good CSVs. Re-run locally and push, or wait for the next day.

## Gaps and follow-ups

| Area | Status |
|------|--------|
| Presto conferences (4) | No multi-sport scraper. MBB keeps cached CSVs when Sidearm does not apply. |
| C2C | MBB has a dedicated scraper; other C2C sports are not Sidearm. |
| Season constants | Production default is 2026–27 (`ncaa_rankings/season.py`). Empty 2026–27 scrapes keep last year’s CSVs and do not copy last year’s rows into `*_2026_27.csv` files. |
| Full-name lookup | `scripts/fetch_full_names_from_rosters.py` is manual (needs `data/roster_urls.csv`). |
| Postgres / athlete profiles | Optional. Add Actions secret `DATABASE_URL` to enable sync after export. Do not commit credentials. |
| Instagram @d3rank | Optional. Add `IG_USER_ID` + `IG_ACCESS_TOKEN` (see [INSTAGRAM.md](INSTAGRAM.md)). |
| Branch protection on `main` | Data commits use `github-actions[bot]`. Allow that actor to push, or run the workflow from a data branch. |

The ranking formula and frontend UI are unchanged. This path only automates scrape → export → git.
