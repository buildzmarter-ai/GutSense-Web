"use client";

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { SimulationRiskResult } from "@/lib/types";
import RiskTierBadge from "@/components/ui/RiskTierBadge";

function probabilityColor(p: number) {
  if (p < 0.3) return "var(--color-gut-green)";
  if (p < 0.6) return "var(--color-gut-amber)";
  return "var(--color-gut-red)";
}

function DeltaIndicator({ delta }: { delta: number }) {
  const absDelta = Math.abs(delta);
  const pct = Math.round(absDelta * 100);
  if (pct === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <Minus size={12} /> No change
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[var(--color-gut-green)] font-medium">
        <TrendingDown size={12} /> {pct}% lower
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--color-gut-red)] font-medium">
      <TrendingUp size={12} /> {pct}% higher
    </span>
  );
}

export default function SimulationSummaryCard({ risk }: { risk: SimulationRiskResult }) {
  const pct = Math.round(risk.estimatedProbability * 100);
  const color = probabilityColor(risk.estimatedProbability);
  const circumference = 2 * Math.PI * 32;
  const offset = circumference - risk.estimatedProbability * circumference;

  return (
    <div className="flex items-center gap-5 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
      {/* Mini gauge */}
      <div className="shrink-0">
        <svg width="76" height="76" viewBox="0 0 76 76">
          <circle cx="38" cy="38" r="32" fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-100 dark:text-gray-700" />
          <circle cx="38" cy="38" r="32" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 38 38)" className="transition-all duration-500" />
          <text x="38" y="38" textAnchor="middle" dominantBaseline="central" fill={color} fontSize="16" fontWeight="bold">{pct}%</text>
        </svg>
      </div>

      {/* Stats */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Simulated Risk</span>
          <RiskTierBadge tier={risk.riskTier} compact />
        </div>
        <DeltaIndicator delta={risk.delta} />
        <div className="mt-2 grid grid-cols-5 gap-1 text-[10px] text-gray-400">
          <span>Fr {risk.totalFructan}g</span>
          <span>GOS {risk.totalGos}g</span>
          <span>Lac {risk.totalLactose}g</span>
          <span>Fru {risk.totalFructose}g</span>
          <span>Pol {risk.totalPolyol}g</span>
        </div>
        <div className="text-[10px] text-gray-400 mt-1">
          {risk.includedCount} included &middot; {risk.excludedCount} excluded &middot; Total FODMAP: {risk.totalFodmapLoad}g
        </div>
      </div>
    </div>
  );
}
