"use client";

import { useState } from "react";
import {
  Search, Trash2, Clock, XCircle, Image as ImageIcon,
  CheckSquare, Square, RotateCcw, AlertCircle,
} from "lucide-react";
import { useHistoryStore, useAnalysisStore } from "@/lib/store";
import { HistoryEntry } from "@/lib/types";

function riskColor(p: number) {
  if (p < 0.3) return "bg-[var(--color-gut-green)]";
  if (p < 0.6) return "bg-[var(--color-gut-amber)]";
  return "bg-[var(--color-gut-red)]";
}

function riskLabel(p: number) {
  if (p < 0.3) return "Low";
  if (p < 0.6) return "Moderate";
  return "High";
}

function riskBadgeColor(p: number) {
  if (p < 0.3) return "bg-[var(--color-gut-green)]/10 text-[var(--color-gut-green)]";
  if (p < 0.6) return "bg-[var(--color-gut-amber)]/10 text-[var(--color-gut-amber)]";
  return "bg-[var(--color-gut-red)]/10 text-[var(--color-gut-red)]";
}

export default function HistoryTab({
  onNavigateToAnalyze,
}: {
  onNavigateToAnalyze: () => void;
}) {
  const { entries, selectedIds, removeEntry, removeEntries, clearAll, toggleSelect, selectAll, clearSelection } = useHistoryStore();
  const analysis = useAnalysisStore();
  const [search, setSearch] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

  const filtered = entries.filter((e) =>
    e.query.toLowerCase().includes(search.toLowerCase())
  );

  const viewEntry = (entry: HistoryEntry) => {
    if (selectionMode) {
      toggleSelect(entry.id);
      return;
    }

    analysis.reset();
    analysis.setQuery(entry.query);

    if (entry.image_thumbnail) {
      const base64 = entry.image_thumbnail.split(",")[1] || "";
      analysis.setImage(base64, entry.image_thumbnail);
      analysis.setInputMode("photo");
    }

    if (entry.primary_result) analysis.setPrimaryResult(entry.primary_result);
    if (entry.gemini_result) analysis.setGeminiResult(entry.gemini_result);
    if (entry.synthesis_result) analysis.setSynthesisResult(entry.synthesis_result);

    analysis.setShowResults(true);
    onNavigateToAnalyze();
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedIds);
    if (ids.length > 0) {
      removeEntries(ids);
    }
    setSelectionMode(false);
  };

  const handleRerunSelected = () => {
    // Re-run the first selected entry
    const id = Array.from(selectedIds)[0];
    const entry = entries.find((e) => e.id === id);
    if (entry) {
      analysis.reset();
      analysis.setQuery(entry.query);
      if (entry.image_thumbnail) {
        const base64 = entry.image_thumbnail.split(",")[1] || "";
        analysis.setImage(base64, entry.image_thumbnail);
        analysis.setInputMode("photo");
      }
      onNavigateToAnalyze();
    }
    setSelectionMode(false);
    clearSelection();
  };

  if (entries.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Clock size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">No analyses yet</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Your analysis history will appear here after you analyze a food.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">History</h2>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <span className="text-xs text-gray-500">{selectedIds.size} selected</span>
              <button onClick={selectAll} className="text-xs text-[var(--color-gut-accent)] hover:underline cursor-pointer">Select All</button>
              <button onClick={handleRerunSelected} disabled={selectedIds.size !== 1} className="flex items-center gap-1 text-xs text-[var(--color-gut-accent)] hover:underline cursor-pointer disabled:opacity-30">
                <RotateCcw size={12} />Re-run
              </button>
              <button onClick={handleDeleteSelected} disabled={selectedIds.size === 0} className="flex items-center gap-1 text-xs text-[var(--color-gut-red)] hover:underline cursor-pointer disabled:opacity-30">
                <Trash2 size={12} />Delete
              </button>
              <button onClick={() => { setSelectionMode(false); clearSelection(); }} className="text-xs text-gray-500 hover:underline cursor-pointer">Done</button>
            </>
          ) : (
            <>
              <button onClick={() => setSelectionMode(true)} className="text-xs text-gray-400 hover:text-[var(--color-gut-accent)] transition-colors cursor-pointer">Select</button>
              {confirmClear ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Clear all?</span>
                  <button onClick={() => { clearAll(); setConfirmClear(false); }} className="text-xs text-[var(--color-gut-red)] font-medium hover:underline cursor-pointer">Yes, delete</button>
                  <button onClick={() => setConfirmClear(false)} className="text-xs text-gray-500 hover:underline cursor-pointer">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmClear(true)} className="text-xs text-gray-400 hover:text-[var(--color-gut-red)] transition-colors cursor-pointer">Clear All</button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search history..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50"
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((entry) => (
          <div
            key={entry.id}
            className={`flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border transition-colors group ${
              selectedIds.has(entry.id)
                ? "border-[var(--color-gut-accent)] bg-[var(--color-gut-accent)]/5"
                : "border-gray-100 dark:border-gray-800 hover:border-[var(--color-gut-accent)]/30"
            }`}
          >
            {/* Selection checkbox */}
            {selectionMode && (
              <button onClick={() => toggleSelect(entry.id)} className="shrink-0 cursor-pointer text-gray-400">
                {selectedIds.has(entry.id) ? <CheckSquare size={18} className="text-[var(--color-gut-accent)]" /> : <Square size={18} />}
              </button>
            )}

            {/* Risk dot or photo thumbnail */}
            {entry.image_thumbnail ? (
              <div className="relative shrink-0">
                <img src={entry.image_thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 ${riskColor(entry.final_probability)}`} />
              </div>
            ) : (
              <div className={`w-3 h-3 rounded-full shrink-0 ${riskColor(entry.final_probability)}`} />
            )}

            {/* Content */}
            <button onClick={() => viewEntry(entry)} className="flex-1 text-left cursor-pointer min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{entry.query}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <p className="text-xs text-gray-400">
                  {new Date(entry.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
                {entry.serving_description && <span className="text-xs text-gray-400">{"\u00b7"} {entry.serving_description}</span>}
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${riskBadgeColor(entry.final_probability)}`}>
                  {riskLabel(entry.final_probability)} {Math.round(entry.final_probability * 100)}%
                </span>
                {!entry.isComplete && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--color-gut-amber)]/10 text-[var(--color-gut-amber)] flex items-center gap-0.5">
                    <AlertCircle size={9} />INCOMPLETE
                  </span>
                )}
              </div>
              {/* Agent availability indicators */}
              <div className="flex items-center gap-1.5 mt-1">
                {entry.primary_result && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">
                    {entry.primary_result.agent_type === "openai" ? "OpenAI" : "Claude"}
                  </span>
                )}
                {entry.gemini_result && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">Gemini</span>
                )}
                {entry.synthesis_result && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-gut-accent)]/10 text-[var(--color-gut-accent)] font-medium">Synthesis</span>
                )}
                {entry.image_thumbnail && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 font-medium flex items-center gap-0.5"><ImageIcon size={8} />Photo</span>
                )}
              </div>
            </button>

            {/* Delete (hover only when not in selection mode) */}
            {!selectionMode && (
              <button onClick={() => removeEntry(entry.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[var(--color-gut-red)] transition-all cursor-pointer p-1">
                <Trash2 size={14} />
              </button>
            )}
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
