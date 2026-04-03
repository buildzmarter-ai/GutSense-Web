"use client";

import { ChevronRight } from "lucide-react";

const examples = [
  "Garlic bread with olive oil \u2014 safe for IBS-D?",
  "Is overnight oats with honey low FODMAP?",
  "Hummus and pita \u2014 fructan content?",
  "Avocado toast \u2014 polyol risk?",
  "Lentil soup cooked vs raw difference?",
  "Onion in cooking oil \u2014 does frying reduce FODMAPs?",
];

interface ExampleQueriesProps {
  onSelect: (query: string) => void;
}

export default function ExampleQueries({ onSelect }: ExampleQueriesProps) {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
        Try an example
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {examples.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="flex items-center justify-between text-left px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-[var(--color-gut-accent)]/5 hover:text-[var(--color-gut-accent)] dark:hover:bg-[var(--color-gut-accent)]/10 transition-colors cursor-pointer"
          >
            <span className="mr-2">{q}</span>
            <ChevronRight size={16} className="shrink-0 text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
}
