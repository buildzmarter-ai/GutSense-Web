"""GutSense Web API -- FODMAP analysis powered by Claude + Gemini + OpenAI."""

from __future__ import annotations

import logging
import os
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()  # Load .env file if present (local dev)

from agents import (
    analyze_with_claude,
    analyze_with_gemini,
    analyze_with_openai,
    synthesize_results,
    validate_anthropic_key,
    validate_google_key,
    validate_openai_key,
)
from keychain_service import (
    ANTHROPIC_KEY,
    API_SECRET,
    GOOGLE_KEY,
    OPENAI_KEY,
    delete_credential,
    delete_source_credential,
    get_credentials_status,
    get_source_credentials_status,
    read_credential,
    read_source_credential,
    store_credential,
    store_source_credential,
)
from models import (
    AgentResultDTO,
    AnalysisRequest,
    FeedbackRequest,
    SynthesisResultDTO,
    SynthesizeRequest,
)

logger = logging.getLogger("gutsense")
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="GutSense API",
    version="2.0.0",
    description="FODMAP food analysis using Claude, Gemini, and OpenAI AI agents",
)

# ── CORS ────────────────────────────────────────────────────────────────────

_cors_origins: list[str] = []

# In production, only allow explicitly configured origins.
# FRONTEND_URL accepts a comma-separated list for multi-domain support
# e.g. "https://gutsense.industriallystrong.com,https://gutsense.pages.dev"
_frontend_urls = os.environ.get("FRONTEND_URL", "")
for url in _frontend_urls.split(","):
    url = url.strip().rstrip("/")
    if url:
        _cors_origins.append(url)

# Localhost origins for local development only
if os.environ.get("ENVIRONMENT", "production").lower() in ("development", "dev", "local"):
    _cors_origins.extend(["http://localhost:3000", "http://localhost:3001"])

# Fallback: if nothing configured, allow localhost (safe default for first-time dev)
if not _cors_origins:
    logger.warning("No CORS origins configured – defaulting to localhost:3000")
    _cors_origins = ["http://localhost:3000", "http://localhost:3001"]

logger.info("CORS allowed origins: %s", _cors_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Auth helper ─────────────────────────────────────────────────────────────


async def verify_token(
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    """Optional Bearer-token auth. Skipped when API_SECRET is unset in Keychain."""
    secret = read_credential(API_SECRET)
    if not secret:
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    token = authorization.removeprefix("Bearer ").strip()
    if token != secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API secret",
        )


# ── Credential Management ──────────────────────────────────────────────────


class CredentialUpdate(BaseModel):
    anthropic_api_key: str | None = None
    google_api_key: str | None = None
    openai_api_key: str | None = None
    api_secret: str | None = None


@app.get("/credentials/status")
async def credentials_status() -> dict[str, bool]:
    """Check which API keys are configured in Keychain."""
    return get_credentials_status()


@app.put("/credentials")
async def update_credentials(creds: CredentialUpdate) -> dict[str, str]:
    """Store API keys in macOS Keychain."""
    updated = []
    if creds.anthropic_api_key is not None:
        if creds.anthropic_api_key:
            store_credential(ANTHROPIC_KEY, creds.anthropic_api_key)
            updated.append("anthropic_api_key")
        else:
            delete_credential(ANTHROPIC_KEY)
            updated.append("anthropic_api_key (removed)")

    if creds.google_api_key is not None:
        if creds.google_api_key:
            store_credential(GOOGLE_KEY, creds.google_api_key)
            updated.append("google_api_key")
        else:
            delete_credential(GOOGLE_KEY)
            updated.append("google_api_key (removed)")

    if creds.openai_api_key is not None:
        if creds.openai_api_key:
            store_credential(OPENAI_KEY, creds.openai_api_key)
            updated.append("openai_api_key")
        else:
            delete_credential(OPENAI_KEY)
            updated.append("openai_api_key (removed)")

    if creds.api_secret is not None:
        if creds.api_secret:
            store_credential(API_SECRET, creds.api_secret)
            updated.append("api_secret")
        else:
            delete_credential(API_SECRET)
            updated.append("api_secret (removed)")

    return {"status": "ok", "updated": ", ".join(updated) if updated else "none"}


@app.get("/credentials/validate/{provider}")
async def validate_credential(provider: str) -> dict[str, object]:
    """Validate an API key by making a minimal request to the provider."""
    if provider == "anthropic":
        api_key = read_credential(ANTHROPIC_KEY)
        if not api_key:
            return {"valid": False, "message": "Anthropic API key not configured"}
        valid, msg = await validate_anthropic_key(api_key)
        return {"valid": valid, "message": msg}
    elif provider == "google":
        api_key = read_credential(GOOGLE_KEY)
        if not api_key:
            return {"valid": False, "message": "Google API key not configured"}
        valid, msg = await validate_google_key(api_key)
        return {"valid": valid, "message": msg}
    elif provider == "openai":
        api_key = read_credential(OPENAI_KEY)
        if not api_key:
            return {"valid": False, "message": "OpenAI API key not configured"}
        valid, msg = await validate_openai_key(api_key)
        return {"valid": valid, "message": msg}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown provider: {provider}",
        )


# ── Source Site Credentials ────────────────────────────────────────────────


class SourceCredentialUpdate(BaseModel):
    source_id: str
    username: str
    password: str


@app.get("/sources/status")
async def sources_status() -> dict[str, dict]:
    """Check which source site logins are configured in Keychain."""
    return get_source_credentials_status()


@app.put("/sources/credentials")
async def update_source_credentials(cred: SourceCredentialUpdate) -> dict[str, str]:
    """Store a source site login in macOS Keychain."""
    if not cred.username or not cred.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both username and password are required",
        )
    store_source_credential(cred.source_id, cred.username, cred.password)
    return {"status": "ok", "source": cred.source_id}


@app.delete("/sources/credentials/{source_id}")
async def remove_source_credentials(source_id: str) -> dict[str, str]:
    """Remove a source site login from macOS Keychain."""
    delete_source_credential(source_id)
    return {"status": "ok", "source": source_id, "action": "removed"}


@app.get("/sources/credentials/{source_id}")
async def get_source_credential_check(source_id: str) -> dict[str, object]:
    """Check if a source credential exists (never returns the actual password)."""
    cred = read_source_credential(source_id)
    if cred:
        return {"configured": True, "username": cred["username"]}
    return {"configured": False, "username": None}


# ── Routes ──────────────────────────────────────────────────────────────────


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze/claude", response_model=AgentResultDTO)
async def analyze_claude(
    req: AnalysisRequest,
    _auth: None = Depends(verify_token),
) -> AgentResultDTO:
    api_key = read_credential(ANTHROPIC_KEY)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Anthropic API key not configured. Go to Settings to add it.",
        )
    try:
        return await analyze_with_claude(req, api_key)
    except Exception as exc:
        logger.exception("Claude analysis failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Claude analysis error: {exc}",
        ) from exc


@app.post("/analyze/openai", response_model=AgentResultDTO)
async def analyze_openai_endpoint(
    req: AnalysisRequest,
    _auth: None = Depends(verify_token),
) -> AgentResultDTO:
    api_key = read_credential(OPENAI_KEY)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OpenAI API key not configured. Go to Settings to add it.",
        )
    try:
        return await analyze_with_openai(req, api_key)
    except Exception as exc:
        logger.exception("OpenAI analysis failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"OpenAI analysis error: {exc}",
        ) from exc


@app.post("/analyze/gemini")
async def analyze_gemini(
    req: AnalysisRequest,
    _auth: None = Depends(verify_token),
) -> AgentResultDTO | SynthesisResultDTO:
    api_key = read_credential(GOOGLE_KEY)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google API key not configured. Go to Settings to add it.",
        )
    try:
        return await analyze_with_gemini(req, api_key)
    except Exception as exc:
        logger.exception("Gemini analysis failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini analysis error: {exc}",
        ) from exc


@app.post("/synthesize", response_model=SynthesisResultDTO)
async def synthesize_endpoint(
    req: SynthesizeRequest,
    _auth: None = Depends(verify_token),
) -> SynthesisResultDTO:
    # Prefer OpenAI for synthesis; fall back to Claude if OpenAI key not available
    openai_key = read_credential(OPENAI_KEY)
    anthropic_key = read_credential(ANTHROPIC_KEY)

    if openai_key:
        api_key = openai_key
        synthesizer = "openai"
    elif anthropic_key:
        api_key = anthropic_key
        synthesizer = "claude"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Neither OpenAI nor Anthropic API key configured. Go to Settings to add one.",
        )
    try:
        return await synthesize_results(
            req.primary_result, req.gemini_result, api_key,
            user_correction=req.user_correction,
            synthesizer=synthesizer,
        )
    except Exception as exc:
        logger.exception("Synthesis failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Synthesis error: {exc}",
        ) from exc


# ── Feedback ────────────────────────────────────────────────────────────────


@app.post("/feedback")
async def submit_feedback(req: FeedbackRequest) -> dict[str, str]:
    """Accept anonymous feedback. No PII is collected."""
    logger.info(
        "Feedback: type=%s positive=%s reason=%s query=%s",
        req.analysis_type,
        req.is_positive,
        req.reason,
        req.query or "(none)",
    )
    # For now, just log it. Could be extended to write to a database.
    return {"status": "ok"}
