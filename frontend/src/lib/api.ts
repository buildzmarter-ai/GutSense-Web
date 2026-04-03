import { AgentResult, AnalysisRequest, FeedbackRequest, SynthesisRequest, SynthesisResult } from "./types";

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("gutsense-settings");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.backendUrl) return parsed.state.backendUrl;
      } catch {
        // fall through
      }
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}

function getApiSecret(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("gutsense-settings");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.apiSecret) return parsed.state.apiSecret;
      } catch {
        // fall through
      }
    }
  }
  return "";
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  const secret = getApiSecret();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (secret) {
    headers["Authorization"] = `Bearer ${secret}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(`API Error ${res.status}: ${errorText}`);
  }

  return res.json();
}

// ── Analysis Endpoints ──────────────────────────────────────────────────────

export async function analyzeClaude(request: AnalysisRequest): Promise<AgentResult> {
  return apiFetch<AgentResult>("/analyze/claude", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function analyzeOpenAI(request: AnalysisRequest): Promise<AgentResult> {
  return apiFetch<AgentResult>("/analyze/openai", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function analyzeGemini(request: AnalysisRequest): Promise<AgentResult> {
  return apiFetch<AgentResult>("/analyze/gemini", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function synthesize(request: SynthesisRequest): Promise<SynthesisResult> {
  return apiFetch<SynthesisResult>("/synthesize", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function healthCheck(): Promise<{ status: string }> {
  return apiFetch<{ status: string }>("/health");
}

// ── Feedback ────────────────────────────────────────────────────────────────

export async function submitFeedback(feedback: FeedbackRequest): Promise<{ status: string }> {
  return apiFetch<{ status: string }>("/feedback", {
    method: "POST",
    body: JSON.stringify(feedback),
  });
}

// ── Credential Management ───────────────────────────────────────────────────

export interface CredentialsStatus {
  anthropic_api_key: boolean;
  google_api_key: boolean;
  openai_api_key: boolean;
  api_secret: boolean;
}

export interface CredentialUpdate {
  anthropic_api_key?: string;
  google_api_key?: string;
  openai_api_key?: string;
  api_secret?: string;
}

export async function getCredentialsStatus(): Promise<CredentialsStatus> {
  return apiFetch<CredentialsStatus>("/credentials/status");
}

export async function updateCredentials(creds: CredentialUpdate): Promise<{ status: string; updated: string }> {
  return apiFetch<{ status: string; updated: string }>("/credentials", {
    method: "PUT",
    body: JSON.stringify(creds),
  });
}

export async function validateCredential(provider: string): Promise<{ valid: boolean; message: string }> {
  return apiFetch<{ valid: boolean; message: string }>(`/credentials/validate/${provider}`);
}

// ── Source Site Credentials ─────────────────────────────────────────────────

export interface SourceSiteInfo {
  name: string;
  url: string;
  description: string;
  configured: boolean;
}

export interface SourceCredentialUpdate {
  source_id: string;
  username: string;
  password: string;
}

export async function getSourcesStatus(): Promise<Record<string, SourceSiteInfo>> {
  return apiFetch<Record<string, SourceSiteInfo>>("/sources/status");
}

export async function updateSourceCredential(cred: SourceCredentialUpdate): Promise<{ status: string; source: string }> {
  return apiFetch<{ status: string; source: string }>("/sources/credentials", {
    method: "PUT",
    body: JSON.stringify(cred),
  });
}

export async function removeSourceCredential(sourceId: string): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(`/sources/credentials/${sourceId}`, {
    method: "DELETE",
  });
}
