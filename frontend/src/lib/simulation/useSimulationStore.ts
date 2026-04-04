/**
 * useSimulationStore.ts
 *
 * Zustand store for ingredient simulation state.
 * Kept separate from the analysis store so simulation never pollutes baseline.
 */

import { create } from "zustand";
import type {
  SimulationIngredient,
  SimulationRiskResult,
  ResynthesisResult,
} from "../types";
import { calculateSimulationRisk } from "./calculateSimulationRisk";

interface SimulationState {
  /** The editable ingredient list */
  ingredients: SimulationIngredient[];

  /** Baseline probability from the original synthesis/primary result */
  baselineProbability: number;

  /** Live-calculated risk (updates whenever ingredients change) */
  risk: SimulationRiskResult | null;

  /** Whether simulation panel is open */
  isOpen: boolean;

  /** Re-synthesis loading / result / error */
  resynthLoading: boolean;
  resynthResult: ResynthesisResult | null;
  resynthError: string | null;

  /** Whether any edits have been made since init */
  isDirty: boolean;

  // ── Actions ──
  initialize: (ingredients: SimulationIngredient[], baselineProb: number) => void;
  toggleIngredient: (id: string) => void;
  removeIngredient: (id: string) => void;
  addIngredient: (ingredient: SimulationIngredient) => void;
  updateIngredient: (id: string, partial: Partial<SimulationIngredient>) => void;
  setOpen: (open: boolean) => void;
  setResynthLoading: (loading: boolean) => void;
  setResynthResult: (result: ResynthesisResult | null) => void;
  setResynthError: (error: string | null) => void;
  reset: () => void;
}

function recalc(ingredients: SimulationIngredient[], baseline: number): SimulationRiskResult {
  return calculateSimulationRisk(ingredients, baseline);
}

export const useSimulationStore = create<SimulationState>()((set) => ({
  ingredients: [],
  baselineProbability: 0,
  risk: null,
  isOpen: false,
  resynthLoading: false,
  resynthResult: null,
  resynthError: null,
  isDirty: false,

  initialize: (ingredients, baselineProb) =>
    set({
      ingredients,
      baselineProbability: baselineProb,
      risk: recalc(ingredients, baselineProb),
      isOpen: false,
      resynthLoading: false,
      resynthResult: null,
      resynthError: null,
      isDirty: false,
    }),

  toggleIngredient: (id) =>
    set((state) => {
      const next = state.ingredients.map((i) =>
        i.id === id ? { ...i, included: !i.included } : i,
      );
      return {
        ingredients: next,
        risk: recalc(next, state.baselineProbability),
        isDirty: true,
      };
    }),

  removeIngredient: (id) =>
    set((state) => {
      const next = state.ingredients.filter((i) => i.id !== id);
      return {
        ingredients: next,
        risk: recalc(next, state.baselineProbability),
        isDirty: true,
      };
    }),

  addIngredient: (ingredient) =>
    set((state) => {
      const next = [...state.ingredients, ingredient];
      return {
        ingredients: next,
        risk: recalc(next, state.baselineProbability),
        isDirty: true,
      };
    }),

  updateIngredient: (id, partial) =>
    set((state) => {
      const next = state.ingredients.map((i) =>
        i.id === id ? { ...i, ...partial } : i,
      );
      return {
        ingredients: next,
        risk: recalc(next, state.baselineProbability),
        isDirty: true,
      };
    }),

  setOpen: (open) => set({ isOpen: open }),

  setResynthLoading: (loading) => set({ resynthLoading: loading }),
  setResynthResult: (result) =>
    set({ resynthResult: result, resynthLoading: false }),
  setResynthError: (error) =>
    set({ resynthError: error, resynthLoading: false }),

  reset: () =>
    set({
      ingredients: [],
      baselineProbability: 0,
      risk: null,
      isOpen: false,
      resynthLoading: false,
      resynthResult: null,
      resynthError: null,
      isDirty: false,
    }),
}));
