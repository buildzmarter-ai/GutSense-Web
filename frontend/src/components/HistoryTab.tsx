"use client";

import { useState } from "react";
import { Search, Trash2, Clock, XCircle, Image as ImageIcon } from "lucide-react";
import { useHistoryStore, useAnalysisStore } from "@/lib/store";
import { HistoryEntry } from "@/lib/types";

function riskColor(p: number) {
  if (p < 0.3) return "bg-[#2ecc71]";
  if (p < 0.6) return "bg-[#f39c12]";
  return "bg-[#e74c3c]";
}

function riskLabel(p: number) {
  if (p < 0.3) return "Low";
  if (p < 0.6) return "Moderate";
  return "High";
}

export default function HistoryTab({
  onNavigateToAnalyze,
}: {
  onNavigateToAnalyze: () => void;
}) {
  const { entries, removeEntry, clearAll } = useHistoryStore();
  const analysis = useAnalysisStore();
  const [search, setSearch] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = entries.filter((e) =>
    e.query.toLowerCase().includes(search.toLowerCase())
  );

  const viewEntry = (entry: HistoryEntry) => {
    // Reset first to clear any existing state
    analysis.reset();

    // Load the saved results
    analysis.setQuery(entry.query);

    if (entry.image_thumbnail) {
      // Restore image preview (base64 data URL)
      const base64 = entry.image_thumbnail.split(",")[1] || "";
      analysis.setImage(base64, entry.image_thumbnail);
      analysis.setInputMode("photo");
    }

    if (entry.claude_result) analysis.setClaudeResult(entry.claude_result);
    if (entry.gemini_result) analysis.setGeminiResult(entry.gemini_result);
    if (entry.synthesis_result) analysis.setSynthesisResult(entry.synthesis_result);

    analysis.setShowResults(true);

    // Switch to analyze tab to show results
    onNavigateToAnalyze();
  };

  if (entries.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Clock size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
          No analyses yet
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your analysis history will appear here after you analyze a food.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          History
        </h2>
        {confirmClear ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Clear all?</span>
            <button
              onClick={() => {
                clearAll();
                setConfirmClear(false);
              }}
              className="text-xs text-red-500 font-medium hover:underline cursor-pointer"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="text-xs text-gray-500 hover:underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search history..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D83A8]/50"
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-[#2D83A8]/30 transition-colors group"
          >
            {/* Risk dot or photo thumbnail */}
            {entry.image_thumbnail ? (
              <div className="relative shrink-0">
                <img
                  src={entry.image_thumbnail}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                />
                <div
                  className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 ${riskColor(entry.final_probability)}`}
                />
              </div>
            ) : (
              <div className={`w-3 h-3 rounded-full shrink-0 ${riskColor(entry.final_probability)}`} />
            )}

            {/* Content */}
            <button
              onClick={() => viewEntry(entry)}
              className="flex-1 text-left cursor-pointer min-w-0"
            >
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                {entry.query}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-gray-400">
                  {new Date(entry.timestamp).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                {entry.serving_description && (
                  <span className="text-xs text-gray-400">
                    {"\u00b7"} {entry.serving_description}
                  </span>
                )}
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    entry.final_probability < 0.3
                      ? "bg-[#2ecc71]/10 text-[#2ecc71]"
                      : entry.final_probability < 0.6
                        ? "bg-[#f39c12]/10 text-[#f39c12]"
                        : "bg-[#e74c3c]/10 text-[#e74c3c]"
                  }`}
                >
                  {riskLabel(entry.final_probability)} {Math.round(entry.final_probability * 100)}%
                </span>
              </div>
              {/* Agent availability indicators */}
              <div className="flex items-center gap-1.5 mt-1">
                {entry.claude_result && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">
                    Claude
                  </span>
                )}
                {entry.gemini_result && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">
                    Gemini
                  </span>
                )}
                {entry.synthesis_result && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#2D83A8]/10 text-[#2D83A8] font-medium">
                    Synthesis
                  </span>
                )}
                {entry.image_thumbnail && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 font-medium flex items-center gap-0.5">
                    <ImageIcon size={8} />
                    Photo
                  </span>
                )}
              </div>
            </button>

            {/* Delete */}
            <button
              onClick={() => removeEntry(entry.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all cursor-pointer p-1"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && search && (
        <div className="text-center py-10">
          <XCircle size={24} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">No results for &quot;{search}&quot;</p>
        </div>
      )}
    </div>
  );
}
