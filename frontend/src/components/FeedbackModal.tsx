"use client";

import { useState } from "react";
import { X, ThumbsUp, ThumbsDown, Send, Loader2 } from "lucide-react";
import { submitFeedback } from "@/lib/api";
import { sendTelemetry } from "@/lib/telemetry";

interface FeedbackModalProps {
  query?: string;
  onClose: () => void;
}

const ANALYSIS_TYPES = [
  { id: "primary", label: "Primary Agent" },
  { id: "gemini", label: "Gemini" },
  { id: "synthesis", label: "Synthesis" },
] as const;

const REASONS = [
  "Incorrect FODMAP tier",
  "Missing ingredient",
  "Wrong probability",
  "Inaccurate enzyme advice",
  "Helpful and accurate",
  "Other",
];

export default function FeedbackModal({ query, onClose }: FeedbackModalProps) {
  const [analysisType, setAnalysisType] = useState<string>("synthesis");
  const [isPositive, setIsPositive] = useState<boolean | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
    if (isPositive === null) return;
    setSubmitting(true);
    try {
      await submitFeedback({
        analysis_type: analysisType as "primary" | "gemini" | "synthesis",
        is_positive: isPositive,
        reason,
        query,
      });

      sendTelemetry({
        app: "gutsense-web",
        lane: "gut-health",
        eventType: "feedback_submitted",
        metadata: {
          analysis_type: analysisType,
          sentiment: isPositive ? "positive" : "negative",
          reason: reason || "",
          has_query: !!query,
          has_reason: !!reason.trim(),
        },
      });

      setSubmitted(true);
      setTimeout(onClose, 1500);
    } catch {
      // Still close on error — feedback is best-effort
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
        >
          <X size={20} />
        </button>

        {submitted ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--color-gut-green)]/10 flex items-center justify-center">
              <ThumbsUp size={24} className="text-[var(--color-gut-green)]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Thanks for the feedback!
            </h3>
            <p className="text-sm text-gray-500 mt-1">Anonymous, no PII collected.</p>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Analysis Feedback
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              Anonymous feedback — no personal information collected.
            </p>

            {/* Analysis type */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Which analysis?
              </label>
              <div className="flex gap-2">
                {ANALYSIS_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setAnalysisType(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      analysisType === t.id
                        ? "bg-[var(--color-gut-accent)]/10 text-[var(--color-gut-accent)] border border-[var(--color-gut-accent)]/30"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Thumbs */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Was this helpful?
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsPositive(true)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    isPositive === true
                      ? "bg-[var(--color-gut-green)]/10 text-[var(--color-gut-green)] border border-[var(--color-gut-green)]/30"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent"
                  }`}
                >
                  <ThumbsUp size={16} />
                  Yes
                </button>
                <button
                  onClick={() => setIsPositive(false)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    isPositive === false
                      ? "bg-[var(--color-gut-red)]/10 text-[var(--color-gut-red)] border border-[var(--color-gut-red)]/30"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent"
                  }`}
                >
                  <ThumbsDown size={16} />
                  No
                </button>
              </div>
            </div>

            {/* Reason */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Reason (optional)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      reason === r
                        ? "bg-[var(--color-gut-accent)]/10 text-[var(--color-gut-accent)]"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Add more detail..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50 resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isPositive === null || submitting}
              className="w-full py-2.5 rounded-xl bg-[var(--color-gut-accent)] text-white font-medium text-sm hover:bg-[var(--color-gut-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Submit Feedback
            </button>
          </>
        )}
      </div>
    </div>
  );
}
