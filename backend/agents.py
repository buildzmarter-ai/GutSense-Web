"""Claude + Gemini FODMAP analysis agents and synthesis logic."""

from __future__ import annotations

import base64
import json
import logging
import time
from typing import Any

import anthropic
import google.generativeai as genai

from models import (
    AgentResultDTO,
    AnalysisRequest,
    SynthesisResultDTO,
)

logger = logging.getLogger(__name__)

# ── Shared system prompt ────────────────────────────────────────────────────

_ANALYSIS_SYSTEM_PROMPT = """\
You are GutSense, an expert FODMAP nutritional-analysis AI for IBS patients.

Given a food or meal description (and optionally an image), perform ALL of the following:

1. **Ingredient Breakdown** -- List every distinct ingredient. For composite dishes, decompose to individual ingredients.
2. **FODMAP Tier Assignment** -- For each ingredient, assign a tier: "low", "moderate", or "high". Provide gram amounts per FODMAP sub-category (fructan_g, gos_g, lactose_g, fructose_g, polyol_g) at the stated serving size. Include the data source.
3. **IBS Trigger Probability** -- Calculate an overall probability (0.0-1.0) that this food/meal will trigger IBS symptoms for THIS specific user, considering their subtype, phase, and known triggers.
4. **Confidence** -- Provide a confidence_tier ("high", "moderate", or "low") and a numeric confidence_interval (0.0-1.0) reflecting data quality.
5. **Bioavailability** -- Note meaningful changes in nutrient bioavailability between raw and cooked preparations.
6. **Enzyme Recommendations** -- If any high-FODMAP ingredient could be mitigated by enzymes (e.g., Fodzyme for fructan/GOS, lactase for lactose), recommend them with brand, dose, and any temperature warnings.
7. **Citations** -- Cite at least one source per ingredient tier claim. Mark each as "peer-reviewed", "clinical", or "anecdotal".
8. **Safety Flags** -- Flag any concerns (severity: "info", "warning", "critical"). Examples: medication interactions, allergy cross-reactivity, extreme FODMAP load.
9. **Personalized Risk Delta** -- A float (-1.0 to 1.0) indicating how much THIS user's profile shifts the risk relative to a generic IBS patient.
10. **Totals** -- Sum total_fructan_g and total_gos_g across all ingredients.

RESPOND WITH ONLY valid JSON matching this exact schema (no markdown, no extra keys):
{
  "agent_type": "<claude or gemini>",
  "fodmap_tiers": [
    {
      "ingredient": "string",
      "tier": "low|moderate|high",
      "fructan_g": null or float,
      "gos_g": null or float,
      "lactose_g": null or float,
      "fructose_g": null or float,
      "polyol_g": null or float,
      "serving_size_g": float,
      "source": "string"
    }
  ],
  "ibs_trigger_probability": float,
  "confidence_tier": "high|moderate|low",
  "confidence_interval": float,
  "bioavailability": [
    {"nutrient": "string", "raw_percent": float, "cooked_percent": float, "note": "string"}
  ],
  "enzyme_recommendations": [
    {"name": "string", "brand": "string", "targets": "string", "dose": "string", "temperature_warning": bool, "notes": "string"}
  ],
  "citations": [
    {"title": "string", "source": "string", "confidence_tier": "peer-reviewed|clinical|anecdotal", "url": null or "string"}
  ],
  "personalized_risk_delta": float,
  "total_fructan_g": float,
  "total_gos_g": float,
  "safety_flags": [
    {"message": "string", "severity": "info|warning|critical"}
  ],
  "processing_latency_ms": 0
}
"""

_SYNTHESIS_SYSTEM_PROMPT = """\
You are GutSense Synthesis, an expert at reconciling two independent FODMAP analyses.

You will receive the JSON results from two AI agents (Claude and Gemini) that each analyzed the same food/meal.
Your job:
1. Reconcile disagreements on ingredient FODMAP tiers -- choose the most evidence-backed tier for each ingredient.
2. Calculate a final IBS trigger probability (weighted average, favoring the higher-confidence agent).
3. Determine a confidence band (0.0-1.0) reflecting agreement level.
4. Pick the best enzyme recommendation (if any) from either agent.
5. List key disagreements between the agents.
6. Write a brief synthesis rationale explaining your choices.
7. Merge safety flags from both agents (deduplicate).

RESPOND WITH ONLY valid JSON matching this exact schema:
{
  "reconciled_tiers": [
    {
      "ingredient": "string",
      "tier": "low|moderate|high",
      "fructan_g": null or float,
      "gos_g": null or float,
      "lactose_g": null or float,
      "fructose_g": null or float,
      "polyol_g": null or float,
      "serving_size_g": float,
      "source": "string"
    }
  ],
  "final_ibs_probability": float,
  "confidence_band": float,
  "enzyme_recommendation": null or {"name":"string","brand":"string","targets":"string","dose":"string","temperature_warning":bool,"notes":"string"},
  "key_disagreements": ["string"],
  "synthesis_rationale": "string",
  "safety_flags": [{"message":"string","severity":"info|warning|critical"}]
}
"""


def _build_user_context(req: AnalysisRequest) -> str:
    """Build user-context block to inject into the analysis prompt."""
    parts: list[str] = []

    p = req.user_profile
    parts.append(f"IBS Subtype: {p.ibs_subtype}")
    parts.append(f"FODMAP Phase: {p.fodmap_phase}")
    if p.known_triggers:
        parts.append(f"Known Triggers: {', '.join(p.known_triggers)}")
    if p.known_safe_foods:
        parts.append(f"Known Safe Foods: {', '.join(p.known_safe_foods)}")
    if p.medications:
        parts.append(f"Medications: {', '.join(p.medications)}")
    if p.diagnosed_conditions:
        parts.append(
            f"Diagnosed Conditions: {', '.join(p.diagnosed_conditions)}"
        )

    # Serving info
    serving_parts: list[str] = []
    if req.serving_description:
        serving_parts.append(req.serving_description)
    if req.serving_fraction is not None:
        serving_parts.append(f"fraction={req.serving_fraction}")
    if req.serving_amount_g is not None:
        serving_parts.append(f"{req.serving_amount_g}g")
    if serving_parts:
        parts.append(f"Serving: {', '.join(serving_parts)}")

    # User sources
    for src in req.user_sources:
        label = "(anecdotal)" if src.is_anecdotal else "(clinical/research)"
        parts.append(f"User Source {label}: {src.title}\n{src.raw_text}")

    return "\n".join(parts)


def _safe_parse_json(raw: str) -> dict[str, Any]:
    """Extract JSON from a response that may contain markdown fences."""
    text = raw.strip()
    if text.startswith("```"):
        # Strip ```json ... ```
        first_newline = text.index("\n")
        text = text[first_newline + 1 :]
        if text.endswith("```"):
            text = text[: -3]
        text = text.strip()
    return json.loads(text)


# ── Claude Agent ────────────────────────────────────────────────────────────


async def analyze_with_claude(
    req: AnalysisRequest,
    api_key: str,
) -> AgentResultDTO:
    """Run FODMAP analysis using Anthropic Claude."""
    client = anthropic.AsyncAnthropic(api_key=api_key)

    user_context = _build_user_context(req)
    user_message_text = (
        f"Analyze this food/meal for FODMAP content:\n\n"
        f"\"{req.query}\"\n\n"
        f"--- USER PROFILE ---\n{user_context}"
    )

    # Build message content
    content: list[dict[str, Any]] = []
    if req.image_base64 and req.image_media_type:
        content.append(
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": req.image_media_type,
                    "data": req.image_base64,
                },
            }
        )
    content.append({"type": "text", "text": user_message_text})

    start = time.perf_counter_ns()
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=_ANALYSIS_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": content}],
    )
    latency_ms = int((time.perf_counter_ns() - start) / 1_000_000)

    raw_text = response.content[0].text  # type: ignore[union-attr]
    data = _safe_parse_json(raw_text)
    data["agent_type"] = "claude"
    data["processing_latency_ms"] = latency_ms

    return AgentResultDTO.model_validate(data)


# ── Gemini Agent ────────────────────────────────────────────────────────────


async def analyze_with_gemini(
    req: AnalysisRequest,
    api_key: str,
) -> AgentResultDTO | SynthesisResultDTO:
    """
    Run FODMAP analysis using Google Gemini.

    If `req.apple_result_json` is provided, this operates in synthesis mode
    (reconciling an Apple Intelligence result with Gemini's own analysis).
    """
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-pro")

    user_context = _build_user_context(req)

    # ── Synthesis mode (Apple Intelligence reconciliation) ──────────────
    if req.apple_result_json:
        synthesis_prompt = (
            f"You have two FODMAP analysis results to reconcile.\n\n"
            f"Apple Intelligence result:\n{req.apple_result_json}\n\n"
            f"Food/meal query: \"{req.query}\"\n\n"
            f"--- USER PROFILE ---\n{user_context}\n\n"
            f"Reconcile these results following the synthesis schema."
        )
        start = time.perf_counter_ns()
        response = await model.generate_content_async(
            [_SYNTHESIS_SYSTEM_PROMPT + "\n\n" + synthesis_prompt]
        )
        latency_ms = int((time.perf_counter_ns() - start) / 1_000_000)
        data = _safe_parse_json(response.text)
        return SynthesisResultDTO.model_validate(data)

    # ── Primary analysis mode ──────────────────────────────────────────
    user_message_text = (
        f"Analyze this food/meal for FODMAP content:\n\n"
        f"\"{req.query}\"\n\n"
        f"--- USER PROFILE ---\n{user_context}"
    )

    parts: list[Any] = []
    if req.image_base64 and req.image_media_type:
        image_bytes = base64.b64decode(req.image_base64)
        parts.append(
            {"mime_type": req.image_media_type, "data": image_bytes}
        )
    parts.append(
        _ANALYSIS_SYSTEM_PROMPT + "\n\n" + user_message_text
    )

    start = time.perf_counter_ns()
    response = await model.generate_content_async(parts)
    latency_ms = int((time.perf_counter_ns() - start) / 1_000_000)

    data = _safe_parse_json(response.text)
    data["agent_type"] = "gemini"
    data["processing_latency_ms"] = latency_ms

    return AgentResultDTO.model_validate(data)


# ── Synthesis (Web) ─────────────────────────────────────────────────────────


async def synthesize_results(
    claude_result: AgentResultDTO,
    gemini_result: AgentResultDTO,
    api_key: str,
    user_correction: str | None = None,
) -> SynthesisResultDTO:
    """Reconcile Claude + Gemini results using Claude as the synthesizer."""
    client = anthropic.AsyncAnthropic(api_key=api_key)

    prompt = (
        f"Claude agent result:\n"
        f"{claude_result.model_dump_json(indent=2)}\n\n"
        f"Gemini agent result:\n"
        f"{gemini_result.model_dump_json(indent=2)}\n\n"
    )

    if user_correction:
        prompt += (
            f"IMPORTANT USER CORRECTION:\n"
            f"The user has reviewed the agent analyses and provided the following correction/modification. "
            f"You MUST apply this correction to the reconciled result. The user's input overrides agent assumptions "
            f"about ingredients, preparation, or composition:\n\n"
            f'"{user_correction}"\n\n'
            f"Apply this correction, then reconcile the remaining analyses."
        )
    else:
        prompt += "Reconcile these two analyses."

    start = time.perf_counter_ns()
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=_SYNTHESIS_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    latency_ms = int((time.perf_counter_ns() - start) / 1_000_000)

    raw_text = response.content[0].text  # type: ignore[union-attr]
    data = _safe_parse_json(raw_text)
    return SynthesisResultDTO.model_validate(data)
