"use client";

import { useState, useCallback } from "react";
import {
  AlertTriangle,
  Info,
  XCircle,
  Loader2,
  Sparkles,
  Brain,
  Gem,
  ThermometerSun,
  Send,
  PenLine,
} from "lucide-react";
import { useAnalysisStore } from "@/lib/store";
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

function tierColor(tier: string) {
  switch (tier) {
    case "low":
      return "bg-[#2ecc71]/10 text-[#2ecc71]";
    case "moderate":
      return "bg-[#f39c12]/10 text-[#f39c12]";
    case "high":
      return "bg-[#e74c3c]/10 text-[#e74c3c]";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function tierDot(tier: string) {
  switch (tier) {
    case "low":
      return "bg-[#2ecc71]";
    case "moderate":
      return "bg-[#f39c12]";
    case "high":
      return "bg-[#e74c3c]";
    default:
      return "bg-gray-400";
  }
}

function probabilityColor(p: number) {
  if (p < 0.3) return "#2ecc71";
  if (p < 0.6) return "#f39c12";
  return "#e74c3c";
}

function confidenceBadgeColor(conf: string) {
  const lower = conf.toLowerCase();
  if (lower.includes("peer") || lower.includes("review") || lower === "high")
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  if (lower.includes("clinical") || lower === "moderate")
    return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
  return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
}

function ProbabilityGauge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = probabilityColor(value);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - value * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-gray-100 dark:text-gray-700"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          className="transition-all duration-700"
        />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize="20"
          fontWeight="bold"
        >
          {pct}%
        </text>
      </svg>
      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        IBS Trigger Risk
      </span>
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
            <tr
              key={i}
              className="border-b border-gray-50 dark:border-gray-800"
            >
              <td className="py-2 text-gray-800 dark:text-gray-200 font-medium">
                {t.ingredient}
              </td>
              <td className="py-2 text-center">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tierColor(t.tier)}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${tierDot(t.tier)}`}
                  />
                  {t.tier}
                </span>
              </td>
              <td className="py-2 text-right text-gray-600 dark:text-gray-400">
                {t.fructan_g !== null ? `${t.fructan_g}g` : "-"}
              </td>
              <td className="py-2 text-right text-gray-600 dark:text-gray-400">
                {t.gos_g !== null ? `${t.gos_g}g` : "-"}
              </td>
              <td className="py-2 text-right text-gray-600 dark:text-gray-400">
                {t.lactose_g !== null ? `${t.lactose_g}g` : "-"}
              </td>
              <td className="py-2 text-right text-gray-600 dark:text-gray-400">
                {t.fructose_g !== null ? `${t.fructose_g}g` : "-"}
              </td>
              <td className="py-2 text-right text-gray-600 dark:text-gray-400">
                {t.polyol_g !== null ? `${t.polyol_g}g` : "-"}
              </td>
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
          warning:
            "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300",
          critical:
            "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300",
        };
        const icons: Record<string, React.ReactNode> = {
          info: <Info size={14} />,
          warning: <AlertTriangle size={14} />,
          critical: <XCircle size={14} />,
        };
        return (
          <div
            key={i}
            className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${colors[f.severity] || colors.info}`}
          >
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
      <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        Citations
      </h5>
      <div className="space-y-1.5">
        {citations.map((c, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span
              className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${confidenceBadgeColor(c.confidence_tier)}`}
            >
              {c.confidence_tier}
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              {c.title} — {c.source}
              {c.url && (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-[#2D83A8] hover:underline"
                >
                  link
                </a>
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
      <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        Bioavailability
      </h5>
      <div className="space-y-1">
        {data.map((b, i) => (
          <div
            key={i}
            className="flex items-center gap-3 text-xs text-gray-700 dark:text-gray-300"
          >
            <span className="font-medium w-20">{b.nutrient}</span>
            <span>Raw: {b.raw_percent}%</span>
            <span>Cooked: {b.cooked_percent}%</span>
            {b.note && (
              <span className="text-gray-400 italic">{b.note}</span>
            )}
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
      <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        Enzyme Recommendations
      </h5>
      <div className="space-y-2">
        {recs.map((r, i) => (
          <div
            key={i}
            className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg text-xs"
          >
            <div className="font-medium text-green-800 dark:text-green-300">
              {r.name} ({r.brand})
            </div>
            <div className="text-green-700 dark:text-green-400">
              Targets: {r.targets} &middot; Dose: {r.dose}
            </div>
            {r.notes && (
              <div className="text-green-600 dark:text-green-500 mt-0.5">
                {r.notes}
              </div>
            )}
            {r.temperature_warning && (
              <div className="text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
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
      <div className="flex justify-center">
        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
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

function AgentPane({
  title,
  icon,
  loading,
  error,
  result,
}: {
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
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
          {title}
        </h3>
        {loading && (
          <Loader2
            size={14}
            className="animate-spin text-[#2D83A8] ml-auto"
          />
        )}
        {result && (
          <span className="ml-auto text-[10px] text-gray-400">
            {result.processing_latency_ms}ms
          </span>
        )}
      </div>

      <div className="p-5">
        {loading && <LoadingSkeleton />}
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <XCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {result && (
          <>
            <ProbabilityGauge value={result.ibs_trigger_probability} />
            <div className="flex items-center justify-center gap-2 mt-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${confidenceBadgeColor(result.confidence_tier)}`}
              >
                {result.confidence_tier}
              </span>
              <span className="text-xs text-gray-400">
                {"\u00B1"}
                {Math.round(result.confidence_interval * 100)}%
              </span>
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

function SynthesisPane({
  loading,
  error,
  result,
  onResynthesize,
  resynthLoading,
}: {
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
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-[#2D83A8]/20 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[#2D83A8]/10 bg-[#2D83A8]/5">
        <Sparkles size={18} className="text-[#2D83A8]" />
        <h3 className="font-semibold text-[#2D83A8] text-sm">Synthesis</h3>
        {(loading || resynthLoading) && (
          <Loader2
            size={14}
            className="animate-spin text-[#2D83A8] ml-auto"
          />
        )}
        {result && !loading && !resynthLoading && (
          <button
            onClick={() => setShowCorrectionInput(!showCorrectionInput)}
            className="ml-auto flex items-center gap-1.5 text-xs text-[#2D83A8] hover:text-[#256d8c] transition-colors cursor-pointer"
          >
            <PenLine size={12} />
            {showCorrectionInput ? "Cancel" : "Correct & Re-synthesize"}
          </button>
        )}
      </div>

      <div className="p-5">
        {(loading || resynthLoading) && <LoadingSkeleton />}
        {!loading && !resynthLoading && !result && !error && (
          <div className="text-center py-8 text-sm text-gray-400">
            Waiting for both agents to complete...
          </div>
        )}
        {error && !resynthLoading && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <XCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {result && !loading && !resynthLoading && (
          <>
            {/* Correction Input */}
            {showCorrectionInput && (
              <div className="mb-5 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <h5 className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                  <PenLine size={12} />
                  Correct the Analysis
                </h5>
                <p className="text-[11px] text-amber-600 dark:text-amber-500 mb-3">
                  Tell us what the agents got wrong. For example: &ldquo;This doesn&apos;t contain
                  wheat flour, it&apos;s made with rice flour&rdquo; or &ldquo;Add soy sauce &mdash; it
                  was used as a marinade.&rdquo;
                </p>
                <textarea
                  value={correction}
                  onChange={(e) => setCorrection(e.target.value)}
                  placeholder="e.g. Remove wheat flour — the bread is gluten-free made with rice flour and tapioca starch"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
                />
                <button
                  onClick={handleSubmitCorrection}
                  disabled={!correction.trim()}
                  className="mt-2 flex items-center gap-2 px-4 py-2 bg-[#2D83A8] text-white rounded-lg text-sm font-medium hover:bg-[#256d8c] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Send size={14} />
                  Re-synthesize with Correction
                </button>
              </div>
            )}

            <ProbabilityGauge value={result.final_ibs_probability} />
            <div className="flex items-center justify-center mt-2">
              <span className="text-xs text-gray-400">
                Confidence band: {"\u00B1"}
                {Math.round(result.confidence_band * 100)}%
              </span>
            </div>

            {result.synthesis_rationale && (
              <div className="mt-4 p-3 bg-[#2D83A8]/5 rounded-lg text-xs text-gray-700 dark:text-gray-300">
                <h5 className="font-medium text-[#2D83A8] mb-1">Rationale</h5>
                {result.synthesis_rationale}
              </div>
            )}

            {result.key_disagreements.length > 0 && (
              <div className="mt-3">
                <h5 className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">
                  Key Disagreements
                </h5>
                <ul className="space-y-1">
                  {result.key_disagreements.map((d, i) => (
                    <li
                      key={i}
                      className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5"
                    >
                      <AlertTriangle
                        size={12}
                        className="text-orange-500 shrink-0 mt-0.5"
                      />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <FODMAPTable tiers={result.reconciled_tiers} />
            <SafetyFlags flags={result.safety_flags} />

            {result.enzyme_recommendation && (
              <EnzymeSection recs={[result.enzyme_recommendation]} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ResultsView() {
  const {
    claudeLoading,
    geminiLoading,
    synthesisLoading,
    claudeResult,
    geminiResult,
    synthesisResult,
    claudeError,
    geminiError,
    synthesisError,
    setSynthesisResult,
    setSynthesisLoading,
    setSynthesisError,
    query,
  } = useAnalysisStore();

  const [resynthLoading, setResynthLoading] = useState(false);

  const handleResynthesize = useCallback(
    async (correction: string) => {
      if (!claudeResult || !geminiResult) return;

      setResynthLoading(true);
      setSynthesisError(null);

      try {
        const result = await synthesize({
          claude_result: claudeResult,
          gemini_result: geminiResult,
          user_correction: correction,
        });
        setSynthesisResult(result);
      } catch (err) {
        setSynthesisError(
          err instanceof Error ? err.message : "Re-synthesis failed"
        );
      } finally {
        setResynthLoading(false);
      }
    },
    [claudeResult, geminiResult, setSynthesisResult, setSynthesisError]
  );

  return (
    <div>
      <div className="mb-4 px-1">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Results
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {query}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <AgentPane
          title="Claude Analysis"
          icon={<Brain size={18} className="text-purple-500" />}
          loading={claudeLoading}
          error={claudeError}
          result={claudeResult}
        />
        <AgentPane
          title="Gemini Analysis"
          icon={<Gem size={18} className="text-blue-500" />}
          loading={geminiLoading}
          error={geminiError}
          result={geminiResult}
        />
      </div>

      <SynthesisPane
        loading={synthesisLoading}
        error={synthesisError}
        result={synthesisResult}
        onResynthesize={handleResynthesize}
        resynthLoading={resynthLoading}
      />
    </div>
  );
}
