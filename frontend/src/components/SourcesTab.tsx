"use client";

import { useState } from "react";
import { Plus, Trash2, BookOpen, X } from "lucide-react";
import { useSourcesStore } from "@/lib/store";
import { UserSource } from "@/lib/types";

export default function SourcesTab() {
  const { sources, addSource, removeSource } = useSourcesStore();
  const [showForm, setShowForm] = useState(false);
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
    setTitle("");
    setUrl("");
    setContent("");
    setSourceType("research");
    setShowForm(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Sources
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add research sources for RAG context in analyses.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#2D83A8] text-white rounded-xl text-sm font-medium hover:bg-[#256d8c] transition-colors cursor-pointer"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "Add Source"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Monash University FODMAP Guide"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D83A8]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                URL (optional)
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D83A8]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Content *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste research findings, notes, or relevant text..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D83A8]/50 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSourceType("research")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    sourceType === "research"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  Research
                </button>
                <button
                  onClick={() => setSourceType("anecdotal")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    sourceType === "anecdotal"
                      ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  Anecdotal
                </button>
              </div>
            </div>
            <button
              onClick={handleAdd}
              disabled={!title.trim() || !content.trim()}
              className="w-full py-2.5 bg-[#2D83A8] text-white rounded-lg text-sm font-medium hover:bg-[#256d8c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Add Source
            </button>
          </div>
        </div>
      )}

      {/* Sources list */}
      {sources.length === 0 && !showForm ? (
        <div className="text-center py-20">
          <BookOpen size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
            No sources yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add research sources to enhance your FODMAP analysis.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map((s) => (
            <div
              key={s.id}
              className="flex items-start gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {s.title}
                  </p>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      s.source_type === "research"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {s.source_type}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {s.content}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Added {new Date(s.date_added).toLocaleDateString()}
                  {s.url && (
                    <>
                      {" \u00b7 "}
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#2D83A8] hover:underline">
                        Link
                      </a>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => removeSource(s.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all cursor-pointer p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
