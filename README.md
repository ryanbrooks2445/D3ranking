# NCAA Project (Python)

Scrape NCAA D3 conference stats, rank players, and publish JSON for [d3rank.com](https://d3rank.com).

## Setup

Create and activate a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Run:

```bash
python main.py
```

## Daily rankings refresh

The live site loads rankings from GitHub raw (`frontend/public/data` on `main`), not from a scrape at request time.

A GitHub Actions workflow runs **daily at 10:00 UTC** (~6:00 AM America/New_York during EDT) and can also be started from the **Actions** tab. It scrapes, exports, and commits updated data.

- How it works, how to run it locally, and how to pause the schedule: **[docs/DAILY_REFRESH.md](docs/DAILY_REFRESH.md)**
- Vercel / `DATA_BASE_URL`: **[VERCEL.md](VERCEL.md)**

```bash
python scripts/run_daily_refresh.py --check          # validate pipeline
python scripts/run_daily_refresh.py --skip-scrape    # export current CSVs
python scripts/run_daily_refresh.py                  # full scrape + export
```

## Website (local)

This project includes a small web app to view rankings:

```bash
streamlit run app.py
```

The production site is the Next.js app in `frontend/` (`npm run dev` from that directory).

