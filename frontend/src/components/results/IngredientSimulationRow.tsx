"use client";

import { Eye, EyeOff, Trash2 } from "lucide-react";
import type { SimulationIngredient } from "@/lib/types";
import ProvenanceBadge from "@/components/ui/ProvenanceBadge";

function tierDot(tier: string) {
  switch (tier) {
    case "low":      return "bg-[var(--color-gut-green)]";
    case "moderate": return "bg-[var(--color-gut-amber)]";
    case "high":     return "bg-[var(--color-gut-red)]";
    default:         return "bg-gray-400";
  }
}

export default function IngredientSimulationRow({
  ingredient,
  onToggle,
  onRemove,
}: {
  ingredient: SimulationIngredient;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const excluded = !ingredient.included;
  const fodmapTotal =
    (ingredient.fructan_g || 0) +
    (ingredient.gos_g || 0) +
    (ingredient.lactose_g || 0) +
    (ingredient.fructose_g || 0) +
    (ingredient.polyol_g || 0);

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
        excluded
          ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60"
          : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
      }`}
    >
      {/* Toggle include/exclude */}
      <button
        onClick={onToggle}
        className="shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
        title={excluded ? "Include ingredient" : "Exclude ingredient"}
      >
        {excluded ? (
          <EyeOff size={16} className="text-gray-400" />
        ) : (
          <Eye size={16} className="text-[var(--color-gut-accent)]" />
        )}
      </button>

      {/* Tier dot */}
      <span className={`w-2 h-2 rounded-full shrink-0 ${tierDot(ingredient.tier)}`} />

      {/* Name + provenance */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium truncate ${
              excluded
                ? "line-through text-gray-400 dark:text-gray-500"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {ingredient.ingredient}
          </span>
          <ProvenanceBadge provenance={ingredient.provenance} />
        </div>
        <div className="text-[11px] text-gray-400 mt-0.5">
          FODMAP: {fodmapTotal.toFixed(2)}g &middot; {ingredient.tier}
        </div>
      </div>

      {/* FODMAP breakdown (compact) */}
      <div className="hidden sm:flex items-center gap-2 text-[10px] text-gray-400 shrink-0">
        {ingredient.fructan_g > 0 && <span>Fr {ingredient.fructan_g}g</span>}
        {ingredient.gos_g > 0 && <span>GOS {ingredient.gos_g}g</span>}
        {ingredient.lactose_g > 0 && <span>Lac {ingredient.lactose_g}g</span>}
        {ingredient.fructose_g > 0 && <span>Fru {ingredient.fructose_g}g</span>}
        {ingredient.polyol_g > 0 && <span>Pol {ingredient.polyol_g}g</span>}
      </div>

      {/* Remove (user-added only) */}
      {ingredient.provenance === "user" && (
        <button
          onClick={onRemove}
          className="shrink-0 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
          title="Remove ingredient"
        >
          <Trash2 size={14} className="text-gray-400 hover:text-[var(--color-gut-red)]" />
        </button>
      )}
    </div>
  );
}
