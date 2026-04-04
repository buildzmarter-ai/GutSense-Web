"use client";

import { useCallback } from "react";
import { Type, Camera, Loader2, FlaskConical } from "lucide-react";
import { useAnalysisStore, useHistoryStore, useSettingsStore, useSourcesStore } from "@/lib/store";
import { analyzeClaude, analyzeOpenAI, analyzeGemini, synthesize } from "@/lib/api";
import { AnalysisRequest, HistoryEntry, UserSourceDTO } from "@/lib/types";
import ServingSelector from "./ServingSelector";
import ExampleQueries from "./ExampleQueries";
import ResultsView from "./ResultsView";
import { sendTelemetry } from "@/lib/telemetry";

/** Compress a data URL to a small JPEG thumbnail (max 120px) for localStorage */
function createThumbnail(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 120;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export default function AnalyzeTab() {
  const analysis = useAnalysisStore();
  const profile = useSettingsStore((s) => s.profile);
  const primaryProvider = useSettingsStore((s) => s.primaryProvider);
  const sources = useSourcesStore((s) => s.sources);
  const addHistory = useHistoryStore((s) => s.addEntry);

  const hasInput =
    analysis.inputMode === "text"
      ? analysis.query.trim().length > 0
      : analysis.imageBase64 !== null;

  const handleImageUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        analysis.setImage(base64, result);
      };
      reader.readAsDataURL(file);
    },
    [analysis]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        handleImageUpload(file);
      }
    },
    [handleImageUpload]
  );

  const runAnalysis = useCallback(async () => {
    sendTelemetry({
      app: "gutsense-web",
      lane: "gut-health",
      eventType: "food_analysis_started",
      route: "/",
      metadata: {
        provider: primaryProvider,
        input_mode: analysis.inputMode,
        has_image: analysis.imageBase64 !== null,
        has_query: analysis.query.trim().length > 0,
        serving_fraction: analysis.servingFraction,
        serving_grams: analysis.servingGrams ?? null,
        has_user_sources: sources.length > 0,
      },
    });

    analysis.startAnalysis();

    const userSourceDTOs: UserSourceDTO[] | undefined =
      sources.length > 0
        ? sources.map((s) => ({
            title: s.title,
            raw_text: s.content,
            is_anecdotal: s.source_type === "anecdotal",
            source_url: s.url,
          }))
        : undefined;

    const request: AnalysisRequest = {
      query:
        analysis.inputMode === "photo" && !analysis.query.trim()
          ? "Analyze the food shown in this image for FODMAP content and IBS risk."
          : analysis.query,
      serving_fraction: analysis.servingFraction,
      serving_amount_g: analysis.servingGrams ?? undefined,
      serving_description: analysis.servingDescription || undefined,
      image_base64: analysis.imageBase64 ?? undefined,
      image_media_type: analysis.imageBase64 ? "image/jpeg" : undefined,
      user_profile: profile,
      user_sources: userSourceDTOs,
    };

    const historyId = crypto.randomUUID();
    const historyQuery = request.query;
    const historyThumbnail = analysis.imagePreviewUrl
      ? await createThumbnail(analysis.imagePreviewUrl)
      : undefined;
    let primaryRes = null;
    let geminiRes = null;

    // Select primary analyzer based on provider setting
    const analyzePrimary =
      primaryProvider === "openai" ? analyzeOpenAI : analyzeClaude;

    // Fire both in parallel
    const primaryPromise = analyzePrimary(request)
      .then((r) => {
        primaryRes = r;
        analysis.setPrimaryResult(r);
        return r;
      })
      .catch((err) => {
        analysis.setPrimaryError(err.message);
        return null;
      });

    const geminiPromise = analyzeGemini(request)
      .then((r) => {
        geminiRes = r;
        analysis.setGeminiResult(r);
        return r;
      })
      .catch((err) => {
        analysis.setGeminiError(err.message);
        return null;
      });

    const [primary, gemini] = await Promise.all([primaryPromise, geminiPromise]);

    const isComplete = !!(primary && gemini);

    // Synthesize if both succeeded
    if (primary && gemini) {
      analysis.setSynthesisLoading(true);
      try {
        const synthResult = await synthesize({
          primary_result: primary,
          gemini_result: gemini,
        });
        analysis.setSynthesisResult(synthResult);

        sendTelemetry({
          app: "gutsense-web",
          lane: "gut-health",
          eventType: "food_analysis_completed",
          route: "/",
          metadata: {
            provider: primaryProvider,
            input_mode: analysis.inputMode,
            result_type: "success",
            synthesis: true,
            final_probability: synthResult.final_ibs_probability,
          },
        });

        const entry: HistoryEntry = {
          id: historyId,
          query: historyQuery,
          timestamp: new Date().toISOString(),
          serving_description: analysis.servingDescription || undefined,
          image_thumbnail: historyThumbnail,
          input_mode: analysis.inputMode,
          primary_result: primary,
          gemini_result: gemini,
          synthesis_result: synthResult,
          final_probability: synthResult.final_ibs_probability,
          isComplete: true,
        };
        addHistory(entry);
      } catch (err) {
        analysis.setSynthesisError(
          err instanceof Error ? err.message : "Synthesis failed"
        );

        sendTelemetry({
          app: "gutsense-web",
          lane: "gut-health",
          eventType: "food_analysis_completed",
          route: "/",
          metadata: {
            provider: primaryProvider,
            input_mode: analysis.inputMode,
            result_type: "partial_success",
            synthesis: false,
            primary_ok: !!primaryRes,
            gemini_ok: !!geminiRes,
          },
        });

        const entry: HistoryEntry = {
          id: historyId,
          query: historyQuery,
          timestamp: new Date().toISOString(),
          image_thumbnail: historyThumbnail,
          input_mode: analysis.inputMode,
          primary_result: primaryRes ?? undefined,
          gemini_result: geminiRes ?? undefined,
          final_probability:
            primary?.ibs_trigger_probability ??
            gemini?.ibs_trigger_probability ??
            0,
          isComplete: false,
        };
        addHistory(entry);
      }
    } else {
      sendTelemetry({
        app: "gutsense-web",
        lane: "gut-health",
        eventType: "food_analysis_completed",
        route: "/",
        metadata: {
          provider: primaryProvider,
          input_mode: analysis.inputMode,
          result_type: "incomplete",
          primary_ok: !!primaryRes,
          gemini_ok: !!geminiRes,
          is_complete: isComplete,
        },
      });

      // Partial save — incomplete
      const entry: HistoryEntry = {
        id: historyId,
        query: historyQuery,
        timestamp: new Date().toISOString(),
        image_thumbnail: historyThumbnail,
        input_mode: analysis.inputMode,
        primary_result: primaryRes ?? undefined,
        gemini_result: geminiRes ?? undefined,
        final_probability:
          primary?.ibs_trigger_probability ??
          gemini?.ibs_trigger_probability ??
          0,
        isComplete: false,
      };
      addHistory(entry);
    }
  }, [analysis, profile, primaryProvider, sources, addHistory]);

  if (analysis.showResults) {
    return (
      <div>
        <button
          onClick={() => analysis.reset()}
          className="mb-4 text-sm text-[var(--color-gut-accent)] hover:underline cursor-pointer"
        >
          &larr; New Analysis
        </button>
        <ResultsView />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        Analyze Food
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Enter a food query or upload a photo for FODMAP analysis.
      </p>

      {/* Input mode toggle */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-4">
        <button
          onClick={() => analysis.setInputMode("text")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            analysis.inputMode === "text"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <Type size={16} />
          Text
        </button>
        <button
          onClick={() => analysis.setInputMode("photo")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            analysis.inputMode === "photo"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <Camera size={16} />
          Photo
        </button>
      </div>

      {/* Text input */}
      {analysis.inputMode === "text" && (
        <textarea
          value={analysis.query}
          onChange={(e) => analysis.setQuery(e.target.value)}
          placeholder="Describe your food or meal, e.g. 'garlic bread with butter and parsley'"
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50 resize-none"
        />
      )}

      {/* Photo input */}
      {analysis.inputMode === "photo" && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-[var(--color-gut-accent)] transition-colors"
        >
          {analysis.imagePreviewUrl ? (
            <div className="space-y-3">
              <img
                src={analysis.imagePreviewUrl}
                alt="Food preview"
                className="max-h-48 mx-auto rounded-lg"
              />
              <button
                onClick={() => analysis.setImage(null, null)}
                className="text-sm text-[var(--color-gut-red)] hover:underline cursor-pointer"
              >
                Remove image
              </button>
              <textarea
                value={analysis.query}
                onChange={(e) => analysis.setQuery(e.target.value)}
                placeholder="Add a question about this food (optional)"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50 resize-none"
              />
            </div>
          ) : (
            <label className="cursor-pointer">
              <Camera size={32} className="mx-auto mb-3 text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Drag and drop a food photo, or click to upload
              </p>
              <p className="text-xs text-gray-400">
                JPG, PNG, or HEIC
              </p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
            </label>
          )}
        </div>
      )}

      {/* Serving selector */}
      {hasInput && <ServingSelector />}

      {/* Analyze button */}
      <button
        disabled={!hasInput || analysis.isAnalyzing}
        onClick={runAnalysis}
        className="mt-4 w-full py-3 rounded-xl bg-[var(--color-gut-accent)] text-white font-medium text-sm hover:bg-[var(--color-gut-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        {analysis.isAnalyzing ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <FlaskConical size={18} />
            Analyze Food
          </>
        )}
      </button>

      {/* Examples */}
      {!hasInput && (
        <ExampleQueries onSelect={(q) => analysis.setQuery(q)} />
      )}
    </div>
  );
}
