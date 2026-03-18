"""Credential storage for GutSense API keys and source logins.

Uses macOS Keychain locally, falls back to environment variables in production.
"""

from __future__ import annotations

import json
import os

SERVICE_NAME = "com.gutsense.web"
SOURCES_SERVICE = "com.gutsense.sources"

# Key names stored in Keychain
ANTHROPIC_KEY = "anthropic_api_key"
GOOGLE_KEY = "google_api_key"
API_SECRET = "api_secret"

# Env-var mapping for cloud deployment (Railway, Docker, etc.)
_ENV_MAP: dict[str, str] = {
    ANTHROPIC_KEY: "ANTHROPIC_API_KEY",
    GOOGLE_KEY: "GOOGLE_API_KEY",
    API_SECRET: "API_SECRET",
}

# Detect whether keyring is available (not present in Docker/Railway)
_keyring_available = False
try:
    import keyring  # type: ignore

    # Quick probe – if the backend is a null/fail backend, skip it
    _backend = keyring.get_keyring()
    if "fail" not in type(_backend).__name__.lower() and "null" not in type(_backend).__name__.lower():
        _keyring_available = True
except Exception:
    pass

# Known research source sites
SOURCE_SITES: dict[str, dict] = {
    "monash": {
        "name": "Monash University FODMAP",
        "url": "https://www.monashfodmap.com",
        "description": "Gold-standard FODMAP database from Monash University",
    },
    "fodmap_friendly": {
        "name": "FODMAP Friendly",
        "url": "https://fodmapfriendly.com",
        "description": "FODMAP certification and food database",
    },
    "pubmed": {
        "name": "PubMed / NCBI",
        "url": "https://pubmed.ncbi.nlm.nih.gov",
        "description": "NIH biomedical literature database",
    },
}


def store_credential(key: str, value: str) -> None:
    """Store a credential. Uses Keychain locally, no-op in cloud (use env vars)."""
    if _keyring_available:
        keyring.set_password(SERVICE_NAME, key, value)
    else:
        # In cloud mode, credentials are set via environment variables
        os.environ[_ENV_MAP.get(key, key.upper())] = value


def read_credential(key: str) -> str | None:
    """Read a credential. Checks Keychain first, then falls back to env vars."""
    # Try env var first (always available, takes priority in cloud)
    env_key = _ENV_MAP.get(key, key.upper())
    env_val = os.environ.get(env_key)
    if env_val:
        return env_val
    # Fall back to Keychain
    if _keyring_available:
        return keyring.get_password(SERVICE_NAME, key)
    return None


def delete_credential(key: str) -> None:
    """Delete a credential from Keychain."""
    if _keyring_available:
        try:
            keyring.delete_password(SERVICE_NAME, key)
        except keyring.errors.PasswordDeleteError:
            pass


def has_credential(key: str) -> bool:
    """Check if a credential exists."""
    return read_credential(key) is not None


def get_credentials_status() -> dict[str, bool]:
    """Return which credentials are configured."""
    return {
        "anthropic_api_key": has_credential(ANTHROPIC_KEY),
        "google_api_key": has_credential(GOOGLE_KEY),
        "api_secret": has_credential(API_SECRET),
    }


# ── Source Site Credentials ────────────────────────────────────────────────


def store_source_credential(source_id: str, username: str, password: str) -> None:
    """Store a source site login as JSON."""
    payload = json.dumps({"username": username, "password": password})
    if _keyring_available:
        keyring.set_password(SOURCES_SERVICE, source_id, payload)


def read_source_credential(source_id: str) -> dict | None:
    """Read a source site login. Returns {username, password} or None."""
    raw = None
    if _keyring_available:
        raw = keyring.get_password(SOURCES_SERVICE, source_id)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def delete_source_credential(source_id: str) -> None:
    """Delete a source site login."""
    if _keyring_available:
        try:
            keyring.delete_password(SOURCES_SERVICE, source_id)
        except keyring.errors.PasswordDeleteError:
            pass


def has_source_credential(source_id: str) -> bool:
    """Check if a source site login exists."""
    return read_source_credential(source_id) is not None


def get_source_credentials_status() -> dict[str, dict]:
    """Return status of all known source site credentials."""
    result = {}
    for source_id, info in SOURCE_SITES.items():
        result[source_id] = {
            "name": info["name"],
            "url": info["url"],
            "description": info["description"],
            "configured": has_source_credential(source_id),
        }
    return result
