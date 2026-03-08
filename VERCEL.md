# Deploy to Vercel

## 1. Push your code to GitHub

If you haven’t already:

```bash
cd /Users/ryanbrooks/Desktop/NCAA_Project
git init
git add .
# Ensure .env is not committed (it’s in .gitignore)
git commit -m "Initial commit"
# Create a repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

**Important:** Run your data export and commit the output so the site has rankings data:

```bash
# From project root (with your Python env active)
python export_frontend_data.py
git add frontend/public/data
git commit -m "Add exported rankings data"
git push
```

## 2. Import the project on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub).
2. **Add New** → **Project** → import your GitHub repo.
3. **Root Directory:** click **Edit**, set to **`frontend`** (so Vercel builds the Next.js app).
4. Leave **Framework Preset** as Next.js and **Build Command** as `next build`.
5. Click **Deploy** (you can add env vars in the next step if you want the first deploy to succeed without Stripe).

## 3. Set environment variables

In the Vercel project: **Settings** → **Environment Variables**. Add:

| Name | Value | Notes |
|------|--------|--------|
| `AUTH_SECRET` | (generate a long random string) | e.g. `openssl rand -base64 32` |
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` | From [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `STRIPE_PRICE_ID` | `price_...` | Your subscription Price ID (live or test) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | From Stripe Dashboard → Developers → Webhooks (see [§ Webhooks](#webhooks) below) |
| `DATABASE_URL` | Connection string | For production use a hosted DB (e.g. [Turso](https://turso.tech), [Neon](https://neon.tech), or Vercel Postgres). SQLite `file:./dev.db` only works locally. |
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` | Your Vercel URL (or custom domain later) |

Then **Redeploy** the project (Deployments → ⋮ on latest → Redeploy) so the new env vars are used.

## 4. Optional: custom domain

In **Settings** → **Domains**, add your domain and follow Vercel’s DNS instructions. Update `NEXT_PUBLIC_APP_URL` to that domain and redeploy.

---

**Summary:** Root directory = **`frontend`**, add **AUTH_SECRET**, **STRIPE_***, **DATABASE_URL** (production), **STRIPE_WEBHOOK_SECRET**, and **NEXT_PUBLIC_APP_URL**, and ensure **`frontend/public/data`** is committed after running `export_frontend_data.py`.

---

## Webhooks (Pro subscription sync)

So the app reliably knows who has Pro (who paid), set up Stripe webhooks and **STRIPE_WEBHOOK_SECRET**:

1. **Stripe Dashboard** → [Developers → Webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**.
2. **Endpoint URL:** `https://d3rank.com/api/webhooks/stripe` (or your production URL).
3. **Events to send:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. After creating the endpoint, click it and **Reveal** the **Signing secret** (starts with `whsec_`).
5. In Vercel: **Settings → Environment Variables** → add **STRIPE_WEBHOOK_SECRET** = that value, then **Redeploy**.

For local testing you can use the Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and use the printed `whsec_...` in `frontend/.env`.

---

## 5. Why new features don’t show on Vercel (season, Score, Pos, etc.)

On Vercel the app **does not** serve `public/data` (it’s in `.vercelignore`). It loads data from **GitHub Raw** instead.

- **Default:** `https://raw.githubusercontent.com/ryanbrooks2445/D3ranking/main/frontend/public/data`
- So the JSON files (rankings, meta.json, etc.) must exist **in that repo and branch** for the live site to show season, Score, position, and full rankings.

**Option A – Data in the same repo as the app (recommended)**

1. In Vercel: **Settings → Environment Variables**. Add:
   - **Name:** `DATA_BASE_URL`
   - **Value:** `https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME/main/frontend/public/data`  
     (Replace with the repo Vercel deploys from, e.g. `NCAA_Project`.)
2. From your project root, export and commit the data:
   ```bash
   python export_frontend_data.py
   git add frontend/public/data
   git commit -m "Export data with season, position, composite score"
   git push
   ```
3. **Redeploy** the project in Vercel so it picks up the new env var and the new data on GitHub.

The app will then load from your repo’s `frontend/public/data` and the new features will show.

**Option B – Keep using the D3ranking repo for data**

If you keep the default (no `DATA_BASE_URL`), the app will keep loading from **ryanbrooks2445/D3ranking**. Then:

1. Run the export and push the **data** into that repo:
   ```bash
   python export_frontend_data.py
   # Then in your D3ranking repo (or by copying frontend/public/data into it):
   git add frontend/public/data
   git commit -m "Export data with season, position, composite score"
   git push origin main
   ```
2. Redeploy on Vercel so it fetches the updated files from GitHub (cache may take a minute).

Either way, the data on GitHub must include the **new** export (with `season`, `position`, `composite_score`, and `sports/mbb/meta.json`). Re-run `export_frontend_data.py` and push the updated `frontend/public/data` to the repo that `DATA_BASE_URL` points to (or to D3ranking if you don’t set it).

---

## 6. How to preview the Pro experience (before launch)

**Option A – Local dev with env flag (easiest)**

1. In `frontend/.env` add:
   ```
   NEXT_PUBLIC_PREVIEW_PRO=true
   ```
2. Restart the dev server (`npm run dev`).
3. Open the site locally. You’ll see the full Pro experience: full rankings list, OVR and Rank visible, search, no paywall.

**Option B – Cookie on the live site**

1. Open your deployed site (e.g. d3ranking.vercel.app).
2. Open DevTools (F12) → **Application** (Chrome) or **Storage** (Firefox).
3. **Cookies** → select your site’s domain.
4. Add a cookie: **Name** `d3_pro`, **Value** `true`.
5. Refresh the page. The site will treat you as Pro until the cookie is removed or expires.

Use this to check what paying users see (full lists, OVR, Score, search) before you launch.
