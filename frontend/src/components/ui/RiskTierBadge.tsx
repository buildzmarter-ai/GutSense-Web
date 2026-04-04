"use client";

import type { RiskTier } from "@/lib/types";

const TIER_STYLES: Record<RiskTier, { bg: string; dot: string; label: string }> = {
  low:      { bg: "bg-[var(--color-gut-green)]/10 text-[var(--color-gut-green)]", dot: "bg-[var(--color-gut-green)]", label: "Low Risk" },
  moderate: { bg: "bg-[var(--color-gut-amber)]/10 text-[var(--color-gut-amber)]", dot: "bg-[var(--color-gut-amber)]", label: "Moderate Risk" },
  high:     { bg: "bg-[var(--color-gut-red)]/10 text-[var(--color-gut-red)]",     dot: "bg-[var(--color-gut-red)]",   label: "High Risk" },
};

export default function RiskTierBadge({ tier, compact }: { tier: RiskTier; compact?: boolean }) {
  const s = TIER_STYLES[tier];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {compact ? tier : s.label}
    </span>
  );
}
