/**
 * buildResynthesisPayload.ts
 *
 * Constructs the payload for the backend /simulate/resynthesize endpoint.
 */

import type {
  AgentResult,
  ResynthesisRequest,
  SimulationIngredient,
  UserProfile,
} from "../types";

export function buildResynthesisPayload(
  originalQuery: string,
  ingredients: SimulationIngredient[],
  primaryResult: AgentResult,
  geminiResult: AgentResult,
  userProfile: UserProfile,
): ResynthesisRequest {
  return {
    original_query: originalQuery,
    edited_ingredients: ingredients.filter((i) => i.included),
    primary_result: primaryResult,
    gemini_result: geminiResult,
    user_profile: userProfile,
  };
}
