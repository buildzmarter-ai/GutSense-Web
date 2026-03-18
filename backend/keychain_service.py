"""macOS Keychain credential storage for GutSense API keys and source logins."""

from __future__ import annotations

import json
import keyring

SERVICE_NAME = "com.gutsense.web"
SOURCES_SERVICE = "com.gutsense.sources"

# Key names stored in Keychain
ANTHROPIC_KEY = "anthropic_api_key"
GOOGLE_KEY = "google_api_key"
API_SECRET = "api_secret"

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
    """Store a credential in macOS Keychain."""
    keyring.set_password(SERVICE_NAME, key, value)


def read_credential(key: str) -> str | None:
    """Read a credential from macOS Keychain. Returns None if not found."""
    return keyring.get_password(SERVICE_NAME, key)


def delete_credential(key: str) -> None:
    """Delete a credential from macOS Keychain."""
    try:
        keyring.delete_password(SERVICE_NAME, key)
    except keyring.errors.PasswordDeleteError:
        pass  # Key didn't exist


def has_credential(key: str) -> bool:
    """Check if a credential exists in Keychain."""
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
    """Store a source site login in macOS Keychain as JSON."""
    payload = json.dumps({"username": username, "password": password})
    keyring.set_password(SOURCES_SERVICE, source_id, payload)


def read_source_credential(source_id: str) -> dict | None:
    """Read a source site login from Keychain. Returns {username, password} or None."""
    raw = keyring.get_password(SOURCES_SERVICE, source_id)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def delete_source_credential(source_id: str) -> None:
    """Delete a source site login from Keychain."""
    try:
        keyring.delete_password(SOURCES_SERVICE, source_id)
    except keyring.errors.PasswordDeleteError:
        pass


def has_source_credential(source_id: str) -> bool:
    """Check if a source site login exists in Keychain."""
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
