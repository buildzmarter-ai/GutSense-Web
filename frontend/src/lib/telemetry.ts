const TELEMETRY_ENDPOINT = "https://industriallystrong.com/api/telemetry";

function getOrCreateId(storage: Storage, key: string, prefix: string): string {
  let value = storage.getItem(key);
  if (!value) {
    value = `${prefix}_${crypto.randomUUID()}`;
    storage.setItem(key, value);
  }
  return value;
}

function getVisitorId(): string {
  return getOrCreateId(localStorage, "telemetry_visitor_id", "vis");
}

function getSessionId(): string {
  return getOrCreateId(sessionStorage, "telemetry_session_id", "sess");
}

function normalizeReferrer(referrer: string): string {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("linkedin.com")) return "linkedin";
    if (host.includes("google.")) return "google";
    if (host.includes("chatgpt.com")) return "chatgpt";
    if (host.includes("bing.com")) return "bing";
    if (host.includes("x.com") || host.includes("twitter.com")) return "x";
    if (host.includes("facebook.com")) return "facebook";
    if (host.includes("reddit.com")) return "reddit";
    if (host.includes("github.com")) return "github";
    return host || "unknown";
  } catch {
    return "unknown";
  }
}

function getUtmFields() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_content: params.get("utm_content") || "",
  };
}

type SendTelemetryArgs = {
  app: "gutsense-web";
  lane: "gut-health";
  eventType:
    | "page_view"
    | "food_analysis_started"
    | "food_analysis_completed"
    | "provider_selected"
    | "feedback_submitted";
  route?: string;
  title?: string;
  metadata?: Record<string, unknown>;
};

export async function sendTelemetry({
  app,
  lane,
  eventType,
  route = window.location.pathname,
  title = document.title,
  metadata = {},
}: SendTelemetryArgs): Promise<void> {
  const payload = {
    app,
    lane,
    event_type: eventType,
    route,
    title,
    referrer: document.referrer || "",
    referrer_source: normalizeReferrer(document.referrer || ""),
    session_id: getSessionId(),
    visitor_id: getVisitorId(),
    metadata: {
      ...metadata,
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight,
    },
    ...getUtmFields(),
  };

  try {
    await fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "omit",
    });
  } catch (err) {
    console.error("telemetry send failed", err);
  }
}
