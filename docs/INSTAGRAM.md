# Instagram daily post (@d3rank)

After a successful rankings refresh, the daily Actions workflow can publish one feed image to **[@d3rank](https://www.instagram.com/d3rank/)**.

```
export → generate JPEG + caption → commit artifacts/instagram/daily-rankings.jpg
     → GitHub raw HTTPS URL → Instagram Graph API (container → poll → publish)
```

This step is **optional**. Scrape → export → commit stays the success path. Missing secrets or a failed publish only logs a warning.

## Secrets

Repo → **Settings → Secrets and variables → Actions**. Do not commit these values.

| Secret | Required | Purpose |
|--------|----------|---------|
| `IG_USER_ID` | yes (to post) | Instagram Business Account ID for @d3rank (numeric, not the username) |
| `IG_ACCESS_TOKEN` | yes (to post) | Long-lived token with `instagram_basic` + `instagram_content_publish` (and Page permissions below) |
| `IG_IMAGE_PUBLIC_URL` | no | Override the public JPEG URL. Use this if Instagram cannot fetch GitHub raw |

Optional env (rarely needed): `IG_GRAPH_API_BASE` (default `https://graph.facebook.com`), `IG_GRAPH_API_VERSION` (default `v21.0`).

When `IG_USER_ID` or `IG_ACCESS_TOKEN` is unset, the job prints `IG_USER_ID / IG_ACCESS_TOKEN not set; skipping Instagram post.` and continues.

## Image hosting (no new paid infra)

Instagram’s servers fetch `image_url` themselves. It must be **JPEG** over **public HTTPS**.

Default: after the workflow pushes `artifacts/instagram/daily-rankings.jpg`, it publishes

`https://raw.githubusercontent.com/<owner>/<repo>/<commit-sha>/artifacts/instagram/daily-rankings.jpg`

This repo is already public (the live site loads rankings the same way). There is no Vercel Blob (or other object store) in the project.

If Meta cannot fetch `raw.githubusercontent.com`, set `IG_IMAGE_PUBLIC_URL` to any stable public JPEG (your own CDN, a tiny Vercel route, etc.). Local `--publish` also needs that override; localhost is not reachable by Instagram.

## Graphic and caption

`scripts/instagram_daily_post.py --generate` writes:

- `artifacts/instagram/daily-rankings.jpg` — 1080×1350 (4:5) JPEG, MBB global top 5
- `artifacts/instagram/caption.txt` — recap, hashtags (`#D3` `#D3Rankings` …), and `https://d3rank.com`

Instagram may hide or shorten links in captions; the URL is still included.

## Meta Developer setup (Ryan)

@d3rank must be a **Professional** account (Business or Creator) **linked to a Facebook Page**. Personal IG accounts cannot use content publishing.

### 1. Link Instagram to a Facebook Page

1. In the Instagram app: **Settings → Account type and tools** (or Accounts Center) → confirm Professional.
2. Link a Facebook Page you admin (create one if needed).  
   Meta: [Convert to a Professional account](https://help.instagram.com/502981923235522) and Page linking in Accounts Center.

### 2. Create or reuse a Meta app

1. Open [developers.facebook.com](https://developers.facebook.com/) → **My Apps → Create App**.
2. Choose a **Business** type app (or add Instagram to an existing one).
3. Add the **Instagram** product (Instagram Graph API). Add **Facebook Login** if the dashboard asks for it.
4. Under app settings, note **App ID** and **App Secret**.

### 3. Permissions

In **Graph API Explorer** (Tools → Graph API Explorer), select your app, then grant (and generate a token for the **Page**, not only the user):

- `instagram_basic`
- `instagram_content_publish`
- `pages_show_list`
- `pages_read_engagement`

Newer Instagram Login apps may show `instagram_business_basic` + `instagram_business_content_publish` instead. Either pair works if the token can call `/{ig-user-id}/media` and `media_publish`.

**Development mode:** you can publish to IG accounts you admin (Ryan as app admin + Page/IG admin). **Live mode / App Review** is only required if other people will use the app. For posting only to @d3rank, Development mode is enough.

### 4. Instagram Business Account ID (`IG_USER_ID`)

With a Page token:

```bash
curl -s "https://graph.facebook.com/v21.0/me/accounts?fields=name,access_token,instagram_business_account&access_token=USER_OR_PAGE_TOKEN"
```

Or, if you already have the Page ID:

```bash
curl -s "https://graph.facebook.com/v21.0/PAGE_ID?fields=instagram_business_account&access_token=PAGE_TOKEN"
```

The `instagram_business_account.id` value is `IG_USER_ID`.

### 5. Long-lived token (`IG_ACCESS_TOKEN`)

Short-lived tokens expire in hours. Exchange a user token, then request a Page token:

```bash
curl -s "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_LIVED_USER_TOKEN"
```

Then:

```bash
curl -s "https://graph.facebook.com/v21.0/me/accounts?access_token=LONG_LIVED_USER_TOKEN"
```

Use that Page’s `access_token` as `IG_ACCESS_TOKEN` (it can call the linked IG user). Long-lived user tokens last ~60 days; Page tokens minted from them are often non-expiring. If posts start failing with code `190`, generate a new token and update the secret.

Do not put App Secret in GitHub Actions unless you later add a refresh job. The publish step only needs `IG_USER_ID` + `IG_ACCESS_TOKEN`.

### 6. Add repo secrets and test

1. GitHub → this repo → **Settings → Secrets and variables → Actions** → add `IG_USER_ID` and `IG_ACCESS_TOKEN`.
2. Actions → **Daily rankings refresh** → **Run workflow**. You can skip scrape (`skip_scrape`) to export + generate + post without a full scrape. Do **not** enable `skip_commit` unless `IG_IMAGE_PUBLIC_URL` is set (the JPEG must already be public).
3. Confirm a new post on [@d3rank](https://www.instagram.com/d3rank/).

## Local commands

```bash
pip install -r requirements.txt
python scripts/instagram_daily_post.py --check
python scripts/instagram_daily_post.py --generate
# Review artifacts/instagram/daily-rankings.jpg and caption.txt

# Publish (needs secrets + a public JPEG URL)
export IG_USER_ID=...
export IG_ACCESS_TOKEN=...
export IG_IMAGE_PUBLIC_URL=https://raw.githubusercontent.com/ryanbrooks2445/D3ranking/main/artifacts/instagram/daily-rankings.jpg
python scripts/instagram_daily_post.py --publish --skip-if-no-secrets
```

## Pause

- Skip one run: workflow input **skip_instagram**.
- Stop posting until secrets are removed or the workflow is disabled (same as pausing daily refresh).

## Limits and pitfalls

- Instagram Content Publishing: on the order of **25–50 posts / 24 hours** per IG account. One daily post is fine.
- JPEG only for this path (no PNG/WebP). Max 8 MB; this graphic is well under.
- If the container stays `IN_PROGRESS` or returns `ERROR`, Instagram could not fetch the image URL (common if the file is not public yet, or GitHub raw is blocked). Wait and retry, or set `IG_IMAGE_PUBLIC_URL`.
- Publishing before `status_code=FINISHED` returns Graph error **9007**. The script polls first.
