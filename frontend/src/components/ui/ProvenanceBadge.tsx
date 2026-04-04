"use client";

import type { IngredientProvenance } from "@/lib/types";
import { Brain, Gem, Zap, Users, User } from "lucide-react";

const CONFIG: Record<IngredientProvenance, { label: string; bg: string; icon: React.ReactNode }> = {
  claude:  { label: "Claude",  bg: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", icon: <Brain size={10} /> },
  openai:  { label: "OpenAI",  bg: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",     icon: <Zap size={10} /> },
  gemini:  { label: "Gemini",  bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",         icon: <Gem size={10} /> },
  both:    { label: "Both",    bg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",  icon: <Users size={10} /> },
  user:    { label: "User",    bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",     icon: <User size={10} /> },
};

export default function ProvenanceBadge({ provenance }: { provenance: IngredientProvenance }) {
  const c = CONFIG[provenance] ?? CONFIG.user;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${c.bg}`}>
      {c.icon}
      {c.label}
    </span>
  );
}
