/**
 * deriveIngredientProvenance.ts
 *
 * Merges ingredient lists from primary + Gemini agent results to build
 * the initial simulation ingredient set with provenance attribution.
 */

import type {
  AgentResult,
  IngredientFODMAP,
  IngredientProvenance,
  SimulationIngredient,
} from "../types";

let _counter = 0;
function uid(): string {
  return `sim_${Date.now()}_${++_counter}`;
}

function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function toSimIngredient(
  fodmap: IngredientFODMAP,
  provenance: IngredientProvenance,
): SimulationIngredient {
  return {
    id: uid(),
    ingredient: fodmap.ingredient,
    tier: fodmap.tier as "low" | "moderate" | "high",
    fructan_g: fodmap.fructan_g ?? 0,
    gos_g: fodmap.gos_g ?? 0,
    lactose_g: fodmap.lactose_g ?? 0,
    fructose_g: fodmap.fructose_g ?? 0,
    polyol_g: fodmap.polyol_g ?? 0,
    serving_size_g: fodmap.serving_size_g,
    source: fodmap.source,
    provenance,
    included: true,
  };
}

/**
 * Merge ingredients from primary and Gemini analyses.
 * If an ingredient appears in both (fuzzy name match), mark provenance "both"
 * and average the FODMAP values.
 */
export function deriveSimulationIngredients(
  primaryResult: AgentResult | null,
  geminiResult: AgentResult | null,
): SimulationIngredient[] {
  const primaryTiers = primaryResult?.fodmap_tiers ?? [];
  const geminiTiers = geminiResult?.fodmap_tiers ?? [];

  const primaryProvenance: IngredientProvenance =
    primaryResult?.agent_type === "openai" ? "openai" : "claude";

  // Index primary ingredients by normalized name
  const primaryMap = new Map<string, IngredientFODMAP>();
  for (const t of primaryTiers) {
    primaryMap.set(normalize(t.ingredient), t);
  }

  const result: SimulationIngredient[] = [];
  const matched = new Set<string>();

  // Process Gemini ingredients, check for overlaps with primary
  for (const gt of geminiTiers) {
    const key = normalize(gt.ingredient);
    const pt = primaryMap.get(key);

    if (pt) {
      // Both agents detected this ingredient — average values
      matched.add(key);
      result.push({
        id: uid(),
        ingredient: pt.ingredient, // prefer primary's casing
        tier: higherTier(pt.tier, gt.tier),
        fructan_g: avg(pt.fructan_g, gt.fructan_g),
        gos_g: avg(pt.gos_g, gt.gos_g),
        lactose_g: avg(pt.lactose_g, gt.lactose_g),
        fructose_g: avg(pt.fructose_g, gt.fructose_g),
        polyol_g: avg(pt.polyol_g, gt.polyol_g),
        serving_size_g: pt.serving_size_g,
        source: `${pt.source}; ${gt.source}`,
        provenance: "both",
        included: true,
      });
    } else {
      result.push(toSimIngredient(gt, "gemini"));
    }
  }

  // Add primary-only ingredients
  for (const pt of primaryTiers) {
    const key = normalize(pt.ingredient);
    if (!matched.has(key)) {
      result.push(toSimIngredient(pt, primaryProvenance));
    }
  }

  return result;
}

function avg(a: number | null, b: number | null): number {
  const va = a ?? 0;
  const vb = b ?? 0;
  return Math.round(((va + vb) / 2) * 100) / 100;
}

function higherTier(a: string, b: string): "low" | "moderate" | "high" {
  const rank: Record<string, number> = { low: 0, moderate: 1, high: 2 };
  return (rank[a] ?? 0) >= (rank[b] ?? 0)
    ? (a as "low" | "moderate" | "high")
    : (b as "low" | "moderate" | "high");
}

/**
 * Create a blank user-added ingredient.
 */
export function createUserIngredient(name: string): SimulationIngredient {
  return {
    id: uid(),
    ingredient: name,
    tier: "low",
    fructan_g: 0,
    gos_g: 0,
    lactose_g: 0,
    fructose_g: 0,
    polyol_g: 0,
    serving_size_g: 0,
    source: "User-added",
    provenance: "user",
    included: true,
  };
}
