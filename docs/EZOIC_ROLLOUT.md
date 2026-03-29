# Ezoic full rollout (nameserver integration)

This guide matches the rollout plan for **d3rank.com** on Vercel + Next.js. DNS and Ezoic dashboard steps are done in **Namecheap** and **Ezoic**; this file is the single checklist to complete and keep as rollback reference.

## Current repo state (verified)

- **`frontend/public/ads.txt`** is served at **`https://d3rank.com/ads.txt`** after deploy (Next.js serves `public/` at site root).
- Contents should include your AdSense line, e.g.  
  `google.com, pub-7311183681885754, DIRECT, f08c47fec0942fa0`

---

## Phase 1: DNS preflight backup (before changing anything)

**Do this first** so you can roll back if needed.

1. Log in to **Namecheap** → **Domain List** → **d3rank.com** → **Advanced DNS**.
2. Screenshot or copy every record into the table below (or a private note).

| Host / Name | Type | Value | TTL | Notes |
|-------------|------|-------|-----|--------|
| `@` | A | (e.g. Vercel) | | Apex site |
| `www` | CNAME | (e.g. Vercel) | | |
| `@` or `_domainconnect` | TXT | | | If present |
| `@` | MX | | | Email |
| `@` | TXT | SPF | | Mail |
| (DKIM selectors) | TXT/CNAME | | | Mail auth |
| `_dmarc` | TXT | | | Optional |
| Other | | | | Stripe, Google, etc. |

3. In **Ezoic**: **Settings → DNS / Integrations** (wording may vary) → add **d3rank.com** and note the **nameservers** Ezoic assigns (e.g. `ns1.ezoic.net` style — use **your** dashboard values only).

**Rollback:** Keep Namecheap’s old nameserver values from this step so you can revert.

---

## Phase 2: Nameserver cutover

1. **Namecheap** → domain → **Nameservers** → select **Custom DNS** (or equivalent).
2. Replace with **exactly** the nameservers Ezoic shows for your site (usually 2–4 hosts).
3. Save. Propagation often takes **15 minutes–48 hours** (often under 2 hours).

### Recreate records in Ezoic DNS

After Ezoic controls DNS, open **Ezoic DNS** and ensure:

| Purpose | Typical setup |
|---------|-----------------|
| Site (apex) | `A` `@` → Vercel apex IP **or** CNAME flattening per Vercel docs |
| `www` | `CNAME` → `cname.vercel-dns.com` (or your Vercel target) |
| Mail | Copy **MX** + **SPF/DKIM/DMARC** from your Phase 1 backup |
| Verification | Any **TXT** for Google, Stripe, etc. from backup |

**Vercel:** Confirm in Vercel → Project → **Domains** that `d3rank.com` / `www` still show **Valid Configuration** after DNS propagates.

### Live checks (run after propagation)

- [ ] `https://d3rank.com` loads
- [ ] `https://www.d3rank.com` loads or redirects as before
- [ ] `https://d3rank.com/ads.txt` returns your AdSense line(s)
- [ ] Login / Stripe checkout still work

---

## Phase 3: Ezoic verification + monetization

1. In **Ezoic**, confirm site status moves to **verified / integrated**.
2. Link **Google AdSense** in Ezoic if required for your monetization path.
3. **Ads.txt**
   - Prefer keeping **`frontend/public/ads.txt`** as source of truth in git; redeploy when you change it.
   - If Ezoic offers **Ads.txt manager**, either sync with your file or follow Ezoic’s merge rules so you don’t drop required lines.

---

## Phase 4: Ad placement rollout (conservative)

1. Ezoic → **Monetization / Ad placements** (labels vary).
2. Start with **low density** on:
   - Homepage `/`
   - `/dashboard`
   - `/dashboard/sports/*`
3. Avoid heavy units next to primary nav, search, or tables at first.
4. Increase density only after 24–48h of stable traffic and no UX regressions.

---

## Phase 5: Performance (conservative)

1. Ezoic **Speed / Leap** (or equivalent): enable **core** optimizations first.
2. Avoid aggressive delay/above-the-fold experiments until you have a Lighthouse/PageSpeed baseline.
3. Compare **LCP / CLS / INP** before vs after on mobile + desktop.

---

## Phase 6: Consent + compliance

1. Enable **Ezoic consent** (or CMP) if you serve EU/UK/EEA users or want a global banner.
2. Test: EU-like VPN or tool → banner appears; ads respect consent.
3. Update **Privacy Policy** to mention advertising, Ezoic, and third-party data where required.

---

## Phase 7: QA + monitoring (first 72 hours)

**QA checklist**

- [ ] No spike in 404/502 on main routes
- [ ] Rankings tables and search usable
- [ ] `/api/checkout`, `/login`, Pro flows work
- [ ] Ads render without breaking layout on mobile

**Monitor**

- Ezoic revenue / EPMV
- Bounce rate, session duration (Analytics)
- Core Web Vitals (Search Console or PageSpeed)

**Rollback order**

1. Reduce ad density / disable aggressive settings in Ezoic.
2. If DNS is wrong: restore **Namecheap nameservers** from Phase 1 backup and fix records.

---

## Codebase reference

| Item | Location |
|------|----------|
| Static ads.txt | `frontend/public/ads.txt` |
| Root layout (global head/body) | `frontend/src/app/layout.tsx` |

**Nameserver integration** usually does **not** require an extra script in Next.js; Ezoic routes traffic at DNS. Add any **Ezoic-provided script** from your dashboard only if Ezoic explicitly asks for it (e.g. certain verification or non-proxy modes).

---

## Done criteria

- [ ] Phase 1 backup completed
- [ ] Nameservers point to Ezoic; DNS records recreated; site + Vercel domain valid
- [ ] Ezoic shows verified; AdSense linked if applicable; ads.txt OK
- [ ] Placements live at conservative settings
- [ ] Consent/speed settings chosen and documented
- [ ] 72h monitoring pass or issues triaged
