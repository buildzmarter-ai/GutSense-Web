"""Tests for simulation-related Pydantic models and endpoint wiring."""

import sys
import os

# Add backend root to path so we can import models
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from pydantic import ValidationError

from models import (
    AgentResultDTO,
    IngredientFODMAPDTO,
    ResynthesisRequest,
    ResynthesisResultDTO,
    SimulationIngredientDTO,
    UserProfileDTO,
)


# ── SimulationIngredientDTO ───────────────────────────────────────────────


def test_simulation_ingredient_defaults():
    ing = SimulationIngredientDTO(
        id="sim_1",
        ingredient="Garlic",
        tier="high",
        provenance="claude",
    )
    assert ing.fructan_g == 0.0
    assert ing.gos_g == 0.0
    assert ing.included is True
    assert ing.provenance == "claude"


def test_simulation_ingredient_full():
    ing = SimulationIngredientDTO(
        id="sim_2",
        ingredient="Onion",
        tier="high",
        fructan_g=2.5,
        gos_g=0.3,
        lactose_g=0,
        fructose_g=0.1,
        polyol_g=0,
        serving_size_g=50,
        source="Monash",
        provenance="both",
        included=False,
    )
    assert ing.fructan_g == 2.5
    assert ing.included is False
    assert ing.provenance == "both"


def test_simulation_ingredient_requires_id():
    with pytest.raises(ValidationError):
        SimulationIngredientDTO(
            ingredient="Missing ID",
            tier="low",
            provenance="user",
        )


# ── ResynthesisRequest ────────────────────────────────────────────────────


def _make_agent_result(**kwargs) -> AgentResultDTO:
    defaults = {
        "agent_type": "claude",
        "fodmap_tiers": [],
        "ibs_trigger_probability": 0.3,
        "confidence_tier": "moderate",
        "confidence_interval": 0.1,
    }
    defaults.update(kwargs)
    return AgentResultDTO(**defaults)


def _make_profile() -> UserProfileDTO:
    return UserProfileDTO(
        ibs_subtype="IBS-D",
        fodmap_phase="Elimination",
    )


def test_resynthesis_request_minimal():
    req = ResynthesisRequest(
        original_query="garlic bread",
        primary_result=_make_agent_result(),
        gemini_result=_make_agent_result(agent_type="gemini"),
        user_profile=_make_profile(),
    )
    assert req.original_query == "garlic bread"
    assert len(req.edited_ingredients) == 0


def test_resynthesis_request_with_ingredients():
    ing = SimulationIngredientDTO(
        id="sim_1",
        ingredient="Garlic",
        tier="high",
        fructan_g=2.5,
        provenance="both",
    )
    req = ResynthesisRequest(
        original_query="garlic bread",
        edited_ingredients=[ing],
        primary_result=_make_agent_result(),
        gemini_result=_make_agent_result(agent_type="gemini"),
        user_profile=_make_profile(),
    )
    assert len(req.edited_ingredients) == 1
    assert req.edited_ingredients[0].ingredient == "Garlic"


# ── ResynthesisResultDTO ──────────────────────────────────────────────────


def test_resynthesis_result_defaults():
    result = ResynthesisResultDTO()
    assert result.final_ibs_probability == 0.0
    assert result.confidence_band == 0.0
    assert result.reconciled_tiers == []
    assert result.key_disagreements == []
    assert result.safety_flags == []
    assert result.enzyme_recommendation is None


def test_resynthesis_result_full():
    result = ResynthesisResultDTO(
        reconciled_tiers=[
            IngredientFODMAPDTO(
                ingredient="Garlic",
                tier="high",
                fructan_g=2.5,
                serving_size_g=10,
                source="Monash",
            )
        ],
        final_ibs_probability=0.72,
        confidence_band=0.08,
        synthesis_rationale="High fructan load from garlic drives the elevated risk.",
        key_disagreements=["Agents disagreed on garlic serving size"],
    )
    assert result.final_ibs_probability == 0.72
    assert len(result.reconciled_tiers) == 1
    assert len(result.key_disagreements) == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
