import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AgentResult,
  HistoryEntry,
  SynthesisResult,
  UserProfile,
  UserSource,
} from "./types";

// Settings Store
interface SettingsState {
  backendUrl: string;
  apiSecret: string;
  profile: UserProfile;
  setBackendUrl: (url: string) => void;
  setApiSecret: (secret: string) => void;
  setProfile: (profile: Partial<UserProfile>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      backendUrl: "http://localhost:8000",
      apiSecret: "",
      profile: {
        ibs_subtype: "IBS-D",
        fodmap_phase: "Elimination",
        known_triggers: [],
        known_safe_foods: [],
        medications: [],
        diagnosed_conditions: [],
      },
      setBackendUrl: (url) => set({ backendUrl: url }),
      setApiSecret: (secret) => set({ apiSecret: secret }),
      setProfile: (partial) =>
        set((state) => ({
          profile: { ...state.profile, ...partial },
        })),
    }),
    { name: "gutsense-settings" }
  )
);

// Analysis Store
interface AnalysisState {
  query: string;
  inputMode: "text" | "photo";
  imageBase64: string | null;
  imagePreviewUrl: string | null;
  servingFraction: number;
  servingGrams: number | null;
  servingDescription: string;
  isAnalyzing: boolean;
  showResults: boolean;
  claudeLoading: boolean;
  geminiLoading: boolean;
  synthesisLoading: boolean;
  claudeResult: AgentResult | null;
  geminiResult: AgentResult | null;
  synthesisResult: SynthesisResult | null;
  claudeError: string | null;
  geminiError: string | null;
  synthesisError: string | null;
  setQuery: (query: string) => void;
  setInputMode: (mode: "text" | "photo") => void;
  setImage: (base64: string | null, previewUrl: string | null) => void;
  setServingFraction: (fraction: number) => void;
  setServingGrams: (grams: number | null) => void;
  setServingDescription: (desc: string) => void;
  startAnalysis: () => void;
  setClaudeResult: (result: AgentResult | null) => void;
  setGeminiResult: (result: AgentResult | null) => void;
  setSynthesisResult: (result: SynthesisResult | null) => void;
  setClaudeError: (error: string | null) => void;
  setGeminiError: (error: string | null) => void;
  setSynthesisError: (error: string | null) => void;
  setClaudeLoading: (loading: boolean) => void;
  setGeminiLoading: (loading: boolean) => void;
  setSynthesisLoading: (loading: boolean) => void;
  setShowResults: (show: boolean) => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>()((set) => ({
  query: "",
  inputMode: "text",
  imageBase64: null,
  imagePreviewUrl: null,
  servingFraction: 1,
  servingGrams: null,
  servingDescription: "",
  isAnalyzing: false,
  showResults: false,
  claudeLoading: false,
  geminiLoading: false,
  synthesisLoading: false,
  claudeResult: null,
  geminiResult: null,
  synthesisResult: null,
  claudeError: null,
  geminiError: null,
  synthesisError: null,
  setQuery: (query) => set({ query }),
  setInputMode: (mode) => set({ inputMode: mode }),
  setImage: (base64, previewUrl) =>
    set({ imageBase64: base64, imagePreviewUrl: previewUrl }),
  setServingFraction: (fraction) => set({ servingFraction: fraction }),
  setServingGrams: (grams) => set({ servingGrams: grams }),
  setServingDescription: (desc) => set({ servingDescription: desc }),
  startAnalysis: () =>
    set({
      isAnalyzing: true,
      showResults: true,
      claudeLoading: true,
      geminiLoading: true,
      synthesisLoading: false,
      claudeResult: null,
      geminiResult: null,
      synthesisResult: null,
      claudeError: null,
      geminiError: null,
      synthesisError: null,
    }),
  setClaudeResult: (result) => set({ claudeResult: result, claudeLoading: false }),
  setGeminiResult: (result) => set({ geminiResult: result, geminiLoading: false }),
  setSynthesisResult: (result) =>
    set({ synthesisResult: result, synthesisLoading: false }),
  setClaudeError: (error) => set({ claudeError: error, claudeLoading: false }),
  setGeminiError: (error) => set({ geminiError: error, geminiLoading: false }),
  setSynthesisError: (error) =>
    set({ synthesisError: error, synthesisLoading: false }),
  setClaudeLoading: (loading) => set({ claudeLoading: loading }),
  setGeminiLoading: (loading) => set({ geminiLoading: loading }),
  setSynthesisLoading: (loading) => set({ synthesisLoading: loading }),
  setShowResults: (show) => set({ showResults: show }),
  reset: () =>
    set({
      query: "",
      imageBase64: null,
      imagePreviewUrl: null,
      servingFraction: 1,
      servingGrams: null,
      servingDescription: "",
      isAnalyzing: false,
      showResults: false,
      claudeLoading: false,
      geminiLoading: false,
      synthesisLoading: false,
      claudeResult: null,
      geminiResult: null,
      synthesisResult: null,
      claudeError: null,
      geminiError: null,
      synthesisError: null,
    }),
}));

// History Store
interface HistoryState {
  entries: HistoryEntry[];
  addEntry: (entry: HistoryEntry) => void;
  removeEntry: (id: string) => void;
  clearAll: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) =>
        set((state) => ({ entries: [entry, ...state.entries] })),
      removeEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),
      clearAll: () => set({ entries: [] }),
    }),
    { name: "gutsense-history" }
  )
);

// Sources Store
interface SourcesState {
  sources: UserSource[];
  addSource: (source: UserSource) => void;
  removeSource: (id: string) => void;
}

export const useSourcesStore = create<SourcesState>()(
  persist(
    (set) => ({
      sources: [],
      addSource: (source) =>
        set((state) => ({ sources: [source, ...state.sources] })),
      removeSource: (id) =>
        set((state) => ({
          sources: state.sources.filter((s) => s.id !== id),
        })),
    }),
    { name: "gutsense-sources" }
  )
);
