# GutSense Web — Production Deployment Guide

> Deploy the frontend to **Cloudflare Pages** at `gutsense.industriallystrong.com`
> with the backend on **Railway**.

---

## Architecture

```
┌─────────────────────────────┐       ┌───────────────────────────┐
│  Cloudflare Pages           │       │  Railway                  │
│  (static Next.js export)    │──────▶│  (FastAPI + Docker)       │
│                             │ HTTPS │                           │
│  gutsense.industriallystrong│       │  gutsense-api-production  │
│  .com                       │       │  .up.railway.app          │
└─────────────────────────────┘       └───────────────────────────┘
        │                                      │
        ▼                                      ▼
  Cloudflare DNS                         /health endpoint
  (CNAME record)                         CORS → frontend URL
```

## Step 1 — Set the Railway Backend URL

Edit `frontend/.env.production` and set your actual Railway URL:

```
NEXT_PUBLIC_API_URL=https://gutsense-web-production.up.railway.app
```

> **Find your Railway URL:** Railway dashboard → your GutSense service → Settings → Domains.

## Step 2 — Update Railway Environment Variables

In the Railway dashboard, set or update these env vars on the backend service:

| Variable | Value |
|---|---|
| `FRONTEND_URL` | `https://gutsense.industriallystrong.com,https://gutsense.pages.dev` |
| `ENVIRONMENT` | `production` |
| `ANTHROPIC_API_KEY` | Your key |
| `GOOGLE_API_KEY` | Your key |
| `OPENAI_API_KEY` | Your key |
| `API_SECRET` | (optional) Bearer token for API auth |

**Important:** `FRONTEND_URL` is comma-separated. Include every domain that
should be allowed to call the API. The old `gutsense.pages.dev` can be kept
during migration and removed later.

After updating, Railway will redeploy automatically.

## Step 3 — Deploy Frontend to Cloudflare Pages

### Option A: Automated (recommended)

```bash
./scripts/deploy-frontend.sh
```

This script will:
1. Verify `.env.production` is set
2. Run `npm ci && npm run build` (produces `out/`)
3. Scan the build for leaked secrets
4. Deploy `out/` to Cloudflare Pages via `wrangler`

### Option B: Git-connected (CI/CD)

1. In **Cloudflare Dashboard → Pages → Create a project**
2. Connect the `buildzmarter-ai/GutSense-Web` GitHub repo
3. Configure:
   - **Build command:** `cd frontend && npm ci && npm run build`
   - **Build output directory:** `frontend/out`
   - **Root directory:** `/` (leave default)
   - **Environment variable:** `NEXT_PUBLIC_API_URL` = your Railway URL
4. Deploy

## Step 4 — Add Custom Domain in Cloudflare Pages

1. Go to **Cloudflare Dashboard → Pages → gutsense-web → Custom domains**
2. Click **Set up a custom domain**
3. Enter: `gutsense.industriallystrong.com`
4. Cloudflare will automatically create a CNAME record since you manage DNS there
5. SSL is provisioned automatically (Universal SSL)

### Manual DNS (if auto-setup fails)

In **Cloudflare DNS → industriallystrong.com**:

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | `gutsense` | `gutsense-web.pages.dev` | Proxied ✅ |

## Step 5 — Verify Production

```bash
./scripts/verify-production.sh
```

This checks:
- Backend `/health` returns 200
- CORS preflight allows the frontend origin
- Credentials endpoint returns booleans only (no secret leakage)
- SSL certificates are valid
- Frontend serves HTML
- DNS resolves correctly
- No secrets in served HTML

### Quick manual checks

```bash
# Backend health
curl https://gutsense-web-production.up.railway.app/health

# CORS preflight
curl -I -X OPTIONS \
  -H "Origin: https://gutsense.industriallystrong.com" \
  -H "Access-Control-Request-Method: POST" \
  https://gutsense-web-production.up.railway.app/health

# Frontend
curl -I https://gutsense.industriallystrong.com
```

## Step 6 — Link from Main Site

See the `_gutsense-link-snippet.html` file for a minimal, non-invasive
approach to linking GutSense from the main industriallystrong.com site.

---

## Security Checklist

- [ ] `NEXT_PUBLIC_API_URL` is the only env var baked into the frontend bundle
- [ ] No API keys (Anthropic, OpenAI, Google) appear in the `out/` directory
- [ ] `FRONTEND_URL` on Railway lists only your domains (no wildcards)
- [ ] CORS is restricted to listed origins (no `*`)
- [ ] `allow_methods` is restricted to used HTTP methods
- [ ] `API_SECRET` is set if you want Bearer token auth on analysis endpoints
- [ ] Railway auto-deploys are from a protected branch only
- [ ] Cloudflare "Always Use HTTPS" is enabled for the zone

## Troubleshooting

**CORS errors in browser console:**
→ Check Railway's `FRONTEND_URL` includes exactly `https://gutsense.industriallystrong.com` (no trailing slash).

**404 on page refresh (SPA routes):**
→ Not applicable — `output: "export"` produces static HTML for each route. If you add client-side routing, configure Cloudflare Pages redirects in `frontend/public/_redirects`.

**Build fails with missing env var:**
→ Ensure `frontend/.env.production` exists and has `NEXT_PUBLIC_API_URL` set.

**SSL not working:**
→ Cloudflare Universal SSL can take up to 24 hours. Check Dashboard → SSL/TLS → Edge Certificates.
