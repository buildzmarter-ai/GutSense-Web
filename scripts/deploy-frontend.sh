#!/usr/bin/env bash
# deploy-frontend.sh — Build and deploy the GutSense frontend to Cloudflare Pages
# Usage: ./scripts/deploy-frontend.sh [--dry-run]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
CF_PROJECT_NAME="gutsense-web"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

echo "=== GutSense Frontend Deploy ==="
echo "Project: $CF_PROJECT_NAME"
echo "Dry run: $DRY_RUN"
echo ""

# ── Pre-flight checks ─────────────────────────────────────────────────────

if ! command -v npx &>/dev/null; then
  echo "❌ npx not found. Install Node.js 18+ first."
  exit 1
fi

if ! npx wrangler --version &>/dev/null 2>&1; then
  echo "📦 Installing wrangler..."
  npm install -g wrangler
fi

# ── Check env ──────────────────────────────────────────────────────────────

if [[ ! -f "$FRONTEND_DIR/.env.production" ]]; then
  echo "❌ Missing frontend/.env.production"
  echo "   Copy .env.example → .env.production and set NEXT_PUBLIC_API_URL"
  exit 1
fi

source "$FRONTEND_DIR/.env.production"
if [[ -z "${NEXT_PUBLIC_API_URL:-}" ]]; then
  echo "❌ NEXT_PUBLIC_API_URL is empty in .env.production"
  exit 1
fi
echo "✅ API URL: $NEXT_PUBLIC_API_URL"

# ── Build ──────────────────────────────────────────────────────────────────

echo ""
echo "📦 Installing dependencies..."
cd "$FRONTEND_DIR"
npm ci --prefer-offline

echo ""
echo "🔨 Building static export..."
NODE_ENV=production npm run build

if [[ ! -d "$FRONTEND_DIR/out" ]]; then
  echo "❌ Build did not produce out/ directory"
  exit 1
fi
echo "✅ Static export ready: $(find out -type f | wc -l) files"

# ── Secret scan ────────────────────────────────────────────────────────────

echo ""
echo "🔍 Scanning build output for leaked secrets..."
if grep -rqP '(sk-ant-api|sk-[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9]{30,})' out/; then
  echo "❌ POSSIBLE SECRET LEAK detected in build output!"
  echo "   Run: grep -rP '(sk-ant-|sk-[a-zA-Z0-9]{20,}|AIza)' out/"
  exit 1
fi
echo "✅ No secrets detected in build output"

# ── Deploy ─────────────────────────────────────────────────────────────────

if $DRY_RUN; then
  echo ""
  echo "🏁 Dry run complete. Would deploy out/ to Cloudflare Pages project: $CF_PROJECT_NAME"
  exit 0
fi

echo ""
echo "🚀 Deploying to Cloudflare Pages..."
npx wrangler pages deploy out/ \
  --project-name="$CF_PROJECT_NAME" \
  --commit-dirty=true

echo ""
echo "✅ Deploy complete!"
echo ""
echo "Next steps:"
echo "  1. Add custom domain in Cloudflare Pages dashboard:"
echo "     gutsense.industriallystrong.com"
echo "  2. Update Railway FRONTEND_URL to include:"
echo "     https://gutsense.industriallystrong.com"
echo "  3. Run: ./scripts/verify-production.sh"
