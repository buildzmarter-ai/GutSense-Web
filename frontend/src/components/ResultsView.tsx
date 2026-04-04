"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  AlertTriangle,
  Info,
  XCircle,
  Loader2,
  Sparkles,
  Brain,
  Gem,
  Zap,
  ThermometerSun,
  Send,
  PenLine,
  MessageSquare,
} from "lucide-react";
import { useAnalysisStore, useSettingsStore } from "@/lib/store";
import { synthesize } from "@/lib/api";
import {
  AgentResult,
  SynthesisResult,
  IngredientFODMAP,
  SafetyFlag,
  Citation,
  BioavailabilityChange,
  EnzymeRecommendation,
} from "@/lib/types";
import FeedbackModal from "./FeedbackModal";
import IngredientSimulationPanel from "./results/IngredientSimulationPanel";
import { useSimulationStore } from "@/lib/simulation/useSimulationStore";
import { deriveSimulationIngredients } from "@/lib/simulation/deriveIngredientProvenance";

/* ── Color utilities (iOS-aligned tokens) ─────────────────────────────── */

function tierColor(tier: string) {
  switch (tier) {
    case "low":
      return "bg-[var(--color-gut-green)]/10 text-[var(--color-gut-green)]";
    case "moderate":
      return "bg-[var(--color-gut-amber)]/10 text-[var(--color-gut-amber)]";
    case "high":
      return "bg-[var(--color-gut-red)]/10 text-[var(--color-gut-red)]";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function tierDot(tier: string) {
  switch (tier) {
    case "low":
      return "bg-[var(--color-gut-green)]";
    case "moderate":
      return "bg-[var(--color-gut-amber)]";
    case "high":
      return "bg-[var(--color-gut-red)]";
    default:
      return "bg-gray-400";
  }
}

function probabilityColor(p: number) {
  if (p < 0.3) return "var(--color-gut-green)";
  if (p < 0.6) return "var(--color-gut-amber)";
  return "var(--color-gut-red)";
}

function confidenceBadgeColor(conf: string) {
  const lower = conf.toLowerCase();
  if (lower.includes("peer") || lower.includes("review") || lower === "high")
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  if (lower.includes("clinical") || lower === "moderate")
    return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
  return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
}

/* ── Shared sub-components ────────────────────────────────────────────── */

function ProbabilityGauge({ value, label }: { value: number; label?: string }) {
  const pct = Math.round(value * 100);
  const color = probabilityColor(value);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - value * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-100 dark:text-gray-700" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 50 50)" className="transition-all duration-700" />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill={color} fontSize="20" fontWeight="bold">{pct}%</text>
      </svg>
      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label || "IBS Trigger Risk"}</span>
    </div>
  );
}

function FODMAPTable({ tiers }: { tiers: IngredientFODMAP[] }) {
  if (tiers.length === 0) return null;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
            <th className="text-left py-2 font-medium">Ingredient</th>
            <th className="text-center py-2 font-medium">Tier</th>
            <th className="text-right py-2 font-medium">Fructan</th>
            <th className="text-right py-2 font-medium">GOS</th>
            <th className="text-right py-2 font-medium">Lactose</th>
            <th className="text-right py-2 font-medium">Fructose</th>
            <th className="text-right py-2 font-medium">Polyol</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((t, i) => (
            <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
              <td className="py-2 text-gray-800 dark:text-gray-200 font-medium">{t.ingredient}</td>
              <td className="py-2 text-center">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tierColor(t.tier)}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${tierDot(t.tier)}`} />
                  {t.tier}
                </span>
              </td>
              <td className="py-2 text-right text-gray-600 dark:text-gray-400">{t.fructan_g !== null ? `${t.fructan_g}g` : "-"}</td>
              <td className="py-2 text-right text-gray-600 dark:text-gray-400">{t.gos_g !== null ? `${t.gos_g}g` : "-"}</td>
              <td className="py-2 text-right text-gray-600 dark:text-gray-400">{t.lactose_g !== null ? `${t.lactose_g}g` : "-"}</td>
              <td className="py-2 text-right text-gray-600 dark:text-gray-400">{t.fructose_g !== null ? `${t.fructose_g}g` : "-"}</td>
              <td className="py-2 text-right text-gray-600 dark:text-gray-400">{t.polyol_g !== null ? `${t.polyol_g}g` : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SafetyFlags({ flags }: { flags: SafetyFlag[] }) {
  if (flags.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      {flags.map((f, i) => {
        const colors: Record<string, string> = {
          info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300",
          warning: "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300",
          critical: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300",
        };
        const icons: Record<string, React.ReactNode> = {
          info: <Info size={14} />,
          warning: <AlertTriangle size={14} />,
          critical: <XCircle size={14} />,
        };
        return (
          <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${colors[f.severity] || colors.info}`}>
            {icons[f.severity] || icons.info}
            <span>{f.message}</span>
          </div>
        );
      })}
    </div>
  );
}

function CitationsList({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  return (
    <div className="mt-3">
      <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Citations</h5>
      <div className="space-y-1.5">
        {citations.map((c, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${confidenceBadgeColor(c.confidence_tier)}`}>{c.confidence_tier}</span>
            <span className="text-gray-700 dark:text-gray-300">
              {c.title} — {c.source}
              {c.url && (
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-[var(--color-gut-accent)] hover:underline">link</a>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BioavailabilitySection({ data }: { data: BioavailabilityChange[] }) {
  if (data.length === 0) return null;
  return (
    <div className="mt-3">
      <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Bioavailability</h5>
      <div className="space-y-1">
        {data.map((b, i) => (
          <div key={i} className="flex items-center gap-3 text-xs text-gray-700 dark:text-gray-300">
            <span className="font-medium w-20">{b.nutrient}</span>
            <span>Raw: {b.raw_percent}%</span>
            <span>Cooked: {b.cooked_percent}%</span>
            {b.note && <span className="text-gray-400 italic">{b.note}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function EnzymeSection({ recs }: { recs: EnzymeRecommendation[] }) {
  if (recs.length === 0) return null;
  return (
    <div className="mt-3">
      <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Enzyme Recommendations</h5>
      <div className="space-y-2">
        {recs.map((r, i) => (
          <div key={i} className="p-2.5 bg-[var(--color-gut-green)]/5 rounded-lg text-xs">
            <div className="font-medium text-[var(--color-gut-green)]">{r.name} ({r.brand})</div>
            <div className="text-gray-600 dark:text-gray-400">Targets: {r.targets} &middot; Dose: {r.dose}</div>
            {r.notes && <div className="text-gray-500 mt-0.5">{r.notes}</div>}
            {r.temperature_warning && (
              <div className="text-[var(--color-gut-amber)] mt-1 flex items-center gap-1">
                <ThermometerSun size={12} />
                Temperature sensitive — take before eating hot food
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="flex justify-center"><div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full" /></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}

/* ── Agent Pane ────────────────────────────────────────────────────────── */

function AgentPane({ title, icon, loading, error, result }: {
  title: string;
  icon: React.ReactNode;
  loading: boolean;
  error: string | null;
  result: AgentResult | null;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-800">
        {icon}
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h3>
        {loading && <Loader2 size={14} className="animate-spin text-[var(--color-gut-accent)] ml-auto" />}
        {result && <span className="ml-auto text-[10px] text-gray-400">{result.processing_latency_ms}ms</span>}
      </div>
      <div className="p-5">
        {loading && <LoadingSkeleton />}
        {error && (
          <div className="flex items-center gap-2 text-[var(--color-gut-red)] text-sm"><XCircle size={16} /><span>{error}</span></div>
        )}
        {result && (
          <>
            <ProbabilityGauge value={result.ibs_trigger_probability} />
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${confidenceBadgeColor(result.confidence_tier)}`}>{result.confidence_tier}</span>
              <span className="text-xs text-gray-400">{"\u00B1"}{Math.round(result.confidence_interval * 100)}%</span>
            </div>
            <FODMAPTable tiers={result.fodmap_tiers} />
            <SafetyFlags flags={result.safety_flags} />
            <BioavailabilitySection data={result.bioavailability} />
            <EnzymeSection recs={result.enzyme_recommendations} />
            <CitationsList citations={result.citations} />
          </>
        )}
      </div>
    </div>
  );
}

/* ── Synthesis Pane (OpenAI) ──────────────────────────────────────────── */

function SynthesisPane({ loading, error, result, onResynthesize, resynthLoading }: {
  loading: boolean;
  error: string | null;
  result: SynthesisResult | null;
  onResynthesize: (correction: string) => void;
  resynthLoading: boolean;
}) {
  const [correction, setCorrection] = useState("");
  const [showCorrectionInput, setShowCorrectionInput] = useState(false);

  const handleSubmitCorrection = () => {
    if (!correction.trim()) return;
    onResynthesize(correction.trim());
    setCorrection("");
    setShowCorrectionInput(false);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-[var(--color-gut-accent)]/20 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--color-gut-accent)]/10 bg-[var(--color-gut-accent)]/5">
        <Sparkles size={18} className="text-[var(--color-gut-accent)]" />
        <h3 className="font-semibold text-[var(--color-gut-accent)] text-sm">OpenAI Synthesis</h3>
        {(loading || resynthLoading) && <Loader2 size={14} className="animate-spin text-[var(--color-gut-accent)] ml-auto" />}
        {result && !loading && !resynthLoading && (
          <button onClick={() => setShowCorrectionInput(!showCorrectionInput)} className="ml-auto flex items-center gap-1.5 text-xs text-[var(--color-gut-accent)] hover:text-[var(--color-gut-accent-hover)] transition-colors cursor-pointer">
            <PenLine size={12} />
            {showCorrectionInput ? "Cancel" : "Correct & Re-synthesize"}
          </button>
        )}
      </div>
      <div className="p-5">
        {(loading || resynthLoading) && <LoadingSkeleton />}
        {!loading && !resynthLoading && !result && !error && (
          <div className="text-center py-8 text-sm text-gray-400">Waiting for both agents to complete...</div>
        )}
        {error && !resynthLoading && (
          <div className="flex items-center gap-2 text-[var(--color-gut-red)] text-sm"><XCircle size={16} /><span>{error}</span></div>
        )}
        {result && !loading && !resynthLoading && (
          <>
            {showCorrectionInput && (
              <div className="mb-5 p-4 bg-[var(--color-gut-amber)]/5 rounded-xl border border-[var(--color-gut-amber)]/20">
                <h5 className="text-xs font-semibold text-[var(--color-gut-amber)] mb-2 flex items-center gap-1.5"><PenLine size={12} />Correct the Analysis</h5>
                <p className="text-[11px] text-gray-500 mb-3">Tell us what the agents got wrong.</p>
                <textarea value={correction} onChange={(e) => setCorrection(e.target.value)} placeholder="e.g. Remove wheat flour — the bread is gluten-free" rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-amber)]/50 resize-none" />
                <button onClick={handleSubmitCorrection} disabled={!correction.trim()} className="mt-2 flex items-center gap-2 px-4 py-2 bg-[var(--color-gut-accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-gut-accent-hover)] disabled:opacity-50 transition-colors cursor-pointer">
                  <Send size={14} />Re-synthesize with Correction
                </button>
              </div>
            )}
            <ProbabilityGauge value={result.final_ibs_probability} label="Final IBS Risk" />
            <div className="flex items-center justify-center mt-2">
              <span className="text-xs text-gray-400">Confidence band: {"\u00B1"}{Math.round(result.confidence_band * 100)}%</span>
            </div>
            {result.synthesis_rationale && (
              <div className="mt-4 p-3 bg-[var(--color-gut-accent)]/5 rounded-lg text-xs text-gray-700 dark:text-gray-300">
                <h5 className="font-medium text-[var(--color-gut-accent)] mb-1">Rationale</h5>
                {result.synthesis_rationale}
              </div>
            )}
            {result.key_disagreements.length > 0 && (
              <div className="mt-3">
                <h5 className="text-xs font-medium text-[var(--color-gut-amber)] mb-1">Key Disagreements</h5>
                <ul className="space-y-1">
                  {result.key_disagreements.map((d, i) => (
                    <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                      <AlertTriangle size={12} className="text-[var(--color-gut-amber)] shrink-0 mt-0.5" />{d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <FODMAPTable tiers={result.reconciled_tiers} />
            <SafetyFlags flags={result.safety_flags} />
            {result.enzyme_recommendation && <EnzymeSection recs={[result.enzyme_recommendation]} />}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main ResultsView (3-pane) ────────────────────────────────────────── */

export default function ResultsView() {
  const {
    primaryLoading, geminiLoading, synthesisLoading,
    primaryResult, geminiResult, synthesisResult,
    primaryError, geminiError, synthesisError,
    setSynthesisResult, setSynthesisLoading, setSynthesisError,
    query,
  } = useAnalysisStore();
  const primaryProvider = useSettingsStore((s) => s.primaryProvider);

  const [resynthLoading, setResynthLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // ── Initialize simulation store when both agent results arrive ──
  const initSimulation = useSimulationStore((s) => s.initialize);
  const simInitRef = useRef(false);

  useEffect(() => {
    if (primaryResult && geminiResult && synthesisResult && !simInitRef.current) {
      const simIngredients = deriveSimulationIngredients(primaryResult, geminiResult);
      initSimulation(simIngredients, synthesisResult.final_ibs_probability);
      simInitRef.current = true;
    }
    // Reset the ref when a new analysis starts
    if (!primaryResult && !geminiResult) {
      simInitRef.current = false;
    }
  }, [primaryResult, geminiResult, synthesisResult, initSimulation]);

  const primaryLabel = primaryProvider === "openai" ? "OpenAI Analysis" : "Claude Analysis";
  const primaryIcon = primaryProvider === "openai"
    ? <Zap size={18} className="text-green-500" />
    : <Brain size={18} className="text-purple-500" />;

  const handleResynthesize = useCallback(
    async (correction: string) => {
      if (!primaryResult || !geminiResult) return;
      setResynthLoading(true);
      setSynthesisError(null);
      try {
        const result = await synthesize({
          primary_result: primaryResult,
          gemini_result: geminiResult,
          user_correction: correction,
        });
        setSynthesisResult(result);
      } catch (err) {
        setSynthesisError(err instanceof Error ? err.message : "Re-synthesis failed");
      } finally {
        setResynthLoading(false);
      }
    },
    [primaryResult, geminiResult, setSynthesisResult, setSynthesisError]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Results</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{query}</p>
        </div>
        <button
          onClick={() => setShowFeedback(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-gut-accent)] bg-[var(--color-gut-accent)]/10 hover:bg-[var(--color-gut-accent)]/20 transition-colors cursor-pointer"
        >
          <MessageSquare size={14} />
          Feedback
        </button>
      </div>

      {/* 3-pane layout: Synthesis on top, two agents below on desktop */}
      <div className="mb-4">
        <SynthesisPane
          loading={synthesisLoading}
          error={synthesisError}
          result={synthesisResult}
          onResynthesize={handleResynthesize}
          resynthLoading={resynthLoading}
        />
      </div>

      {/* Ingredient Simulation — below synthesis, above agent detail */}
      <div className="mb-4">
        <IngredientSimulationPanel />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AgentPane
          title={primaryLabel}
          icon={primaryIcon}
          loading={primaryLoading}
          error={primaryError}
          result={primaryResult}
        />
        <AgentPane
          title="Gemini Analysis"
          icon={<Gem size={18} className="text-blue-500" />}
          loading={geminiLoading}
          error={geminiError}
          result={geminiResult}
        />
      </div>

      {showFeedback && (
        <FeedbackModal query={query} onClose={() => setShowFeedback(false)} />
      )}
    </div>
  );
}
