"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

export default function AddIngredientControl({
  onAdd,
}: {
  onAdd: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName("");
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 hover:border-[var(--color-gut-accent)] hover:text-[var(--color-gut-accent)] transition-colors w-full cursor-pointer"
      >
        <Plus size={14} />
        Add ingredient
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="e.g. garlic, honey, avocado"
        autoFocus
        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50"
      />
      <button
        onClick={handleSubmit}
        disabled={!name.trim()}
        className="px-3 py-2 rounded-lg bg-[var(--color-gut-accent)] text-white text-sm font-medium hover:bg-[var(--color-gut-accent-hover)] disabled:opacity-50 transition-colors cursor-pointer"
      >
        Add
      </button>
      <button
        onClick={() => { setIsExpanded(false); setName(""); }}
        className="px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
      >
        Cancel
      </button>
    </div>
  );
}
