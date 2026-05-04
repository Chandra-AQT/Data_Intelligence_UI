import axios from "axios";

// Production backend URL — reads VITE_API_BASE env var set in Vercel
export const API_BASE_URL = (
  typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE
) || "http://127.0.0.1:8000/api/v1";

export type ProviderKey = "landingai" | "openai" | "chatgpt" | "anthropic" | "gemini" | "groq" | "grok" | "perplexity" | "emergence" | "ollama" | "python" | "none";

export const providers: Array<{ key: ProviderKey; label: string; model: string; needsKey?: boolean; needsBaseUrl?: boolean }> = [
  { key: "landingai", label: "Landing AI ADE", model: "dpt-2-latest", needsKey: true, needsBaseUrl: true },
  { key: "openai", label: "OpenAI GPT-4o", model: "gpt-4o-mini", needsKey: true },
  { key: "chatgpt", label: "ChatGPT", model: "gpt-4o-mini", needsKey: true },
  { key: "anthropic", label: "Anthropic Claude", model: "claude-3-5-haiku-20241022", needsKey: true },
  { key: "gemini", label: "Google Gemini", model: "gemini-1.5-flash", needsKey: true },
  { key: "groq", label: "Groq", model: "llama-3.1-8b-instant", needsKey: true },
  { key: "grok", label: "xAI Grok", model: "grok-beta", needsKey: true, needsBaseUrl: true },
  { key: "emergence", label: "Emergence AI", model: "em-llm-001", needsKey: true, needsBaseUrl: true },
  { key: "perplexity", label: "Perplexity AI", model: "llama-3.1-sonar-large-128k-online", needsKey: true },
  { key: "ollama", label: "Ollama Local", model: "llama3", needsBaseUrl: true },
  { key: "python", label: "Python Heuristic", model: "heuristic" },
  { key: "none", label: "None", model: "none" },
];

export const engineBadges = ["Landing AI ADE", "OpenAI GPT-4o", "Anthropic Claude", "Google Gemini", "Groq", "xAI Grok", "Perplexity AI", "Emergence AI", "Ollama (Local)", "Python Heuristic"];

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s — Render free tier cold start can take 30-50s
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("aqt_access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const refreshToken = window.localStorage.getItem("aqt_refresh_token");
      try {
        if (refreshToken) {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
          window.localStorage.setItem("aqt_access_token", data.access_token);
          if (data.refresh_token) window.localStorage.setItem("aqt_refresh_token", data.refresh_token);
          error.config.headers.Authorization = `Bearer ${data.access_token}`;
          return api.request(error.config);
        }
      } catch {
        clearAuth();
        window.location.href = "/login?expired=1";
      }
      clearAuth();
      window.location.href = "/login?expired=1";
    }
    return Promise.reject(error);
  },
);

export function isAuthenticated() {
  return typeof window !== "undefined" && Boolean(window.localStorage.getItem("aqt_access_token"));
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("aqt_user");
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function saveAuth(data: { access_token: string; refresh_token: string; user?: unknown }) {
  window.localStorage.setItem("aqt_access_token", data.access_token);
  window.localStorage.setItem("aqt_refresh_token", data.refresh_token);
  window.localStorage.setItem("aqt_user", JSON.stringify(data.user ?? {}));
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  // Clear auth tokens, user data, AND all stored API keys on logout
  const keysToRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith("aqt_")) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}

export function storedKey(provider: string) {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(`aqt_${provider}_key`) ?? "";
}

export function saveStoredKey(provider: string, value: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(`aqt_${provider}_key`, value);
}

export function gradeFor(score = 0) {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

export function qualityTone(score = 0) {
  if (score >= 90) return "success";
  if (score >= 75) return "primary";
  if (score >= 60) return "warning";
  if (score >= 45) return "orange";
  return "destructive";
}

export function confidenceTone(confidence?: number | null) {
  if (!confidence) return "low";
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.5) return "mid";
  return "low";
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}


