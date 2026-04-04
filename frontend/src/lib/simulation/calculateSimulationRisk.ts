/**
 * calculateSimulationRisk.ts
 *
 * Deterministic risk calculation from the current simulation ingredient set.
 * Runs entirely client-side — no agent call needed.
 *
 * Uses Monash-aligned FODMAP thresholds:
 *  - Fructan:  < 0.3 g low, 0.3–0.9 g moderate, ≥ 1.0 g high
 *  - GOS:     < 0.3 g low, 0.3–0.9 g moderate, ≥ 1.0 g high
 *  - Lactose: < 1.0 g low, 1.0–4.0 g moderate, > 4.0 g high
 *  - Fructose: < 0.15 g (excess) low, 0.15–0.5 moderate, > 0.5 high
 *  - Polyol:  < 0.3 g low, 0.3–0.5 moderate, > 0.5 g high
 */

import type {
  SimulationIngredient,
  SimulationRiskResult,
  RiskTier,
} from "../types";

/* ── FODMAP category thresholds (grams, cumulative) ────────────────── */

interface Threshold {
  low: number;   // below this → low risk contribution
  high: number;  // above this → high risk contribution
}

const THRESHOLDS: Record<string, Threshold> = {
  fructan:  { low: 0.3, high: 1.0 },
  gos:      { low: 0.3, high: 1.0 },
  lactose:  { low: 1.0, high: 4.0 },
  fructose: { low: 0.15, high: 0.5 },
  polyol:   { low: 0.3, high: 0.5 },
};

/* ── Helpers ────────────────────────────────────────────────────────── */

function categoryRisk(total: number, t: Threshold): number {
  if (total <= 0) return 0;
  if (total < t.low) return 0.05;
  if (total < t.high) return 0.25;
  return 0.55;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function riskTierFromProbability(p: number): RiskTier {
  if (p < 0.3) return "low";
  if (p < 0.6) return "moderate";
  return "high";
}

/* ── Main calculation ──────────────────────────────────────────────── */

export function calculateSimulationRisk(
  ingredients: SimulationIngredient[],
  baselineProbability: number,
): SimulationRiskResult {
  const included = ingredients.filter((i) => i.included);
  const excluded = ingredients.filter((i) => !i.included);

  const totalFructan = included.reduce((s, i) => s + (i.fructan_g || 0), 0);
  const totalGos = included.reduce((s, i) => s + (i.gos_g || 0), 0);
  const totalLactose = included.reduce((s, i) => s + (i.lactose_g || 0), 0);
  const totalFructose = included.reduce((s, i) => s + (i.fructose_g || 0), 0);
  const totalPolyol = included.reduce((s, i) => s + (i.polyol_g || 0), 0);

  const totalFodmapLoad =
    totalFructan + totalGos + totalLactose + totalFructose + totalPolyol;

  // Weighted risk across FODMAP categories (sum, clamped to [0, 1])
  const rawRisk =
    categoryRisk(totalFructan, THRESHOLDS.fructan) * 0.25 +
    categoryRisk(totalGos, THRESHOLDS.gos) * 0.20 +
    categoryRisk(totalLactose, THRESHOLDS.lactose) * 0.20 +
    categoryRisk(totalFructose, THRESHOLDS.fructose) * 0.15 +
    categoryRisk(totalPolyol, THRESHOLDS.polyol) * 0.20;

  const estimatedProbability = clamp(rawRisk, 0, 1);
  const delta = estimatedProbability - baselineProbability;

  return {
    totalFructan: Math.round(totalFructan * 100) / 100,
    totalGos: Math.round(totalGos * 100) / 100,
    totalLactose: Math.round(totalLactose * 100) / 100,
    totalFructose: Math.round(totalFructose * 100) / 100,
    totalPolyol: Math.round(totalPolyol * 100) / 100,
    totalFodmapLoad: Math.round(totalFodmapLoad * 100) / 100,
    estimatedProbability: Math.round(estimatedProbability * 1000) / 1000,
    riskTier: riskTierFromProbability(estimatedProbability),
    delta: Math.round(delta * 1000) / 1000,
    includedCount: included.length,
    excludedCount: excluded.length,
  };
}
