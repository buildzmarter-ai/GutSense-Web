"use client";

import { useState } from "react";
import { Plus, Trash2, BookOpen, X, Search, FlaskConical, MessageCircle } from "lucide-react";
import { useSourcesStore } from "@/lib/store";
import { UserSource } from "@/lib/types";

type FilterType = "all" | "research" | "anecdotal";

const FILTER_OPTIONS: { id: FilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "research", label: "Research" },
  { id: "anecdotal", label: "Personal" },
];

function sourceBadge(type: string) {
  if (type === "research") return { icon: <FlaskConical size={10} />, label: "Research", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" };
  return { icon: <MessageCircle size={10} />, label: "Personal", cls: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400" };
}

export default function SourcesTab() {
  const { sources, addSource, removeSource } = useSourcesStore();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [sourceType, setSourceType] = useState<"research" | "anecdotal">("research");

  const handleAdd = () => {
    if (!title.trim() || !content.trim()) return;
    const source: UserSource = {
      id: crypto.randomUUID(),
      title: title.trim(),
      url: url.trim() || undefined,
      content: content.trim(),
      source_type: sourceType,
      date_added: new Date().toISOString(),
    };
    addSource(source);
    setTitle(""); setUrl(""); setContent(""); setSourceType("research"); setShowForm(false);
  };

  const filtered = sources
    .filter((s) => filter === "all" || s.source_type === filter)
    .filter((s) => !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.content.toLowerCase().includes(search.toLowerCase()));

  const researchCount = sources.filter((s) => s.source_type === "research").length;
  const personalCount = sources.filter((s) => s.source_type === "anecdotal").length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sources</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Add research sources for RAG context in analyses.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-2 bg-[var(--color-gut-accent)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-gut-accent-hover)] transition-colors cursor-pointer">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "Add Source"}
        </button>
      </div>

      {/* Summary stats */}
      {sources.length > 0 && (
        <div className="flex gap-2 mb-4">
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {researchCount} Research
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            {personalCount} Personal
          </span>
        </div>
      )}

      {/* Search + Filter */}
      {sources.length > 0 && (
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search sources..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50" />
          </div>
          <div className="flex gap-2">
            {FILTER_OPTIONS.map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${filter === f.id ? "bg-[var(--color-gut-accent)]/10 text-[var(--color-gut-accent)] border border-[var(--color-gut-accent)]/30" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Monash University FODMAP Guide" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">URL (optional)</label>
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Content *</label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste research findings, notes, or relevant text..." rows={4} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
              <div className="flex gap-2">
                <button onClick={() => setSourceType("research")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${sourceType === "research" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>Research</button>
                <button onClick={() => setSourceType("anecdotal")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${sourceType === "anecdotal" ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>Personal</button>
              </div>
            </div>
            <button onClick={handleAdd} disabled={!title.trim() || !content.trim()} className="w-full py-2.5 bg-[var(--color-gut-accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-gut-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">Add Source</button>
          </div>
        </div>
      )}

      {/* Sources list */}
      {filtered.length === 0 && !showForm ? (
        <div className="text-center py-20">
          <BookOpen size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {sources.length === 0 ? "No sources yet" : "No matching sources"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {sources.length === 0 ? "Add research sources to enhance your FODMAP analysis." : "Try adjusting your search or filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const badge = sourceBadge(s.source_type);
            return (
              <div key={s.id} className="flex items-start gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{s.title}</p>
                    <span className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.cls}`}>
                      {badge.icon}{badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{s.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Added {new Date(s.date_added).toLocaleDateString()}
                    {s.url && (
                      <>{" \u00b7 "}<a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-gut-accent)] hover:underline">Link</a></>
                    )}
                  </p>
                </div>
                <button onClick={() => removeSource(s.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[var(--color-gut-red)] transition-all cursor-pointer p-1"><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
