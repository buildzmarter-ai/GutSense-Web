import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AgentResult,
  HistoryEntry,
  PrimaryProvider,
  SynthesisResult,
  UserProfile,
  UserSource,
} from "./types";

// Settings Store
interface SettingsState {
  backendUrl: string;
  apiSecret: string;
  primaryProvider: PrimaryProvider;
  profile: UserProfile;
  setBackendUrl: (url: string) => void;
  setApiSecret: (secret: string) => void;
  setPrimaryProvider: (provider: PrimaryProvider) => void;
  setProfile: (profile: Partial<UserProfile>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      backendUrl: "http://localhost:8000",
      apiSecret: "",
      primaryProvider: "anthropic",
      profile: {
        ibs_subtype: "IBS-D",
        fodmap_phase: "Elimination",
        known_triggers: [],
        known_safe_foods: [],
        medications: [],
        diagnosed_conditions: [],
        sensitivities: [],
      },
      setBackendUrl: (url) => set({ backendUrl: url }),
      setApiSecret: (secret) => set({ apiSecret: secret }),
      setPrimaryProvider: (provider) => set({ primaryProvider: provider }),
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
  primaryLoading: boolean;
  geminiLoading: boolean;
  synthesisLoading: boolean;
  primaryResult: AgentResult | null;
  geminiResult: AgentResult | null;
  synthesisResult: SynthesisResult | null;
  primaryError: string | null;
  geminiError: string | null;
  synthesisError: string | null;
  setQuery: (query: string) => void;
  setInputMode: (mode: "text" | "photo") => void;
  setImage: (base64: string | null, previewUrl: string | null) => void;
  setServingFraction: (fraction: number) => void;
  setServingGrams: (grams: number | null) => void;
  setServingDescription: (desc: string) => void;
  startAnalysis: () => void;
  setPrimaryResult: (result: AgentResult | null) => void;
  setGeminiResult: (result: AgentResult | null) => void;
  setSynthesisResult: (result: SynthesisResult | null) => void;
  setPrimaryError: (error: string | null) => void;
  setGeminiError: (error: string | null) => void;
  setSynthesisError: (error: string | null) => void;
  setPrimaryLoading: (loading: boolean) => void;
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
  primaryLoading: false,
  geminiLoading: false,
  synthesisLoading: false,
  primaryResult: null,
  geminiResult: null,
  synthesisResult: null,
  primaryError: null,
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
      primaryLoading: true,
      geminiLoading: true,
      synthesisLoading: false,
      primaryResult: null,
      geminiResult: null,
      synthesisResult: null,
      primaryError: null,
      geminiError: null,
      synthesisError: null,
    }),
  setPrimaryResult: (result) => set({ primaryResult: result, primaryLoading: false }),
  setGeminiResult: (result) => set({ geminiResult: result, geminiLoading: false }),
  setSynthesisResult: (result) =>
    set({ synthesisResult: result, synthesisLoading: false }),
  setPrimaryError: (error) => set({ primaryError: error, primaryLoading: false }),
  setGeminiError: (error) => set({ geminiError: error, geminiLoading: false }),
  setSynthesisError: (error) =>
    set({ synthesisError: error, synthesisLoading: false }),
  setPrimaryLoading: (loading) => set({ primaryLoading: loading }),
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
      primaryLoading: false,
      geminiLoading: false,
      synthesisLoading: false,
      primaryResult: null,
      geminiResult: null,
      synthesisResult: null,
      primaryError: null,
      geminiError: null,
      synthesisError: null,
    }),
}));

// History Store
interface HistoryState {
  entries: HistoryEntry[];
  selectedIds: Set<string>;
  addEntry: (entry: HistoryEntry) => void;
  updateEntry: (id: string, partial: Partial<HistoryEntry>) => void;
  removeEntry: (id: string) => void;
  removeEntries: (ids: string[]) => void;
  clearAll: () => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      selectedIds: new Set<string>(),
      addEntry: (entry) =>
        set((state) => ({ entries: [entry, ...state.entries] })),
      updateEntry: (id, partial) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...partial } : e
          ),
        })),
      removeEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
          selectedIds: (() => {
            const next = new Set(state.selectedIds);
            next.delete(id);
            return next;
          })(),
        })),
      removeEntries: (ids) =>
        set((state) => ({
          entries: state.entries.filter((e) => !ids.includes(e.id)),
          selectedIds: new Set<string>(),
        })),
      clearAll: () => set({ entries: [], selectedIds: new Set<string>() }),
      toggleSelect: (id) =>
        set((state) => {
          const next = new Set(state.selectedIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { selectedIds: next };
        }),
      selectAll: () =>
        set((state) => ({
          selectedIds: new Set(state.entries.map((e) => e.id)),
        })),
      clearSelection: () => set({ selectedIds: new Set<string>() }),
    }),
    {
      name: "gutsense-history",
      partialize: (state) => ({ entries: state.entries }),
    }
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
