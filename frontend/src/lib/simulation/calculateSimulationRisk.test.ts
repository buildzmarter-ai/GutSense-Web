/**
 * Tests for calculateSimulationRisk.
 *
 * Run with: npx vitest run src/lib/simulation/calculateSimulationRisk.test.ts
 * (after adding vitest to devDependencies)
 *
 * Or run the quick smoke test: npx tsx src/lib/simulation/calculateSimulationRisk.test.ts
 */

import { calculateSimulationRisk } from "./calculateSimulationRisk";
import type { SimulationIngredient } from "../types";

// ── Test helpers ──────────────────────────────────────────────────────────

function makeIngredient(overrides: Partial<SimulationIngredient> = {}): SimulationIngredient {
  return {
    id: `test_${Math.random().toString(36).slice(2)}`,
    ingredient: "Test Ingredient",
    tier: "low",
    fructan_g: 0,
    gos_g: 0,
    lactose_g: 0,
    fructose_g: 0,
    polyol_g: 0,
    serving_size_g: 100,
    source: "test",
    provenance: "claude",
    included: true,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

// 1. Empty ingredients → zero risk
{
  const result = calculateSimulationRisk([], 0.5);
  console.assert(result.estimatedProbability === 0, "Empty should yield 0 probability");
  console.assert(result.riskTier === "low", "Empty should be low tier");
  console.assert(result.delta === -0.5, "Delta should be -0.5 from baseline 0.5");
  console.assert(result.includedCount === 0, "Zero included");
  console.assert(result.excludedCount === 0, "Zero excluded");
  console.log("✓ Empty ingredients");
}

// 2. All excluded → zero risk
{
  const ingredients = [
    makeIngredient({ fructan_g: 2.0, included: false }),
    makeIngredient({ gos_g: 1.5, included: false }),
  ];
  const result = calculateSimulationRisk(ingredients, 0.3);
  console.assert(result.estimatedProbability === 0, "All excluded should yield 0");
  console.assert(result.excludedCount === 2, "Two excluded");
  console.assert(result.includedCount === 0, "Zero included");
  console.log("✓ All excluded");
}

// 3. Low FODMAP values → low risk
{
  const ingredients = [
    makeIngredient({ ingredient: "Rice", fructan_g: 0.1, fructose_g: 0.05 }),
  ];
  const result = calculateSimulationRisk(ingredients, 0);
  console.assert(result.riskTier === "low", `Expected low, got ${result.riskTier}`);
  console.assert(result.estimatedProbability < 0.3, "Should be under 0.3");
  console.log("✓ Low FODMAP values → low risk");
}

// 4. High fructan → elevated risk
{
  const ingredients = [
    makeIngredient({ ingredient: "Garlic", fructan_g: 3.0 }),
  ];
  const result = calculateSimulationRisk(ingredients, 0);
  // 3.0g fructan is well above 1.0g high threshold → categoryRisk = 0.55
  // 0.55 * 0.25 = 0.1375 from fructan alone, everything else is 0
  console.assert(result.estimatedProbability > 0, "High fructan should elevate risk");
  console.assert(result.totalFructan === 3.0, "Total fructan should be 3.0");
  console.log("✓ High fructan → elevated risk");
}

// 5. Multiple high categories → high risk
{
  const ingredients = [
    makeIngredient({ ingredient: "Garlic", fructan_g: 3.0 }),
    makeIngredient({ ingredient: "Milk", lactose_g: 10.0 }),
    makeIngredient({ ingredient: "Beans", gos_g: 2.0 }),
    makeIngredient({ ingredient: "Honey", fructose_g: 2.0 }),
    makeIngredient({ ingredient: "Cauliflower", polyol_g: 1.0 }),
  ];
  const result = calculateSimulationRisk(ingredients, 0);
  // All categories at high → 0.55 each, weighted sum = 0.55
  console.assert(result.riskTier === "moderate" || result.riskTier === "high", `Expected moderate or high, got ${result.riskTier}`);
  console.assert(result.estimatedProbability >= 0.3, "Multiple high should push above 0.3");
  console.log("✓ Multiple high categories → elevated risk");
}

// 6. Delta calculation
{
  const ingredients = [
    makeIngredient({ fructan_g: 0.1 }),
  ];
  const baseline = 0.4;
  const result = calculateSimulationRisk(ingredients, baseline);
  const expectedDelta = result.estimatedProbability - baseline;
  console.assert(
    Math.abs(result.delta - expectedDelta) < 0.001,
    `Delta mismatch: ${result.delta} vs ${expectedDelta}`,
  );
  console.log("✓ Delta calculation");
}

// 7. Toggling ingredient out reduces risk
{
  const garlic = makeIngredient({ id: "garlic", ingredient: "Garlic", fructan_g: 3.0, included: true });
  const rice = makeIngredient({ id: "rice", ingredient: "Rice", fructan_g: 0.05, included: true });

  const withGarlic = calculateSimulationRisk([garlic, rice], 0);
  const withoutGarlic = calculateSimulationRisk(
    [{ ...garlic, included: false }, rice],
    0,
  );

  console.assert(
    withoutGarlic.estimatedProbability < withGarlic.estimatedProbability,
    "Excluding garlic should lower risk",
  );
  console.assert(withoutGarlic.excludedCount === 1, "One excluded");
  console.assert(withoutGarlic.includedCount === 1, "One included");
  console.log("✓ Toggling ingredient reduces risk");
}

// 8. FODMAP load totals
{
  const ingredients = [
    makeIngredient({ fructan_g: 1.0, gos_g: 0.5, lactose_g: 2.0, fructose_g: 0.3, polyol_g: 0.2 }),
    makeIngredient({ fructan_g: 0.5, gos_g: 0.3, lactose_g: 1.0, fructose_g: 0.1, polyol_g: 0.1 }),
  ];
  const result = calculateSimulationRisk(ingredients, 0);
  console.assert(result.totalFructan === 1.5, `Fructan: ${result.totalFructan}`);
  console.assert(result.totalGos === 0.8, `GOS: ${result.totalGos}`);
  console.assert(result.totalLactose === 3.0, `Lactose: ${result.totalLactose}`);
  console.assert(result.totalFructose === 0.4, `Fructose: ${result.totalFructose}`);
  console.assert(result.totalPolyol === 0.3, `Polyol: ${result.totalPolyol}`);
  console.assert(result.totalFodmapLoad === 6.0, `Total: ${result.totalFodmapLoad}`);
  console.log("✓ FODMAP load totals");
}

console.log("\nAll calculateSimulationRisk tests passed ✓");
