"use client";

import { useState, useCallback, useEffect } from "react";
import {
  CheckCircle, XCircle, Loader2, RefreshCw, KeyRound, Shield,
  Save, Globe, Trash2, ExternalLink, Zap, BadgeCheck,
} from "lucide-react";
import { useSettingsStore } from "@/lib/store";
import { PrimaryProvider } from "@/lib/types";
import {
  healthCheck, getCredentialsStatus, updateCredentials, validateCredential,
  getSourcesStatus, updateSourceCredential, removeSourceCredential,
  CredentialsStatus, SourceSiteInfo,
} from "@/lib/api";

const IBS_SUBTYPES = ["IBS-D", "IBS-C", "IBS-M", "IBS-U"];
const FODMAP_PHASES = ["Elimination", "Reintroduction", "Maintenance"];
const TRIGGER_OPTIONS = ["Fructans", "GOS", "Lactose", "Fructose", "Polyols"];
const SENSITIVITY_OPTIONS = ["FODMAP", "Wheat", "Gluten", "Nuts", "Dairy", "Soy"];
const PROVIDER_OPTIONS: { id: PrimaryProvider; label: string; description: string }[] = [
  { id: "anthropic", label: "Anthropic (Claude)", description: "Claude Sonnet for primary analysis" },
  { id: "openai", label: "OpenAI (GPT-4o)", description: "GPT-4o for primary analysis" },
];

export default function SettingsTab() {
  const { backendUrl, apiSecret, primaryProvider, profile, setBackendUrl, setApiSecret, setPrimaryProvider, setProfile } = useSettingsStore();

  // Health check
  const [healthStatus, setHealthStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [healthError, setHealthError] = useState("");

  // Credential status
  const [credStatus, setCredStatus] = useState<CredentialsStatus | null>(null);
  const [credLoading, setCredLoading] = useState(false);

  // API key inputs
  const [anthropicKey, setAnthropicKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  // Validation
  const [validating, setValidating] = useState<Record<string, boolean>>({});
  const [validationResults, setValidationResults] = useState<Record<string, { valid: boolean; message: string }>>({});

  // Source site credentials
  const [sourcesStatus, setSourcesStatus] = useState<Record<string, SourceSiteInfo> | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourceInputs, setSourceInputs] = useState<Record<string, { username: string; password: string }>>({});
  const [sourceSaveStatus, setSourceSaveStatus] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({});

  const [conditionsInput, setConditionsInput] = useState(profile.diagnosed_conditions.join(", "));
  const [safeFoodsInput, setSafeFoodsInput] = useState((profile.known_safe_foods || []).join(", "));
  const [medicationsInput, setMedicationsInput] = useState((profile.medications || []).join(", "));

  const loadCredStatus = useCallback(async () => {
    setCredLoading(true);
    try { setCredStatus(await getCredentialsStatus()); } catch { setCredStatus(null); } finally { setCredLoading(false); }
  }, []);

  const loadSourcesStatus = useCallback(async () => {
    setSourcesLoading(true);
    try { setSourcesStatus(await getSourcesStatus()); } catch { setSourcesStatus(null); } finally { setSourcesLoading(false); }
  }, []);

  useEffect(() => { loadCredStatus(); loadSourcesStatus(); }, [loadCredStatus, loadSourcesStatus]);

  const checkHealth = useCallback(async () => {
    setHealthStatus("loading"); setHealthError("");
    try { await healthCheck(); setHealthStatus("ok"); loadCredStatus(); loadSourcesStatus(); }
    catch (err) { setHealthStatus("error"); setHealthError(err instanceof Error ? err.message : "Connection failed"); }
  }, [loadCredStatus, loadSourcesStatus]);

  const handleValidate = useCallback(async (provider: string) => {
    setValidating((p) => ({ ...p, [provider]: true }));
    try {
      const result = await validateCredential(provider);
      setValidationResults((p) => ({ ...p, [provider]: result }));
    } catch (err) {
      setValidationResults((p) => ({ ...p, [provider]: { valid: false, message: err instanceof Error ? err.message : "Validation failed" } }));
    } finally {
      setValidating((p) => ({ ...p, [provider]: false }));
    }
  }, []);

  const saveCredentials = useCallback(async () => {
    setSaveStatus("saving"); setSaveError("");
    try {
      const update: Record<string, string> = {};
      if (anthropicKey) update.anthropic_api_key = anthropicKey;
      if (googleKey) update.google_api_key = googleKey;
      if (openaiKey) update.openai_api_key = openaiKey;
      if (secretKey) update.api_secret = secretKey;
      if (Object.keys(update).length === 0) { setSaveStatus("idle"); return; }
      await updateCredentials(update);
      setSaveStatus("saved");
      setAnthropicKey(""); setGoogleKey(""); setOpenaiKey(""); setSecretKey("");
      loadCredStatus();
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) { setSaveStatus("error"); setSaveError(err instanceof Error ? err.message : "Failed to save credentials"); }
  }, [anthropicKey, googleKey, openaiKey, secretKey, loadCredStatus]);

  const saveSourceCredential = useCallback(async (sourceId: string) => {
    const input = sourceInputs[sourceId];
    if (!input?.username || !input?.password) return;
    setSourceSaveStatus((prev) => ({ ...prev, [sourceId]: "saving" }));
    try {
      await updateSourceCredential({ source_id: sourceId, username: input.username, password: input.password });
      setSourceSaveStatus((prev) => ({ ...prev, [sourceId]: "saved" }));
      setSourceInputs((prev) => ({ ...prev, [sourceId]: { username: "", password: "" } }));
      loadSourcesStatus();
      setTimeout(() => setSourceSaveStatus((prev) => ({ ...prev, [sourceId]: "idle" })), 3000);
    } catch { setSourceSaveStatus((prev) => ({ ...prev, [sourceId]: "error" })); }
  }, [sourceInputs, loadSourcesStatus]);

  const deleteSourceCredential = useCallback(async (sourceId: string) => {
    setSourceSaveStatus((prev) => ({ ...prev, [sourceId]: "saving" }));
    try { await removeSourceCredential(sourceId); setSourceSaveStatus((prev) => ({ ...prev, [sourceId]: "idle" })); loadSourcesStatus(); }
    catch { setSourceSaveStatus((prev) => ({ ...prev, [sourceId]: "error" })); }
  }, [loadSourcesStatus]);

  const updateSourceInput = (sourceId: string, field: "username" | "password", value: string) => {
    setSourceInputs((prev) => ({ ...prev, [sourceId]: { ...prev[sourceId], [field]: value } }));
  };

  const toggleTrigger = (trigger: string) => {
    const current = profile.known_triggers;
    const updated = current.includes(trigger) ? current.filter((t) => t !== trigger) : [...current, trigger];
    setProfile({ known_triggers: updated });
  };

  const toggleSensitivity = (s: string) => {
    const current = profile.sensitivities || [];
    const updated = current.includes(s) ? current.filter((x) => x !== s) : [...current, s];
    setProfile({ sensitivities: updated });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h2>

      {/* Connection */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">Connection</h3>
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Backend URL</label>
            <input type="url" value={backendUrl} onChange={(e) => { setBackendUrl(e.target.value); setHealthStatus("idle"); }} placeholder="http://localhost:8000" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={checkHealth} disabled={healthStatus === "loading"} className="flex items-center gap-2 px-4 py-2 bg-[var(--color-gut-accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-gut-accent-hover)] disabled:opacity-50 transition-colors cursor-pointer">
              {healthStatus === "loading" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}Test Connection
            </button>
            {healthStatus === "ok" && <span className="flex items-center gap-1 text-sm text-[var(--color-gut-green)]"><CheckCircle size={16} />Connected</span>}
            {healthStatus === "error" && <span className="flex items-center gap-1 text-sm text-[var(--color-gut-red)]"><XCircle size={16} />{healthError}</span>}
          </div>
        </div>
      </section>

      {/* Primary Provider */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
          <span className="flex items-center gap-2"><Zap size={14} />Primary Provider</span>
        </h3>
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
          {PROVIDER_OPTIONS.map((p) => (
            <button key={p.id} onClick={() => setPrimaryProvider(p.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors cursor-pointer ${primaryProvider === p.id ? "bg-[var(--color-gut-accent)]/10 border border-[var(--color-gut-accent)]/30" : "bg-gray-50 dark:bg-gray-800 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${primaryProvider === p.id ? "border-[var(--color-gut-accent)]" : "border-gray-300 dark:border-gray-600"}`}>
                {primaryProvider === p.id && <div className="w-2 h-2 rounded-full bg-[var(--color-gut-accent)]" />}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{p.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{p.description}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* API Keys */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
          <span className="flex items-center gap-2"><KeyRound size={14} />API Keys<span className="flex items-center gap-1 text-[10px] font-normal normal-case text-gray-400"><Shield size={10} />Stored in macOS Keychain</span></span>
        </h3>
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
          {credStatus && (
            <div className="flex flex-wrap gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
              <StatusBadge label="Anthropic" configured={credStatus.anthropic_api_key} loading={credLoading} />
              <StatusBadge label="Google" configured={credStatus.google_api_key} loading={credLoading} />
              <StatusBadge label="OpenAI" configured={credStatus.openai_api_key} loading={credLoading} />
              <StatusBadge label="API Secret" configured={credStatus.api_secret} loading={credLoading} />
            </div>
          )}

          <KeyInputRow label="Anthropic API Key" value={anthropicKey} onChange={setAnthropicKey} placeholder={credStatus?.anthropic_api_key ? "Configured \u2014 enter new key to update" : "sk-ant-..."} provider="anthropic" onValidate={handleValidate} validating={validating.anthropic} validationResult={validationResults.anthropic} configured={credStatus?.anthropic_api_key} />
          <KeyInputRow label="Google (Gemini) API Key" value={googleKey} onChange={setGoogleKey} placeholder={credStatus?.google_api_key ? "Configured \u2014 enter new key to update" : "AIza..."} provider="google" onValidate={handleValidate} validating={validating.google} validationResult={validationResults.google} configured={credStatus?.google_api_key} />
          <KeyInputRow label="OpenAI API Key" value={openaiKey} onChange={setOpenaiKey} placeholder={credStatus?.openai_api_key ? "Configured \u2014 enter new key to update" : "sk-..."} provider="openai" onValidate={handleValidate} validating={validating.openai} validationResult={validationResults.openai} configured={credStatus?.openai_api_key} />

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">API Secret (optional — protects backend endpoints)</label>
            <input type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder={credStatus?.api_secret ? "Configured \u2014 enter new value to update" : "Leave empty to skip auth"} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50" />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={saveCredentials} disabled={saveStatus === "saving" || (!anthropicKey && !googleKey && !openaiKey && !secretKey)} className="flex items-center gap-2 px-4 py-2 bg-[var(--color-gut-accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-gut-accent-hover)] disabled:opacity-50 transition-colors cursor-pointer">
              {saveStatus === "saving" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Save to Keychain
            </button>
            {saveStatus === "saved" && <span className="flex items-center gap-1 text-sm text-[var(--color-gut-green)]"><CheckCircle size={16} />Saved securely</span>}
            {saveStatus === "error" && <span className="flex items-center gap-1 text-sm text-[var(--color-gut-red)]"><XCircle size={16} />{saveError}</span>}
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Keys are sent to the backend once and stored in macOS Keychain. They are never stored in the browser or on disk.</p>
        </div>
      </section>

      {/* Research Source Logins */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
          <span className="flex items-center gap-2"><Globe size={14} />Research Sources<span className="flex items-center gap-1 text-[10px] font-normal normal-case text-gray-400"><Shield size={10} />Logins stored in macOS Keychain</span></span>
        </h3>
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-5">
          <p className="text-xs text-gray-500 dark:text-gray-400">Add login credentials for research databases to enrich analysis with authoritative FODMAP data.</p>
          {sourcesLoading && <div className="flex items-center gap-2 text-xs text-gray-400"><Loader2 size={12} className="animate-spin" />Loading source status...</div>}
          {sourcesStatus && Object.entries(sourcesStatus).map(([sourceId, info]) => (
            <SourceCredentialCard key={sourceId} sourceId={sourceId} info={info} inputs={sourceInputs[sourceId] || { username: "", password: "" }} saveStatus={sourceSaveStatus[sourceId] || "idle"} onInputChange={updateSourceInput} onSave={saveSourceCredential} onDelete={deleteSourceCredential} />
          ))}
          {!sourcesStatus && !sourcesLoading && <p className="text-xs text-gray-400">Connect to the backend to see available research sources.</p>}
        </div>
      </section>

      {/* IBS Profile */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">IBS Profile</h3>
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">IBS Subtype</label>
            <select value={profile.ibs_subtype} onChange={(e) => setProfile({ ibs_subtype: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50">
              {IBS_SUBTYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">FODMAP Phase</label>
            <select value={profile.fodmap_phase} onChange={(e) => setProfile({ fodmap_phase: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50">
              {FODMAP_PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Sensitivities quick-select */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Sensitivities</label>
            <div className="flex flex-wrap gap-2">
              {SENSITIVITY_OPTIONS.map((s) => {
                const active = (profile.sensitivities || []).includes(s);
                return (
                  <button key={s} onClick={() => toggleSensitivity(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${active ? "bg-[var(--color-gut-accent)]/10 text-[var(--color-gut-accent)] border border-[var(--color-gut-accent)]/30" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent"}`}>
                    {active ? "\u2713 " : ""}{s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Known Triggers */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Known FODMAP Triggers</label>
            <div className="flex flex-wrap gap-2">
              {TRIGGER_OPTIONS.map((t) => {
                const active = profile.known_triggers.includes(t);
                return (
                  <button key={t} onClick={() => toggleTrigger(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${active ? "bg-[var(--color-gut-red)]/10 text-[var(--color-gut-red)] border border-[var(--color-gut-red)]/30" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent"}`}>
                    {active ? "\u2713 " : ""}{t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Safe foods */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Known Safe Foods (comma-separated)</label>
            <input type="text" value={safeFoodsInput} onChange={(e) => { setSafeFoodsInput(e.target.value); setProfile({ known_safe_foods: e.target.value.split(",").map((c) => c.trim()).filter(Boolean) }); }} placeholder="e.g. Rice, Carrots, Bananas" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50" />
          </div>

          {/* Medications */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Medications (comma-separated)</label>
            <input type="text" value={medicationsInput} onChange={(e) => { setMedicationsInput(e.target.value); setProfile({ medications: e.target.value.split(",").map((c) => c.trim()).filter(Boolean) }); }} placeholder="e.g. Omeprazole, Loperamide" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50" />
          </div>

          {/* Diagnosed conditions */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Diagnosed Conditions (comma-separated)</label>
            <input type="text" value={conditionsInput} onChange={(e) => { setConditionsInput(e.target.value); setProfile({ diagnosed_conditions: e.target.value.split(",").map((c) => c.trim()).filter(Boolean) }); }} placeholder="e.g. GERD, Celiac Disease" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50" />
          </div>
        </div>
      </section>

      {/* About */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">About</h3>
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Version</span>
            <span className="text-gray-900 dark:text-white font-medium">2.0.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Platform</span>
            <span className="text-gray-900 dark:text-white font-medium">Web</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">GutSense uses AI to analyze foods for FODMAP content. Results are informational — always consult your healthcare provider.</p>
        </div>
      </section>
    </div>
  );
}

/* ── Helper components ───────────────────────────────────────────────── */

function StatusBadge({ label, configured, loading }: { label: string; configured: boolean; loading: boolean }) {
  if (loading) return <span className="flex items-center gap-1.5 text-xs text-gray-400"><Loader2 size={12} className="animate-spin" />{label}</span>;
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${configured ? "text-[var(--color-gut-green)]" : "text-gray-400"}`}>
      {configured ? <CheckCircle size={12} /> : <XCircle size={12} />}{label}
    </span>
  );
}

function KeyInputRow({ label, value, onChange, placeholder, provider, onValidate, validating, validationResult, configured }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
  provider: string; onValidate: (p: string) => void; validating?: boolean;
  validationResult?: { valid: boolean; message: string }; configured?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <div className="flex gap-2">
        <input type="password" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50" />
        {configured && (
          <button onClick={() => onValidate(provider)} disabled={validating} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors cursor-pointer">
            {validating ? <Loader2 size={12} className="animate-spin" /> : <BadgeCheck size={12} />}Validate
          </button>
        )}
      </div>
      {validationResult && (
        <p className={`text-[11px] mt-1 ${validationResult.valid ? "text-[var(--color-gut-green)]" : "text-[var(--color-gut-red)]"}`}>
          {validationResult.valid ? "\u2713 " : "\u2717 "}{validationResult.message}
        </p>
      )}
    </div>
  );
}

function SourceCredentialCard({ sourceId, info, inputs, saveStatus, onInputChange, onSave, onDelete }: {
  sourceId: string; info: SourceSiteInfo; inputs: { username: string; password: string };
  saveStatus: "idle" | "saving" | "saved" | "error";
  onInputChange: (sourceId: string, field: "username" | "password", value: string) => void;
  onSave: (sourceId: string) => void; onDelete: (sourceId: string) => void;
}) {
  return (
    <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2"><h4 className="text-sm font-semibold text-gray-900 dark:text-white">{info.name}</h4><StatusBadge label="" configured={info.configured} loading={false} /></div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{info.description}</p>
        </div>
        <a href={info.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-[var(--color-gut-accent)] transition-colors"><ExternalLink size={10} />Visit</a>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Username / Email</label><input type="text" value={inputs.username} onChange={(e) => onInputChange(sourceId, "username", e.target.value)} placeholder={info.configured ? "Configured" : "Enter login"} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50" /></div>
        <div><label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Password</label><input type="password" value={inputs.password} onChange={(e) => onInputChange(sourceId, "password", e.target.value)} placeholder={info.configured ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "Enter password"} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gut-accent)]/50" /></div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onSave(sourceId)} disabled={saveStatus === "saving" || !inputs.username || !inputs.password} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-gut-accent)] text-white rounded-lg text-xs font-medium hover:bg-[var(--color-gut-accent-hover)] disabled:opacity-50 transition-colors cursor-pointer">{saveStatus === "saving" ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}Save to Keychain</button>
        {info.configured && <button onClick={() => onDelete(sourceId)} className="flex items-center gap-1.5 px-3 py-1.5 text-[var(--color-gut-red)] bg-[var(--color-gut-red)]/10 rounded-lg text-xs font-medium hover:bg-[var(--color-gut-red)]/20 transition-colors cursor-pointer"><Trash2 size={12} />Remove</button>}
        {saveStatus === "saved" && <span className="flex items-center gap-1 text-xs text-[var(--color-gut-green)]"><CheckCircle size={12} />Saved</span>}
        {saveStatus === "error" && <span className="flex items-center gap-1 text-xs text-[var(--color-gut-red)]"><XCircle size={12} />Failed</span>}
      </div>
    </div>
  );
}
