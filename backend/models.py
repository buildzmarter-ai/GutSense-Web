"""Pydantic models matching iOS GutSense DTOs."""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Request Models ──────────────────────────────────────────────────────────


class UserProfileDTO(BaseModel):
    ibs_subtype: str = Field(
        ..., description='IBS-D, IBS-C, IBS-M, or IBS-U'
    )
    fodmap_phase: str = Field(
        ..., description='Elimination, Reintroduction, or Maintenance'
    )
    known_triggers: list[str] = Field(default_factory=list)
    known_safe_foods: list[str] = Field(default_factory=list)
    medications: list[str] = Field(default_factory=list)
    diagnosed_conditions: list[str] = Field(default_factory=list)


class UserSourceDTO(BaseModel):
    title: str
    raw_text: str
    is_anecdotal: bool = False
    source_url: str | None = None


class AnalysisRequest(BaseModel):
    query: str
    user_profile: UserProfileDTO
    user_sources: list[UserSourceDTO] = Field(default_factory=list)
    apple_result_json: str | None = None
    serving_description: str | None = None
    serving_fraction: float | None = None
    serving_amount_g: float | None = None
    image_base64: str | None = None
    image_media_type: str | None = None


class SynthesizeRequest(BaseModel):
    primary_result: AgentResultDTO  # forward-ref resolved at end of file
    gemini_result: AgentResultDTO
    user_correction: str | None = Field(
        None,
        description="User correction/modification to apply, e.g. 'remove wheat flour, add rice flour instead'",
    )


class FeedbackRequest(BaseModel):
    analysis_type: str = Field(..., description="primary, gemini, or synthesis")
    is_positive: bool
    reason: str = ""
    query: str | None = None


# ── Response Models ─────────────────────────────────────────────────────────


class IngredientFODMAPDTO(BaseModel):
    ingredient: str
    tier: str = Field(..., description='low, moderate, or high')
    fructan_g: float | None = None
    gos_g: float | None = None
    lactose_g: float | None = None
    fructose_g: float | None = None
    polyol_g: float | None = None
    serving_size_g: float
    source: str


class EnzymeRecommendationDTO(BaseModel):
    name: str
    brand: str
    targets: str
    dose: str
    temperature_warning: bool = False
    notes: str = ""


class CitationDTO(BaseModel):
    title: str
    source: str
    confidence_tier: str = Field(
        ..., description='peer-reviewed, clinical, or anecdotal'
    )
    url: str | None = None


class BioavailabilityChangeDTO(BaseModel):
    nutrient: str
    raw_percent: float
    cooked_percent: float
    note: str = ""


class SafetyFlagDTO(BaseModel):
    message: str
    severity: str = Field(..., description='info, warning, or critical')


class AgentResultDTO(BaseModel):
    agent_type: str = Field(..., description='claude or gemini')
    fodmap_tiers: list[IngredientFODMAPDTO] = Field(default_factory=list)
    ibs_trigger_probability: float = 0.0
    confidence_tier: str = "low"
    confidence_interval: float = 0.0
    bioavailability: list[BioavailabilityChangeDTO] = Field(
        default_factory=list
    )
    enzyme_recommendations: list[EnzymeRecommendationDTO] = Field(
        default_factory=list
    )
    citations: list[CitationDTO] = Field(default_factory=list)
    personalized_risk_delta: float = 0.0
    total_fructan_g: float = 0.0
    total_gos_g: float = 0.0
    safety_flags: list[SafetyFlagDTO] = Field(default_factory=list)
    processing_latency_ms: int = 0


class SynthesisResultDTO(BaseModel):
    reconciled_tiers: list[IngredientFODMAPDTO] = Field(default_factory=list)
    final_ibs_probability: float = 0.0
    confidence_band: float = 0.0
    enzyme_recommendation: EnzymeRecommendationDTO | None = None
    key_disagreements: list[str] = Field(default_factory=list)
    synthesis_rationale: str = ""
    safety_flags: list[SafetyFlagDTO] = Field(default_factory=list)


# Resolve forward references
SynthesizeRequest.model_rebuild()
