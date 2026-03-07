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
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` | Your Vercel URL (or custom domain later) |

Then **Redeploy** the project (Deployments → ⋮ on latest → Redeploy) so the new env vars are used.

## 4. Optional: custom domain

In **Settings** → **Domains**, add your domain and follow Vercel’s DNS instructions. Update `NEXT_PUBLIC_APP_URL` to that domain and redeploy.

---

**Summary:** Root directory = **`frontend`**, add **AUTH_SECRET**, **STRIPE_***, and **NEXT_PUBLIC_APP_URL**, and ensure **`frontend/public/data`** is committed after running `export_frontend_data.py`.
