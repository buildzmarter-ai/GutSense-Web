"use client";

import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp, FlaskConical, RotateCcw, Loader2 } from "lucide-react";
import { useSimulationStore } from "@/lib/simulation/useSimulationStore";
import { buildResynthesisPayload } from "@/lib/simulation/buildResynthesisPayload";
import { resynthesizeSimulation } from "@/lib/api";
import { useAnalysisStore, useSettingsStore } from "@/lib/store";
import SimulationSummaryCard from "./SimulationSummaryCard";
import IngredientListEditor from "./IngredientListEditor";

export default function IngredientSimulationPanel() {
  const isOpen = useSimulationStore((s) => s.isOpen);
  const setOpen = useSimulationStore((s) => s.setOpen);
  const risk = useSimulationStore((s) => s.risk);
  const isDirty = useSimulationStore((s) => s.isDirty);
  const ingredients = useSimulationStore((s) => s.ingredients);
  const resynthLoading = useSimulationStore((s) => s.resynthLoading);
  const resynthResult = useSimulationStore((s) => s.resynthResult);
  const resynthError = useSimulationStore((s) => s.resynthError);
  const setResynthLoading = useSimulationStore((s) => s.setResynthLoading);
  const setResynthResult = useSimulationStore((s) => s.setResynthResult);
  const setResynthError = useSimulationStore((s) => s.setResynthError);

  const query = useAnalysisStore((s) => s.query);
  const primaryResult = useAnalysisStore((s) => s.primaryResult);
  const geminiResult = useAnalysisStore((s) => s.geminiResult);
  const userProfile = useSettingsStore((s) => s.profile);

  const [showResynthResult, setShowResynthResult] = useState(false);

  const handleResynthesize = useCallback(async () => {
    if (!primaryResult || !geminiResult || !userProfile) return;
    setResynthLoading(true);
    setResynthError(null);
    setShowResynthResult(false);
    try {
      const payload = buildResynthesisPayload(
        query,
        ingredients,
        primaryResult,
        geminiResult,
        userProfile,
      );
      const result = await resynthesizeSimulation(payload);
      setResynthResult(result);
      setShowResynthResult(true);
    } catch (err) {
      setResynthError(err instanceof Error ? err.message : "Re-synthesis failed");
    }
  }, [
    query, ingredients, primaryResult, geminiResult, userProfile,
    setResynthLoading, setResynthResult, setResynthError,
  ]);

  if (!risk) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-[var(--color-gut-accent)]/20 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
      >
        <FlaskConical size={18} className="text-[var(--color-gut-accent)]" />
        <span className="font-semibold text-sm text-gray-900 dark:text-white">
          Ingredient Simulation
        </span>
        {isDirty && (
          <span className="ml-1 w-2 h-2 rounded-full bg-[var(--color-gut-amber)]" title="Unsaved changes" />
        )}
        <span className="ml-auto">
          {isOpen
            ? <ChevronUp size={16} className="text-gray-400" />
            : <ChevronDown size={16} className="text-gray-400" />}
        </span>
      </button>

      {/* Collapsible body */}
      {isOpen && (
        <div className="p-5 space-y-4">
          {/* Summary card */}
          <SimulationSummaryCard risk={risk} />

          {/* Ingredient editor */}
          <IngredientListEditor />

          {/* Re-synthesize button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleResynthesize}
              disabled={resynthLoading || !isDirty}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-gut-accent)] text-white text-sm font-medium hover:bg-[var(--color-gut-accent-hover)] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {resynthLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RotateCcw size={14} />
              )}
              {resynthLoading ? "Re-synthesizing…" : "Re-synthesize"}
            </button>
            {!isDirty && (
              <span className="text-xs text-gray-400">
                Toggle or add ingredients to enable
              </span>
            )}
          </div>

          {/* Re-synthesis error */}
          {resynthError && (
            <div className="p-3 rounded-lg bg-[var(--color-gut-red)]/10 text-[var(--color-gut-red)] text-xs">
              {resynthError}
            </div>
          )}

          {/* Re-synthesis result */}
          {resynthResult && showResynthResult && (
            <div className="p-4 rounded-xl bg-[var(--color-gut-accent)]/5 border border-[var(--color-gut-accent)]/20 space-y-3">
              <h4 className="text-sm font-semibold text-[var(--color-gut-accent)]">
                Re-synthesis Result
              </h4>

              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold" style={{ color: probabilityColor(resynthResult.final_ibs_probability) }}>
                  {Math.round(resynthResult.final_ibs_probability * 100)}%
                </span>
                <span className="text-xs text-gray-400">
                  ±{Math.round(resynthResult.confidence_band * 100)}% confidence
                </span>
              </div>

              {resynthResult.synthesis_rationale && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {resynthResult.synthesis_rationale}
                </p>
              )}

              {resynthResult.key_disagreements.length > 0 && (
                <div className="text-xs">
                  <span className="font-medium text-[var(--color-gut-amber)]">Disagreements: </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {resynthResult.key_disagreements.join("; ")}
                  </span>
                </div>
              )}

              {resynthResult.safety_flags.length > 0 && (
                <div className="space-y-1">
                  {resynthResult.safety_flags.map((f, i) => (
                    <div key={i} className="text-xs text-[var(--color-gut-amber)]">
                      ⚠ {f.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Inline helper — same logic as SimulationSummaryCard */
function probabilityColor(p: number) {
  if (p < 0.3) return "var(--color-gut-green)";
  if (p < 0.6) return "var(--color-gut-amber)";
  return "var(--color-gut-red)";
}
