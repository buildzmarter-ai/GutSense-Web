export interface UserProfile {
  ibs_subtype: string;
  fodmap_phase: string;
  known_triggers: string[];
  known_safe_foods: string[];
  medications: string[];
  diagnosed_conditions: string[];
  sensitivities: string[];
}

export type PrimaryProvider = "anthropic" | "openai";

export interface IngredientFODMAP {
  ingredient: string;
  tier: "low" | "moderate" | "high";
  fructan_g: number | null;
  gos_g: number | null;
  lactose_g: number | null;
  fructose_g: number | null;
  polyol_g: number | null;
  serving_size_g: number;
  source: string;
}

export interface BioavailabilityChange {
  nutrient: string;
  raw_percent: number;
  cooked_percent: number;
  note: string;
}

export interface EnzymeRecommendation {
  name: string;
  brand: string;
  targets: string;
  dose: string;
  temperature_warning: boolean;
  notes: string;
}

export interface Citation {
  title: string;
  source: string;
  confidence_tier: string;
  url: string | null;
}

export interface SafetyFlag {
  message: string;
  severity: "info" | "warning" | "critical";
}

export interface AgentResult {
  agent_type: string;
  fodmap_tiers: IngredientFODMAP[];
  ibs_trigger_probability: number;
  confidence_tier: string;
  confidence_interval: number;
  bioavailability: BioavailabilityChange[];
  enzyme_recommendations: EnzymeRecommendation[];
  citations: Citation[];
  personalized_risk_delta: number;
  total_fructan_g: number;
  total_gos_g: number;
  safety_flags: SafetyFlag[];
  processing_latency_ms: number;
}

export interface SynthesisResult {
  reconciled_tiers: IngredientFODMAP[];
  final_ibs_probability: number;
  confidence_band: number;
  enzyme_recommendation: EnzymeRecommendation | null;
  key_disagreements: string[];
  synthesis_rationale: string;
  safety_flags: SafetyFlag[];
}

export interface AnalysisRequest {
  query: string;
  user_profile: UserProfile;
  user_sources?: UserSourceDTO[];
  serving_amount_g?: number;
  serving_fraction?: number;
  serving_description?: string;
  image_base64?: string;
  image_media_type?: string;
}

export interface UserSourceDTO {
  title: string;
  raw_text: string;
  is_anecdotal: boolean;
  source_url?: string;
}

export interface SynthesisRequest {
  primary_result: AgentResult;
  gemini_result: AgentResult;
  user_correction?: string;
}

export interface UserSource {
  id: string;
  title: string;
  url?: string;
  content: string;
  source_type: "research" | "anecdotal";
  date_added: string;
}

export interface HistoryEntry {
  id: string;
  query: string;
  timestamp: string;
  serving_description?: string;
  image_thumbnail?: string;
  input_mode: "text" | "photo";
  primary_result?: AgentResult;
  gemini_result?: AgentResult;
  synthesis_result?: SynthesisResult;
  final_probability: number;
  isComplete: boolean;
}

export interface FeedbackRequest {
  analysis_type: "primary" | "gemini" | "synthesis";
  is_positive: boolean;
  reason: string;
  query?: string;
}

/* ── Ingredient Simulation Types ─────────────────────────────────────── */

/** Which agent(s) originally detected this ingredient */
export type IngredientProvenance = "claude" | "gemini" | "openai" | "both" | "user";

/** A single ingredient in the simulation model */
export interface SimulationIngredient {
  id: string;
  ingredient: string;
  tier: "low" | "moderate" | "high";
  fructan_g: number;
  gos_g: number;
  lactose_g: number;
  fructose_g: number;
  polyol_g: number;
  serving_size_g: number;
  source: string;
  provenance: IngredientProvenance;
  included: boolean;
}

/** Risk tier classification matching iOS semantics */
export type RiskTier = "low" | "moderate" | "high";

/** Deterministic risk calculation result */
export interface SimulationRiskResult {
  totalFructan: number;
  totalGos: number;
  totalLactose: number;
  totalFructose: number;
  totalPolyol: number;
  totalFodmapLoad: number;
  estimatedProbability: number;
  riskTier: RiskTier;
  delta: number; // difference from baseline
  includedCount: number;
  excludedCount: number;
}

/** Payload sent to backend for re-synthesis with edited ingredients */
export interface ResynthesisRequest {
  original_query: string;
  edited_ingredients: SimulationIngredient[];
  primary_result: AgentResult;
  gemini_result: AgentResult;
  user_profile: UserProfile;
}

/** Backend response for simulation re-synthesis */
export interface ResynthesisResult {
  reconciled_tiers: IngredientFODMAP[];
  final_ibs_probability: number;
  confidence_band: number;
  synthesis_rationale: string;
  key_disagreements: string[];
  safety_flags: SafetyFlag[];
  enzyme_recommendation: EnzymeRecommendation | null;
}
