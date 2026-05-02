import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { User, Shield, Key, Info, Eye, EyeOff, Loader2 } from "lucide-react";
import { API_BASE_URL, engineBadges, getUser, saveAuth, saveStoredKey, storedKey, api } from "@/lib/aqt";
import { AppShell } from "@/components/aqt/app-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings")({ component: Settings });

const CARD = { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" } as const;
const INPUT = { backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc" } as const;

const PROVIDER_KEYS = [
  { key: "openai", label: "OpenAI", placeholder: "sk-..." },
  { key: "landingai", label: "Landing AI", placeholder: "land_sk_..." },
  { key: "anthropic", label: "Anthropic", placeholder: "sk-ant-..." },
  { key: "groq", label: "Groq", placeholder: "gsk_..." },
  { key: "gemini", label: "Google Gemini", placeholder: "AIza..." },
  { key: "grok", label: "xAI Grok", placeholder: "xai-..." },
  { key: "perplexity", label: "Perplexity AI", placeholder: "pplx-..." },
  { key: "emergence", label: "Emergence AI", placeholder: "em-..." },
];

function ApiKeyRow({ providerKey, label, placeholder }: { providerKey: string; label: string; placeholder: string }) {
  const [value, setValue] = useState(storedKey(providerKey));
  const [show, setShow] = useState(false);

  const save = () => {
    saveStoredKey(providerKey, value);
    toast.success(`${label} key saved`);
  };
  const clear = () => {
    setValue("");
    saveStoredKey(providerKey, "");
    toast.success(`${label} key cleared`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="w-32 text-sm font-bold text-white shrink-0">{label}</span>
      <div className="relative flex-1 min-w-[200px]">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full h-9 rounded-lg px-3 pr-9 text-sm font-mono"
          style={INPUT}
        />
        <button
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" onClick={save} style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)", border: "none" }} className="font-black text-white">
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={clear}>Clear</Button>
      </div>
    </div>
  );
}

function Settings() {
  const [tab, setTab] = useState("Profile");
  const user = getUser() ?? { full_name: "AQT Operator", email: "operator@aqt.ai" };
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const profileMut = useMutation({
    mutationFn: () => api.put("/auth/me", { full_name: fullName }),
    onSuccess: (res) => {
      const updated = res.data.user ?? res.data;
      saveAuth({ access_token: localStorage.getItem("aqt_access_token") ?? "", refresh_token: localStorage.getItem("aqt_refresh_token") ?? "", user: updated });
      toast.success("Profile updated");
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const passwordMut = useMutation({
    mutationFn: () => api.put("/auth/me", { current_password: currentPw, new_password: newPw }),
    onSuccess: () => {
      toast.success("Password updated");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    },
    onError: (err: { response?: { data?: { detail?: string } } }) =>
      toast.error(err.response?.data?.detail ?? "Failed to update password"),
  });

  const handlePasswordSave = () => {
    if (!currentPw) return toast.error("Enter your current password");
    if (newPw.length < 8) return toast.error("New password must be at least 8 characters");
    if (newPw !== confirmPw) return toast.error("Passwords don't match");
    passwordMut.mutate();
  };

  const tabs = [
    { id: "Profile", icon: User },
    { id: "Security", icon: Shield },
    { id: "API Keys", icon: Key },
    { id: "About", icon: Info },
  ];

  return (
    <AppShell title="Settings" subtitle="Profile, security, API keys, and platform diagnostics" sectionLabel="CONFIGURATION">
      <div className="space-y-6">

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2">
          {tabs.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: tab === id ? "linear-gradient(135deg, #2563eb, #7c3aed)" : "rgba(255,255,255,0.04)",
                color: tab === id ? "#fff" : "rgba(255,255,255,0.5)",
                border: tab === id ? "none" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Icon className="h-4 w-4" />
              {id}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="rounded-2xl p-6" style={CARD}>

          {tab === "Profile" && (
            <div className="max-w-xl space-y-5">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22d3ee" }}>● PROFILE</p>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Full Name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-10 rounded-lg px-3 text-sm"
                  style={INPUT}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Email</label>
                <input
                  readOnly
                  defaultValue={user.email}
                  className="w-full h-10 rounded-lg px-3 text-sm opacity-60"
                  style={{ ...INPUT, cursor: "not-allowed" }}
                />
              </div>
              <Button
                onClick={() => profileMut.mutate()}
                disabled={profileMut.isPending}
                style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)", border: "none" }}
                className="font-black text-white"
              >
                {profileMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
            </div>
          )}

          {tab === "Security" && (
            <div className="max-w-xl space-y-5">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22d3ee" }}>● SECURITY</p>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Current Password</label>
                <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="••••••••" className="w-full h-10 rounded-lg px-3 text-sm" style={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>New Password</label>
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min 8 characters" className="w-full h-10 rounded-lg px-3 text-sm" style={INPUT} />
                {newPw.length > 0 && (
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (newPw.length / 12) * 100)}%`, background: newPw.length >= 12 ? "#22c55e" : newPw.length >= 8 ? "#f59e0b" : "#ef4444" }} />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Confirm New Password</label>
                <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="••••••••" className="w-full h-10 rounded-lg px-3 text-sm" style={INPUT} />
                {confirmPw && newPw !== confirmPw && <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>Passwords don't match</p>}
              </div>
              <Button
                onClick={handlePasswordSave}
                disabled={passwordMut.isPending}
                style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)", border: "none" }}
                className="font-black text-white"
              >
                {passwordMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Updating...</> : "Update Password"}
              </Button>
            </div>
          )}

          {tab === "API Keys" && (
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22d3ee" }}>● API KEYS</p>
              <div
                className="rounded-xl p-3 text-sm"
                style={{ backgroundColor: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)", color: "#60a5fa" }}
              >
                🔒 API keys are stored locally in your browser only — never sent to our servers.
              </div>
              <div className="space-y-2">
                {PROVIDER_KEYS.map((p) => (
                  <ApiKeyRow key={p.key} providerKey={p.key} label={p.label} placeholder={p.placeholder} />
                ))}
              </div>
            </div>
          )}

          {tab === "About" && (
            <div className="space-y-6">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22d3ee" }}>● ABOUT</p>
              <div>
                <h2 className="text-2xl font-black text-white">AQT Data Intelligence</h2>
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Metadata Extractor · Version 2.0 · ADE Edition</p>
              </div>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>Backend API</span>
                  <span className="font-mono text-xs" style={{ color: "#60a5fa" }}>{API_BASE_URL.replace("/api/v1", "")}</span>
                </div>
              </div>

              {/* Download docs */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>Documentation</p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={`${(import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL?.replace("/api/v1", "") ?? "https://ai-data-intelligence-1.onrender.com"}/docs`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5"
                    style={{ backgroundColor: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)", color: "#60a5fa" }}
                  >
                    📖 API Docs (Swagger) ↗
                  </a>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>Supported Engines</p>
                <div className="flex flex-wrap gap-2">
                  {engineBadges.map((engine) => (
                    <span
                      key={engine}
                      className="rounded-full px-3 py-1 text-xs font-bold"
                      style={{ backgroundColor: "rgba(37,99,235,0.1)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.2)" }}
                    >
                      {engine}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Supported File Types</p>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>PDF · PNG · JPG · JPEG · TIFF · DOCX · XLSX · TXT · MD · HTML · CSV</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
