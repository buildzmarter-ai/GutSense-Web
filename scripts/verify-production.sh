#!/usr/bin/env bash
# verify-production.sh — End-to-end production health checks for GutSense
# Usage: ./scripts/verify-production.sh [--backend-only]
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────

FRONTEND_URL="${GUTSENSE_FRONTEND_URL:-https://gutsense.industriallystrong.com}"
BACKEND_URL="${GUTSENSE_BACKEND_URL:-}"

# Try to read backend URL from .env.production if not set
if [[ -z "$BACKEND_URL" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  ENV_FILE="$(dirname "$SCRIPT_DIR")/frontend/.env.production"
  if [[ -f "$ENV_FILE" ]]; then
    BACKEND_URL=$(grep NEXT_PUBLIC_API_URL "$ENV_FILE" | cut -d= -f2- | tr -d ' "'"'"'')
  fi
fi

if [[ -z "$BACKEND_URL" ]]; then
  echo "❌ Cannot determine backend URL."
  echo "   Set GUTSENSE_BACKEND_URL or create frontend/.env.production"
  exit 1
fi

BACKEND_ONLY=false
[[ "${1:-}" == "--backend-only" ]] && BACKEND_ONLY=true

PASS=0
FAIL=0
WARN=0

check() {
  local label="$1"
  local result="$2"  # "pass", "fail", or "warn"
  local detail="${3:-}"

  case "$result" in
    pass) echo "  ✅ $label${detail:+ — $detail}"; ((PASS++)) ;;
    fail) echo "  ❌ $label${detail:+ — $detail}"; ((FAIL++)) ;;
    warn) echo "  ⚠️  $label${detail:+ — $detail}"; ((WARN++)) ;;
  esac
}

echo "=== GutSense Production Verification ==="
echo "Frontend: $FRONTEND_URL"
echo "Backend:  $BACKEND_URL"
echo ""

# ── Backend Checks ─────────────────────────────────────────────────────────

echo "▸ Backend Health"

# 1. Health endpoint
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$BACKEND_URL/health" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
  check "GET /health" "pass" "HTTP $HTTP_CODE"
else
  check "GET /health" "fail" "HTTP $HTTP_CODE (expected 200)"
fi

# 2. Health response body
HEALTH_BODY=$(curl -s --max-time 10 "$BACKEND_URL/health" 2>/dev/null || echo "{}")
if echo "$HEALTH_BODY" | grep -q '"status".*"ok"'; then
  check "/health response body" "pass" "$HEALTH_BODY"
else
  check "/health response body" "fail" "Unexpected: $HEALTH_BODY"
fi

# 3. CORS preflight
echo ""
echo "▸ CORS Preflight"
CORS_HEADERS=$(curl -s -I -X OPTIONS \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  --max-time 10 \
  "$BACKEND_URL/health" 2>/dev/null || echo "")

if echo "$CORS_HEADERS" | grep -qi "access-control-allow-origin"; then
  ALLOWED=$(echo "$CORS_HEADERS" | grep -i "access-control-allow-origin" | head -1)
  check "CORS allow-origin" "pass" "$(echo "$ALLOWED" | tr -d '\r')"
else
  check "CORS allow-origin" "fail" "No Access-Control-Allow-Origin header"
fi

if echo "$CORS_HEADERS" | grep -qi "access-control-allow-headers"; then
  check "CORS allow-headers" "pass"
else
  check "CORS allow-headers" "warn" "Missing (browser may block requests)"
fi

# 4. Credential status (should work without auth)
echo ""
echo "▸ Credential Status (no secrets exposed)"
CRED_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$BACKEND_URL/credentials/status" 2>/dev/null || echo "000")
if [[ "$CRED_CODE" == "200" ]]; then
  CRED_BODY=$(curl -s --max-time 10 "$BACKEND_URL/credentials/status" 2>/dev/null)
  # Verify it only returns booleans, never actual keys
  if echo "$CRED_BODY" | grep -qP '(sk-|AIza)'; then
    check "Credentials endpoint" "fail" "LEAKING SECRETS! $CRED_BODY"
  else
    check "Credentials endpoint" "pass" "Returns booleans only"
  fi
else
  check "Credentials endpoint" "warn" "HTTP $CRED_CODE"
fi

# 5. SSL certificate
echo ""
echo "▸ SSL / TLS"
BACKEND_HOST=$(echo "$BACKEND_URL" | sed 's|https://||' | cut -d/ -f1)
SSL_EXPIRY=$(echo | openssl s_client -servername "$BACKEND_HOST" -connect "$BACKEND_HOST:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [[ -n "$SSL_EXPIRY" ]]; then
  check "Backend SSL" "pass" "Expires: $SSL_EXPIRY"
else
  check "Backend SSL" "warn" "Could not verify certificate"
fi

if $BACKEND_ONLY; then
  echo ""
  echo "=== Backend-only check complete: $PASS pass, $FAIL fail, $WARN warn ==="
  [[ $FAIL -eq 0 ]] && exit 0 || exit 1
fi

# ── Frontend Checks ────────────────────────────────────────────────────────

echo ""
echo "▸ Frontend"

# 6. Frontend loads
FE_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$FRONTEND_URL" 2>/dev/null || echo "000")
if [[ "$FE_CODE" == "200" ]]; then
  check "Frontend loads" "pass" "HTTP $FE_CODE"
else
  check "Frontend loads" "fail" "HTTP $FE_CODE"
fi

# 7. Frontend serves HTML
FE_CONTENT_TYPE=$(curl -s -I --max-time 10 "$FRONTEND_URL" 2>/dev/null | grep -i "content-type" | head -1)
if echo "$FE_CONTENT_TYPE" | grep -qi "text/html"; then
  check "Content-Type" "pass" "$(echo "$FE_CONTENT_TYPE" | tr -d '\r')"
else
  check "Content-Type" "warn" "$(echo "$FE_CONTENT_TYPE" | tr -d '\r')"
fi

# 8. Frontend SSL
FE_HOST=$(echo "$FRONTEND_URL" | sed 's|https://||' | cut -d/ -f1)
FE_SSL_EXPIRY=$(echo | openssl s_client -servername "$FE_HOST" -connect "$FE_HOST:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [[ -n "$FE_SSL_EXPIRY" ]]; then
  check "Frontend SSL" "pass" "Expires: $FE_SSL_EXPIRY"
else
  check "Frontend SSL" "warn" "Could not verify certificate"
fi

# 9. No secrets in served HTML
FE_HTML=$(curl -s --max-time 10 "$FRONTEND_URL" 2>/dev/null || echo "")
if echo "$FE_HTML" | grep -qP '(sk-ant-api|sk-[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9]{30,})'; then
  check "No secrets in HTML" "fail" "POSSIBLE SECRET IN SERVED HTML"
else
  check "No secrets in HTML" "pass"
fi

# ── DNS Check ──────────────────────────────────────────────────────────────

echo ""
echo "▸ DNS"
DNS_RESULT=$(dig +short "$FE_HOST" 2>/dev/null || echo "")
if [[ -n "$DNS_RESULT" ]]; then
  check "DNS resolves" "pass" "$FE_HOST → $(echo "$DNS_RESULT" | head -1)"
else
  check "DNS resolves" "fail" "$FE_HOST has no DNS records"
fi

# ── Summary ────────────────────────────────────────────────────────────────

echo ""
echo "=== Results: $PASS pass, $FAIL fail, $WARN warn ==="
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
