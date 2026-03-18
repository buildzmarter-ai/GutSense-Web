"use client";

import { useState, useCallback, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  KeyRound,
  Shield,
  Save,
  Globe,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useSettingsStore } from "@/lib/store";
import {
  healthCheck,
  getCredentialsStatus,
  updateCredentials,
  getSourcesStatus,
  updateSourceCredential,
  removeSourceCredential,
  CredentialsStatus,
  SourceSiteInfo,
} from "@/lib/api";

const IBS_SUBTYPES = ["IBS-D", "IBS-C", "IBS-M", "IBS-U"];
const FODMAP_PHASES = ["Elimination", "Reintroduction", "Maintenance"];
const TRIGGER_OPTIONS = ["Fructans", "GOS", "Lactose", "Fructose", "Polyols"];

export default function SettingsTab() {
  const {
    backendUrl,
    apiSecret,
    profile,
    setBackendUrl,
    setApiSecret,
    setProfile,
  } = useSettingsStore();

  // Health check
  const [healthStatus, setHealthStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [healthError, setHealthError] = useState("");

  // Credential status from Keychain
  const [credStatus, setCredStatus] = useState<CredentialsStatus | null>(null);
  const [credLoading, setCredLoading] = useState(false);

  // API key inputs (only sent to backend, never stored in browser)
  const [anthropicKey, setAnthropicKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState("");

  // Source site credentials
  const [sourcesStatus, setSourcesStatus] = useState<Record<string, SourceSiteInfo> | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourceInputs, setSourceInputs] = useState<Record<string, { username: string; password: string }>>({});
  const [sourceSaveStatus, setSourceSaveStatus] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({});

  const [conditionsInput, setConditionsInput] = useState(
    profile.diagnosed_conditions.join(", ")
  );

  // Load credential status on mount and when backend URL changes
  const loadCredStatus = useCallback(async () => {
    setCredLoading(true);
    try {
      const status = await getCredentialsStatus();
      setCredStatus(status);
    } catch {
      setCredStatus(null);
    } finally {
      setCredLoading(false);
    }
  }, []);

  const loadSourcesStatus = useCallback(async () => {
    setSourcesLoading(true);
    try {
      const status = await getSourcesStatus();
      setSourcesStatus(status);
    } catch {
      setSourcesStatus(null);
    } finally {
      setSourcesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCredStatus();
    loadSourcesStatus();
  }, [loadCredStatus, loadSourcesStatus]);

  const checkHealth = useCallback(async () => {
    setHealthStatus("loading");
    setHealthError("");
    try {
      await healthCheck();
      setHealthStatus("ok");
      loadCredStatus();
      loadSourcesStatus();
    } catch (err) {
      setHealthStatus("error");
      setHealthError(
        err instanceof Error ? err.message : "Connection failed"
      );
    }
  }, [loadCredStatus, loadSourcesStatus]);

  const saveCredentials = useCallback(async () => {
    setSaveStatus("saving");
    setSaveError("");
    try {
      const update: Record<string, string> = {};
      if (anthropicKey) update.anthropic_api_key = anthropicKey;
      if (googleKey) update.google_api_key = googleKey;
      if (secretKey) update.api_secret = secretKey;

      if (Object.keys(update).length === 0) {
        setSaveStatus("idle");
        return;
      }

      await updateCredentials(update);
      setSaveStatus("saved");

      // Clear inputs after successful save
      setAnthropicKey("");
      setGoogleKey("");
      setSecretKey("");

      // Refresh status
      loadCredStatus();

      // Reset status after 3s
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveStatus("error");
      setSaveError(
        err instanceof Error ? err.message : "Failed to save credentials"
      );
    }
  }, [anthropicKey, googleKey, secretKey, loadCredStatus]);

  const saveSourceCredential = useCallback(async (sourceId: string) => {
    const input = sourceInputs[sourceId];
    if (!input?.username || !input?.password) return;

    setSourceSaveStatus((prev) => ({ ...prev, [sourceId]: "saving" }));
    try {
      await updateSourceCredential({
        source_id: sourceId,
        username: input.username,
        password: input.password,
      });
      setSourceSaveStatus((prev) => ({ ...prev, [sourceId]: "saved" }));
      setSourceInputs((prev) => ({ ...prev, [sourceId]: { username: "", password: "" } }));
      loadSourcesStatus();
      setTimeout(() => setSourceSaveStatus((prev) => ({ ...prev, [sourceId]: "idle" })), 3000);
    } catch {
      setSourceSaveStatus((prev) => ({ ...prev, [sourceId]: "error" }));
    }
  }, [sourceInputs, loadSourcesStatus]);

  const deleteSourceCredential = useCallback(async (sourceId: string) => {
    setSourceSaveStatus((prev) => ({ ...prev, [sourceId]: "saving" }));
    try {
      await removeSourceCredential(sourceId);
      setSourceSaveStatus((prev) => ({ ...prev, [sourceId]: "idle" }));
      loadSourcesStatus();
    } catch {
      setSourceSaveStatus((prev) => ({ ...prev, [sourceId]: "error" }));
    }
  }, [loadSourcesStatus]);

  const updateSourceInput = (sourceId: string, field: "username" | "password", value: string) => {
    setSourceInputs((prev) => ({
      ...prev,
      [sourceId]: { ...prev[sourceId], [field]: value },
    }));
  };

  const toggleTrigger = (trigger: string) => {
    const current = profile.known_triggers;
    const updated = current.includes(trigger)
      ? current.filter((t) => t !== trigger)
      : [...current, trigger];
    setProfile({ known_triggers: updated });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Settings
      </h2>

      {/* Connection */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
          Connection
        </h3>
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Backend URL
            </label>
            <input
              type="url"
              value={backendUrl}
              onChange={(e) => {
                setBackendUrl(e.target.value);
                setHealthStatus("idle");
              }}
              placeholder="http://localhost:8000"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D83A8]/50"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={checkHealth}
              disabled={healthStatus === "loading"}
              className="flex items-center gap-2 px-4 py-2 bg-[#2D83A8] text-white rounded-lg text-sm font-medium hover:bg-[#256d8c] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {healthStatus === "loading" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Test Connection
            </button>
            {healthStatus === "ok" && (
              <span className="flex items-center gap-1 text-sm text-[#2ecc71]">
                <CheckCircle size={16} />
                Connected
              </span>
            )}
            {healthStatus === "error" && (
              <span className="flex items-center gap-1 text-sm text-[#e74c3c]">
                <XCircle size={16} />
                {healthError}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* API Keys — stored in macOS Keychain */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
          <span className="flex items-center gap-2">
            <KeyRound size={14} />
            API Keys
            <span className="flex items-center gap-1 text-[10px] font-normal normal-case text-gray-400">
              <Shield size={10} />
              Stored in macOS Keychain
            </span>
          </span>
        </h3>
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
          {/* Status indicators */}
          {credStatus && (
            <div className="flex flex-wrap gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
              <StatusBadge
                label="Anthropic"
                configured={credStatus.anthropic_api_key}
                loading={credLoading}
              />
              <StatusBadge
                label="Google"
                configured={credStatus.google_api_key}
                loading={credLoading}
              />
              <StatusBadge
                label="API Secret"
                configured={credStatus.api_secret}
                loading={credLoading}
              />
            </div>
          )}

          {/* Anthropic API Key */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Anthropic API Key
            </label>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder={
                credStatus?.anthropic_api_key
                  ? "Configured \u2014 enter new key to update"
                  : "sk-ant-..."
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D83A8]/50"
            />
          </div>

          {/* Google API Key */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Google (Gemini) API Key
            </label>
            <input
              type="password"
              value={googleKey}
              onChange={(e) => setGoogleKey(e.target.value)}
              placeholder={
                credStatus?.google_api_key
                  ? "Configured \u2014 enter new key to update"
                  : "AIza..."
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D83A8]/50"
            />
          </div>

          {/* API Secret (optional auth) */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              API Secret (optional \u2014 protects backend endpoints)
            </label>
            <input
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder={
                credStatus?.api_secret
                  ? "Configured \u2014 enter new value to update"
                  : "Leave empty to skip auth"
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D83A8]/50"
            />
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              onClick={saveCredentials}
              disabled={
                saveStatus === "saving" ||
                (!anthropicKey && !googleKey && !secretKey)
              }
              className="flex items-center gap-2 px-4 py-2 bg-[#2D83A8] text-white rounded-lg text-sm font-medium hover:bg-[#256d8c] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {saveStatus === "saving" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Save to Keychain
            </button>
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-sm text-[#2ecc71]">
                <CheckCircle size={16} />
                Saved securely
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1 text-sm text-[#e74c3c]">
                <XCircle size={16} />
                {saveError}
              </span>
            )}
          </div>

          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            Keys are sent to the backend once and stored in macOS Keychain.
            They are never stored in the browser or on disk.
          </p>
        </div>
      </section>

      {/* Research Source Logins — stored in macOS Keychain */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
          <span className="flex items-center gap-2">
            <Globe size={14} />
            Research Sources
            <span className="flex items-center gap-1 text-[10px] font-normal normal-case text-gray-400">
              <Shield size={10} />
              Logins stored in macOS Keychain
            </span>
          </span>
        </h3>
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-5">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Add login credentials for research databases to enrich analysis with
            authoritative FODMAP data. Credentials are stored securely in macOS
            Keychain and never leave your machine.
          </p>

          {sourcesLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Loader2 size={12} className="animate-spin" />
              Loading source status...
            </div>
          )}

          {sourcesStatus &&
            Object.entries(sourcesStatus).map(([sourceId, info]) => (
              <SourceCredentialCard
                key={sourceId}
                sourceId={sourceId}
                info={info}
                inputs={sourceInputs[sourceId] || { username: "", password: "" }}
                saveStatus={sourceSaveStatus[sourceId] || "idle"}
                onInputChange={updateSourceInput}
                onSave={saveSourceCredential}
                onDelete={deleteSourceCredential}
              />
            ))}

          {!sourcesStatus && !sourcesLoading && (
            <p className="text-xs text-gray-400">
              Connect to the backend to see available research sources.
            </p>
          )}
        </div>
      </section>

      {/* IBS Profile */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
          IBS Profile
        </h3>
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
          {/* Subtype */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              IBS Subtype
            </label>
            <select
              value={profile.ibs_subtype}
              onChange={(e) => setProfile({ ibs_subtype: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D83A8]/50"
            >
              {IBS_SUBTYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Phase */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              FODMAP Phase
            </label>
            <select
              value={profile.fodmap_phase}
              onChange={(e) => setProfile({ fodmap_phase: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D83A8]/50"
            >
              {FODMAP_PHASES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Triggers */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Known Triggers
            </label>
            <div className="flex flex-wrap gap-2">
              {TRIGGER_OPTIONS.map((t) => {
                const active = profile.known_triggers.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTrigger(t)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      active
                        ? "bg-[#e74c3c]/10 text-[#e74c3c] border border-[#e74c3c]/30"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent"
                    }`}
                  >
                    {active ? "\u2713 " : ""}
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Diagnosed conditions */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Diagnosed Conditions (comma-separated)
            </label>
            <input
              type="text"
              value={conditionsInput}
              onChange={(e) => {
                setConditionsInput(e.target.value);
                const conditions = e.target.value
                  .split(",")
                  .map((c) => c.trim())
                  .filter(Boolean);
                setProfile({ diagnosed_conditions: conditions });
              }}
              placeholder="e.g. GERD, Celiac Disease"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D83A8]/50"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({
  label,
  configured,
  loading,
}: {
  label: string;
  configured: boolean;
  loading: boolean;
}) {
  if (loading) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-gray-400">
        <Loader2 size={12} className="animate-spin" />
        {label}
      </span>
    );
  }
  return (
    <span
      className={`flex items-center gap-1.5 text-xs font-medium ${
        configured
          ? "text-[#2ecc71]"
          : "text-gray-400"
      }`}
    >
      {configured ? <CheckCircle size={12} /> : <XCircle size={12} />}
      {label}
    </span>
  );
}

function SourceCredentialCard({
  sourceId,
  info,
  inputs,
  saveStatus,
  onInputChange,
  onSave,
  onDelete,
}: {
  sourceId: string;
  info: SourceSiteInfo;
  inputs: { username: string; password: string };
  saveStatus: "idle" | "saving" | "saved" | "error";
  onInputChange: (sourceId: string, field: "username" | "password", value: string) => void;
  onSave: (sourceId: string) => void;
  onDelete: (sourceId: string) => void;
}) {
  return (
    <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              {info.name}
            </h4>
            <StatusBadge label="" configured={info.configured} loading={false} />
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            {info.description}
          </p>
        </div>
        <a
          href={info.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-[#2D83A8] transition-colors"
        >
          <ExternalLink size={10} />
          Visit
        </a>
      </div>

      {/* Login inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
            Username / Email
          </label>
          <input
            type="text"
            value={inputs.username}
            onChange={(e) => onInputChange(sourceId, "username", e.target.value)}
            placeholder={info.configured ? "Configured" : "Enter login"}
            className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D83A8]/50"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
            Password
          </label>
          <input
            type="password"
            value={inputs.password}
            onChange={(e) => onInputChange(sourceId, "password", e.target.value)}
            placeholder={info.configured ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "Enter password"}
            className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D83A8]/50"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSave(sourceId)}
          disabled={saveStatus === "saving" || !inputs.username || !inputs.password}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2D83A8] text-white rounded-lg text-xs font-medium hover:bg-[#256d8c] disabled:opacity-50 transition-colors cursor-pointer"
        >
          {saveStatus === "saving" ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Save size={12} />
          )}
          Save to Keychain
        </button>
        {info.configured && (
          <button
            onClick={() => onDelete(sourceId)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[#e74c3c] bg-[#e74c3c]/10 rounded-lg text-xs font-medium hover:bg-[#e74c3c]/20 transition-colors cursor-pointer"
          >
            <Trash2 size={12} />
            Remove
          </button>
        )}
        {saveStatus === "saved" && (
          <span className="flex items-center gap-1 text-xs text-[#2ecc71]">
            <CheckCircle size={12} />
            Saved
          </span>
        )}
        {saveStatus === "error" && (
          <span className="flex items-center gap-1 text-xs text-[#e74c3c]">
            <XCircle size={12} />
            Failed
          </span>
        )}
      </div>
    </div>
  );
}
