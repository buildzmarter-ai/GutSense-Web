"use client";

import { useAnalysisStore } from "@/lib/store";

const presets = [
  { label: "1/4", value: 0.25 },
  { label: "1/2", value: 0.5 },
  { label: "3/4", value: 0.75 },
  { label: "1x", value: 1 },
  { label: "1.5x", value: 1.5 },
  { label: "2x", value: 2 },
];

export default function ServingSelector() {
  const { servingFraction, servingGrams, servingDescription, setServingFraction, setServingGrams, setServingDescription } =
    useAnalysisStore();

  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Serving Size
      </h4>
      <div className="flex flex-wrap gap-2 mb-3">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setServingFraction(p.value);
              setServingGrams(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              servingFraction === p.value && servingGrams === null
                ? "bg-[var(--color-gut-accent)] text-white"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-[var(--color-gut-accent)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Custom grams
          </label>
          <input
            type="number"
            min={1}
            placeholder="e.g. 150"
            value={servingGrams ?? ""}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value) : null;
              setServingGrams(val);
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Description (optional)
          </label>
          <input
            type="text"
            placeholder="e.g. one bowl"
            value={servingDescription}
            onChange={(e) => setServingDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50"
          />
        </div>
      </div>
    </div>
  );
}
