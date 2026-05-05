import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Zap, Database, Briefcase, Layers3,
  Boxes, GitCompare, FolderOpen, Brain, Settings,
  LogOut, ChevronLeft, ChevronRight, Sparkles,
  Menu, X, Bell, Grid3x3, Home, Clock, ChevronDown,
  Search, FileText, Upload, CheckCircle2, AlertCircle,
  Info, ArrowRight, Command
} from "lucide-react"; import toast from "react-hot-toast";
import { clearAuth, getUser } from "@/lib/aqt";
import { Chatbot } from "./chatbot";
import { ApiStatusBar } from "./api-status";

// ── World Clock ───────────────────────────────────────────────────────────────
const TIMEZONES = [
  { id: "IN", label: "India", tz: "Asia/Kolkata", flag: "🇮🇳", short: "IST" },
  { id: "US", label: "US (ET)", tz: "America/New_York", flag: "🇺🇸", short: "ET" },
  { id: "UK", label: "UK", tz: "Europe/London", flag: "🇬🇧", short: "GMT" },
  { id: "UAE", label: "UAE", tz: "Asia/Dubai", flag: "🇦🇪", short: "GST" },
] as const;

type TZId = typeof TIMEZONES[number]["id"];

function getTime(tz: string) {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function getDate(tz: string) {
  return new Date().toLocaleDateString("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function WorldClock() {
  const [selected, setSelected] = useState<TZId>(() => {
    return (localStorage.getItem("aqt_timezone") as TZId) ?? "IN";
  });
  const [times, setTimes] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Tick every second
  useEffect(() => {
    const tick = () => {
      const t: Record<string, string> = {};
      TIMEZONES.forEach(z => { t[z.id] = getTime(z.tz); });
      setTimes(t);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectTZ = (id: TZId) => {
    setSelected(id);
    localStorage.setItem("aqt_timezone", id);
    setOpen(false);
  };

  const active = TIMEZONES.find(z => z.id === selected)!;

  return (
    <div ref={ref} className="relative">
      {/* Trigger — shows selected timezone */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-xl px-3 py-1.5 transition-all hover:bg-white/[0.06]"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: "#22d3ee" }} />
        <span className="text-xs font-bold text-white tabular-nums">{times[selected] ?? "—"}</span>
        <span className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>{active.flag} {active.short}</span>
        <ChevronDown className="h-3 w-3 transition-transform" style={{ color: "rgba(255,255,255,0.3)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>

      {/* Dropdown — all 4 timezones */}
      {open && (
        <div
          className="absolute top-full right-0 mt-2 rounded-2xl overflow-hidden z-[60]"
          style={{
            backgroundColor: "#0d1526",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            minWidth: "260px",
          }}
        >
          <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#22d3ee" }}>● WORLD CLOCK</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Select your timezone</p>
          </div>
          <div className="p-2">
            {TIMEZONES.map(tz => {
              const isActive = selected === tz.id;
              return (
                <button
                  key={tz.id}
                  onClick={() => selectTZ(tz.id)}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 transition-all hover:bg-white/[0.05]"
                  style={{
                    backgroundColor: isActive ? "rgba(37,99,235,0.12)" : "transparent",
                    border: isActive ? "1px solid rgba(37,99,235,0.25)" : "1px solid transparent",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{tz.flag}</span>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">{tz.label}</p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {getDate(tz.tz)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black tabular-nums" style={{ color: isActive ? "#60a5fa" : "rgba(255,255,255,0.7)" }}>
                      {times[tz.id] ?? "—"}
                    </p>
                    <p className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>{tz.short}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="px-4 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
              Selected timezone persists across sessions
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Notification System ───────────────────────────────────────────────────────
type Notif = { id: string; type: "success" | "error" | "info"; title: string; body: string; time: Date; read: boolean };

const NOTIF_KEY = "aqt_notifications";

function loadNotifs(): Notif[] {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) ?? "[]"); } catch { return []; }
}
function saveNotifs(n: Notif[]) { localStorage.setItem(NOTIF_KEY, JSON.stringify(n.slice(0, 50))); }

export function pushNotification(type: Notif["type"], title: string, body: string) {
  const notifs = loadNotifs();
  notifs.unshift({ id: Date.now().toString(), type, title, body, time: new Date(), read: false });
  saveNotifs(notifs);
  window.dispatchEvent(new Event("aqt-notif"));
}

function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>(loadNotifs);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = () => setNotifs(loadNotifs());
    window.addEventListener("aqt-notif", refresh);
    return () => window.removeEventListener("aqt-notif", refresh);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const unread = notifs.filter(n => !n.read).length;

  const markAllRead = () => {
    const updated = notifs.map(n => ({ ...n, read: true }));
    setNotifs(updated); saveNotifs(updated);
  };

  const clearAll = () => { setNotifs([]); saveNotifs([]); };

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
  const colors = { success: "#22c55e", error: "#ef4444", info: "#60a5fa" };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen(o => !o); if (!open) markAllRead(); }}
        className="relative p-2 rounded-xl hover:bg-white/[0.06] transition-colors" title="Notifications">
        <Bell className="h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
            style={{ backgroundColor: "#ef4444" }}>{unread > 9 ? "9+" : unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 rounded-2xl overflow-hidden z-[60]"
          style={{ width: "320px", backgroundColor: "#0d1526", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <p className="text-xs font-black text-white">Notifications</p>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{notifs.length} total · {unread} unread</p>
            </div>
            <button onClick={clearAll} className="text-[10px] font-bold hover:text-white transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>Clear all</button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="mx-auto h-8 w-8 mb-2 opacity-20" style={{ color: "#60a5fa" }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No notifications yet</p>
              </div>
            ) : notifs.map(n => {
              const Icon = icons[n.type];
              return (
                <div key={n.id} className="flex gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", opacity: n.read ? 0.6 : 1 }}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl mt-0.5"
                    style={{ backgroundColor: `${colors[n.type]}18` }}>
                    <Icon className="h-4 w-4" style={{ color: colors[n.type] }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{n.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{n.body}</p>
                    <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                      {new Date(n.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {!n.read && <span className="h-2 w-2 rounded-full shrink-0 mt-2" style={{ backgroundColor: "#3b82f6" }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Command Palette (Cmd+K) ───────────────────────────────────────────────────
const CMD_ITEMS = [
  { group: "Navigate", label: "Dashboard", icon: LayoutDashboard, to: "/dashboard", keys: ["dashboard", "home", "overview"] },
  { group: "Navigate", label: "Extraction", icon: Zap, to: "/extract", keys: ["extract", "extraction", "run", "ai"] },
  { group: "Navigate", label: "Results", icon: Database, to: "/results", keys: ["results", "database", "jobs", "history"] },
  { group: "Navigate", label: "Jobs", icon: Briefcase, to: "/jobs", keys: ["jobs", "monitor", "status"] },
  { group: "Navigate", label: "Schemas", icon: Layers3, to: "/schemas", keys: ["schema", "fields", "template"] },
  { group: "Navigate", label: "Files", icon: FolderOpen, to: "/documents", keys: ["files", "documents", "upload", "pdf"] },
  { group: "Navigate", label: "Compare Engines", icon: GitCompare, to: "/compare", keys: ["compare", "engines", "accuracy"] },
  { group: "Navigate", label: "AI Tools", icon: Brain, to: "/intelligence", keys: ["ai", "tools", "smart", "retry", "quality"] },
  { group: "Navigate", label: "Settings", icon: Settings, to: "/settings", keys: ["settings", "profile", "api", "key"] },
  { group: "Actions", label: "Upload Documents", icon: Upload, to: "/documents", keys: ["upload", "add", "new document"] },
  { group: "Actions", label: "New Extraction", icon: Zap, to: "/extract", keys: ["new extraction", "start", "begin"] },
  { group: "Actions", label: "Create Schema", icon: Layers3, to: "/schemas", keys: ["new schema", "create schema"] },
  { group: "Actions", label: "View All Results", icon: Database, to: "/results", keys: ["all results", "view results"] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(o => !o); setQuery(""); setSelected(0); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  const filtered = query.trim()
    ? CMD_ITEMS.filter(item =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.keys.some(k => k.includes(query.toLowerCase()))
    )
    : CMD_ITEMS;

  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof CMD_ITEMS>);

  const flat = Object.values(grouped).flat();

  const go = (item: typeof CMD_ITEMS[0]) => {
    navigate({ to: item.to as never });
    setOpen(false); setQuery("");
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, flat.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && flat[selected]) go(flat[selected]);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, selected, flat]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: "#0d1526", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}
        onClick={e => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Search className="h-5 w-5 shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
          <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Search pages, actions..." className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/30" />
          <kbd className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
            ESC
          </kbd>
        </div>
        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {flat.length === 0 ? (
            <div className="py-8 text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No results for "{query}"</div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>{group}</p>
                {items.map(item => {
                  const idx = flat.indexOf(item);
                  const isSelected = idx === selected;
                  return (
                    <button key={item.label} onClick={() => go(item)}
                      onMouseEnter={() => setSelected(idx)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors"
                      style={{ backgroundColor: isSelected ? "rgba(37,99,235,0.15)" : "transparent" }}>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: isSelected ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "rgba(255,255,255,0.06)" }}>
                        <item.icon className="h-4 w-4" style={{ color: isSelected ? "#fff" : "rgba(255,255,255,0.5)" }} />
                      </div>
                      <span className="text-sm font-semibold" style={{ color: isSelected ? "#fff" : "rgba(255,255,255,0.7)" }}>{item.label}</span>
                      {isSelected && <ArrowRight className="h-4 w-4 ml-auto" style={{ color: "#60a5fa" }} />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {[["↑↓", "navigate"], ["↵", "select"], ["esc", "close"]].map(([key, label]) => (
            <span key={key} className="flex items-center gap-1.5 text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              <kbd className="rounded px-1.5 py-0.5 font-bold" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>{key}</kbd>
              {label}
            </span>
          ))}
          <span className="ml-auto flex items-center gap-1 text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
            <Command className="h-3 w-3" />K to open
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Onboarding Flow ───────────────────────────────────────────────────────────
const ONBOARD_KEY = "aqt_onboarded";

const ONBOARD_STEPS = [
  {
    icon: Upload,
    title: "Upload Your First Document",
    desc: "Drag & drop any PDF, image, Word, or Excel file. The system parses it automatically — extracting text, tables, and structure.",
    action: "Go to Files →",
    to: "/documents",
    color: "from-blue-600 to-blue-500",
    tip: "Supports PDF, PNG, JPG, DOCX, XLSX, TXT, CSV and more.",
  },
  {
    icon: Layers3,
    title: "Create or Upload a Schema",
    desc: "A schema defines what fields to extract — model number, dimensions, voltage, weight. Or let GPT-4o auto-generate one from your document.",
    action: "Go to Schemas →",
    to: "/schemas",
    color: "from-violet-600 to-purple-500",
    tip: "You can also upload any JSON schema file and the system adapts it automatically.",
  },
  {
    icon: Zap,
    title: "Run Your First Extraction",
    desc: "Select your document, choose a schema, pick an AI engine, and click Run. Results appear in 20–60 seconds with confidence scores.",
    action: "Go to Extraction →",
    to: "/extract",
    color: "from-amber-600 to-orange-500",
    tip: "For industrial equipment PDFs, Landing AI ADE gives the best accuracy.",
  },
];

export function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(() => !localStorage.getItem(ONBOARD_KEY));
  const navigate = useNavigate();

  if (!visible) return null;

  const dismiss = () => { localStorage.setItem(ONBOARD_KEY, "1"); setVisible(false); };
  const current = ONBOARD_STEPS[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)" }}>
      <div className="relative w-full max-w-lg mx-4 rounded-3xl overflow-hidden"
        style={{ backgroundColor: "#0d1526", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 40px 100px rgba(0,0,0,0.8)" }}>
        {/* Skip */}
        <button onClick={dismiss} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/10 transition-colors z-10">
          <X className="h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />
        </button>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-6 pb-2">
          {ONBOARD_STEPS.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-300"
              style={{ width: i === step ? "24px" : "8px", height: "8px", backgroundColor: i === step ? "#3b82f6" : i < step ? "#22c55e" : "rgba(255,255,255,0.15)" }} />
          ))}
        </div>

        {/* Content */}
        <div className="px-8 py-6 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl"
            style={{ background: `linear-gradient(135deg, ${current.color.split(" ")[1]}, ${current.color.split(" ")[3]})`, boxShadow: "0 12px 40px rgba(37,99,235,0.3)" }}>
            <Icon className="h-9 w-9 text-white" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#22d3ee" }}>
            Step {step + 1} of {ONBOARD_STEPS.length}
          </p>
          <h2 className="text-2xl font-black text-white mb-3">{current.title}</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>{current.desc}</p>
          <div className="rounded-xl px-4 py-3 mb-6 text-left" style={{ backgroundColor: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.15)" }}>
            <p className="text-xs" style={{ color: "#60a5fa" }}>💡 {current.tip}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-8 pb-8">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 rounded-xl py-3 text-sm font-bold transition-all"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
              ← Back
            </button>
          )}
          <button
            onClick={() => { navigate({ to: current.to as never }); dismiss(); }}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-white transition-all hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
            {current.action}
          </button>
          {step < ONBOARD_STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)}
              className="flex-1 rounded-xl py-3 text-sm font-bold transition-all"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
              Next →
            </button>
          ) : (
            <button onClick={dismiss}
              className="flex-1 rounded-xl py-3 text-sm font-bold transition-all"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
              Skip tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
const allNavItems = [
  { to: "/", label: "Home", icon: Home, color: "#22d3ee" },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "#2563eb" },
  { to: "/extract", label: "Extraction", icon: Zap, color: "#7c3aed" },
  { to: "/results", label: "Results", icon: Database, color: "#0891b2" },
  { to: "/jobs", label: "Jobs", icon: Briefcase, color: "#d97706" },
  { to: "/schemas", label: "Schemas", icon: Layers3, color: "#059669" },
  { to: "/documents", label: "Files", icon: FolderOpen, color: "#2563eb" },
  { to: "/compare", label: "Compare", icon: GitCompare, color: "#e11d48" },
  { to: "/webextract", label: "Web Extract", icon: Boxes, color: "#0891b2" },
  { to: "/intelligence", label: "AI Tools", icon: Brain, color: "#7c3aed" },
  { to: "/settings", label: "Settings", icon: Settings, color: "#6b7280" },
];

// ── Floating circular quick-nav (draggable) ───────────────────────────────────
export function FloatingNav() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // offset from default position
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ mx: 0, my: 0, px: 0, py: 0 });
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const onMouseDown = (e: React.MouseEvent) => {
    // Only drag on the trigger button itself
    e.preventDefault();
    setDragging(true);
    setDragStart({ mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setPos({
        x: dragStart.px + (e.clientX - dragStart.mx),
        y: dragStart.py + (e.clientY - dragStart.my),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, dragStart]);

  // Touch support
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setDragging(true);
    setDragStart({ mx: t.clientX, my: t.clientY, px: pos.x, py: pos.y });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      setPos({
        x: dragStart.px + (t.clientX - dragStart.mx),
        y: dragStart.py + (t.clientY - dragStart.my),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, dragStart]);

  return (
    <div
      className="fixed z-[55] flex flex-col items-center gap-2"
      style={{
        right: `${16 - pos.x}px`,
        top: `calc(50% + ${pos.y}px)`,
        transform: "translateY(-50%)",
        userSelect: "none",
      }}
    >
      {/* Nav items — slide in when open */}
      <div
        className="flex flex-col items-center gap-2 transition-all duration-300"
        style={{
          maxHeight: open ? `${allNavItems.length * 52}px` : "0px",
          opacity: open ? 1 : 0,
          overflow: "hidden",
          marginBottom: open ? "8px" : "0px",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {allNavItems.map((item) => {
          const isActive = currentPath === item.to || (item.to !== "/" && currentPath.startsWith(item.to + "/"));
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              title={item.label}
              className="group relative flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
              style={{
                background: isActive
                  ? `linear-gradient(135deg, ${item.color}, ${item.color}bb)`
                  : "rgba(6,11,24,0.92)",
                border: isActive
                  ? `2px solid ${item.color}70`
                  : "2px solid rgba(255,255,255,0.14)",
                boxShadow: isActive
                  ? `0 0 18px ${item.color}55, 0 4px 14px rgba(0,0,0,0.5)`
                  : "0 4px 14px rgba(0,0,0,0.4)",
                backdropFilter: "blur(12px)",
              }}
            >
              <item.icon style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.65)", width: "18px", height: "18px" }} />
              {/* Tooltip */}
              <div
                className="absolute right-full mr-3 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150"
                style={{
                  backgroundColor: "rgba(6,11,24,0.95)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                  backdropFilter: "blur(12px)",
                }}
              >
                {item.label}
                {isActive && <span className="ml-1.5 text-[10px]" style={{ color: item.color }}>●</span>}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Trigger button — drag handle */}
      <button
        onMouseDown={(e) => {
          // If it's a short click (not drag), toggle open
          const startX = e.clientX;
          const startY = e.clientY;
          onMouseDown(e);
          const handleUp = (up: MouseEvent) => {
            const dx = Math.abs(up.clientX - startX);
            const dy = Math.abs(up.clientY - startY);
            if (dx < 5 && dy < 5) setOpen((o) => !o);
            window.removeEventListener("mouseup", handleUp);
          };
          window.addEventListener("mouseup", handleUp);
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          const startX = t.clientX;
          const startY = t.clientY;
          onTouchStart(e);
          const handleEnd = (up: TouchEvent) => {
            const et = up.changedTouches[0];
            const dx = Math.abs(et.clientX - startX);
            const dy = Math.abs(et.clientY - startY);
            if (dx < 8 && dy < 8) setOpen((o) => !o);
            window.removeEventListener("touchend", handleEnd);
          };
          window.addEventListener("touchend", handleEnd);
        }}
        className="flex h-13 w-13 items-center justify-center rounded-full transition-all duration-300"
        style={{
          width: "52px",
          height: "52px",
          background: open
            ? "linear-gradient(135deg, #ef4444, #dc2626)"
            : "linear-gradient(135deg, #2563eb, #7c3aed)",
          border: "2px solid rgba(255,255,255,0.18)",
          boxShadow: open
            ? "0 0 24px rgba(239,68,68,0.5), 0 6px 20px rgba(0,0,0,0.5)"
            : "0 0 24px rgba(37,99,235,0.45), 0 6px 20px rgba(0,0,0,0.5)",
          cursor: dragging ? "grabbing" : "grab",
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
          backdropFilter: "blur(12px)",
        }}
        title={open ? "Close · Drag to move" : "Quick navigation · Drag to move"}
      >
        {open
          ? <X style={{ color: "#fff", width: "20px", height: "20px" }} />
          : <Grid3x3 style={{ color: "#fff", width: "20px", height: "20px" }} />
        }
      </button>

    </div>
  );
}

const navGroups = [
  {
    label: "Workspace",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/extract", label: "Extraction", icon: Zap },
      { to: "/results", label: "Results", icon: Database },
      { to: "/jobs", label: "Jobs", icon: Briefcase },
    ],
  },
  {
    label: "Library",
    items: [
      { to: "/schemas", label: "Schemas", icon: Layers3 },
      { to: "/documents", label: "Files", icon: FolderOpen },
    ],
  },
  {
    label: "Advanced",
    items: [
      { to: "/webextract" as string, label: "Web Extract", icon: Boxes },
      { to: "/compare" as string, label: "Compare", icon: GitCompare },
      { to: "/intelligence" as string, label: "AI Tools", icon: Brain },
    ],
  },
];

function SkeletonLine({ w = "w-full", h = "h-4" }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} rounded-lg animate-pulse`} style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />;
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} w={i % 3 === 2 ? "w-2/3" : "w-full"} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 space-y-3 animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
        <div className="flex-1 space-y-2">
          <SkeletonLine w="w-1/2" h="h-4" />
          <SkeletonLine w="w-1/3" h="h-3" />
        </div>
      </div>
      <SkeletonLine h="h-3" />
      <SkeletonLine w="w-4/5" h="h-3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 px-4 py-2">
        {[40, 20, 15, 15, 10].map((w, i) => (
          <div key={i} className={`h-3 rounded animate-pulse`} style={{ width: `${w}%`, backgroundColor: "rgba(255,255,255,0.08)" }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 rounded-xl animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
          {[40, 20, 15, 15, 10].map((w, j) => (
            <div key={j} className="h-4 rounded" style={{ width: `${w}%`, backgroundColor: "rgba(255,255,255,0.05)" }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl mb-6"
        style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.15), rgba(124,58,237,0.15))", border: "1px solid rgba(37,99,235,0.2)" }}>
        <Icon className="h-9 w-9" style={{ color: "#60a5fa" }} />
      </div>
      <h3 className="text-xl font-black text-white mb-2">{title}</h3>
      <p className="text-sm max-w-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{description}</p>
      {action && actionLabel && (
        <button onClick={action}
          className="mt-6 flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-black text-white transition-all hover:-translate-y-0.5"
          style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ── Session Timeout Warning ───────────────────────────────────────────────────
function SessionTimeoutWarning() {
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const check = () => {
      const token = localStorage.getItem("aqt_access_token");
      if (!token) return;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const expiresAt = payload.exp * 1000;
        const now = Date.now();
        const mins = Math.floor((expiresAt - now) / 60000);
        setMinutesLeft(mins <= 5 && mins > 0 ? mins : null);
      } catch { setMinutesLeft(null); }
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

  const refresh = async () => {
    try {
      const rt = localStorage.getItem("aqt_refresh_token");
      if (!rt) return;
      const { data } = await (await import("axios")).default.post(`${import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000"}/api/v1/auth/refresh`, { refresh_token: rt });
      localStorage.setItem("aqt_access_token", data.access_token);
      setMinutesLeft(null);
      toast.success("Session extended");
    } catch { navigate({ to: "/login" }); }
  };

  if (!minutesLeft) return null;
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-3 rounded-2xl px-5 py-3 shadow-2xl"
      style={{ backgroundColor: "#0d1526", border: "1px solid rgba(245,158,11,0.3)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
      <AlertCircle className="h-4 w-4 shrink-0" style={{ color: "#f59e0b" }} />
      <p className="text-sm font-bold" style={{ color: "#f59e0b" }}>
        Session expires in {minutesLeft} minute{minutesLeft > 1 ? "s" : ""}
      </p>
      <button onClick={refresh} className="rounded-lg px-3 py-1 text-xs font-black text-white transition-all hover:-translate-y-0.5"
        style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
        Stay logged in
      </button>
    </div>
  );
}

// ── Keyboard Shortcuts Modal ──────────────────────────────────────────────────
export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "?") { e.preventDefault(); setOpen(o => !o); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (!open) return null;

  const shortcuts = [
    { keys: ["Ctrl", "K"], desc: "Open command palette" },
    { keys: ["Shift", "?"], desc: "Show keyboard shortcuts" },
    { keys: ["Esc"], desc: "Close any modal / palette" },
  ];

  const navShortcuts = [
    { keys: ["G", "D"], desc: "Go to Dashboard" },
    { keys: ["G", "E"], desc: "Go to Extraction" },
    { keys: ["G", "R"], desc: "Go to Results" },
    { keys: ["G", "J"], desc: "Go to Jobs" },
    { keys: ["G", "S"], desc: "Go to Schemas" },
    { keys: ["G", "F"], desc: "Go to Files" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={() => setOpen(false)}>
      <div className="w-full max-w-md mx-4 rounded-2xl overflow-hidden"
        style={{ backgroundColor: "#0d1526", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-base font-black text-white">Keyboard Shortcuts</p>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#22d3ee" }}>GENERAL</p>
            <div className="space-y-2">
              {shortcuts.map(s => (
                <div key={s.desc} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{s.desc}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map(k => (
                      <kbd key={k} className="rounded-lg px-2 py-1 text-xs font-bold"
                        style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}>
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#22d3ee" }}>NAVIGATION (press in sequence)</p>
            <div className="grid grid-cols-2 gap-2">
              {navShortcuts.map(s => (
                <div key={s.desc} className="flex items-center justify-between rounded-xl px-3 py-2"
                  style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{s.desc.replace("Go to ", "")}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map(k => (
                      <kbd key={k} className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: "rgba(37,99,235,0.2)", border: "1px solid rgba(37,99,235,0.3)", color: "#60a5fa" }}>
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-3 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>Press Shift+? to toggle this panel</p>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ title, subtitle, actions, children, sectionLabel }: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  sectionLabel?: string;
}) {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const user = getUser() ?? { full_name: "AQT Operator", email: "operator@aqt.ai" };
  const initials = (user.full_name ?? "AO").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("aqt_access_token") : null;
    if (!token) navigate({ to: "/login" });
  }, [navigate]);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [currentPath]);

  const logout = () => { clearAuth(); toast.success("Logged out"); navigate({ to: "/login" }); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-black text-white leading-none">AQT</p>
              <p className="text-[10px] font-bold tracking-widest uppercase mt-0.5" style={{ color: "#22d3ee" }}>Data Intelligence</p>
            </div>
          )}
        </Link>
      </div>

      {/* API Status */}
      {!collapsed && (
        <div className="px-3 py-2 shrink-0">
          <ApiStatusBar />
        </div>
      )}

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = currentPath === item.to || currentPath.startsWith(item.to + "/");
                return (
                  <Link key={item.to} to={item.to}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all group relative ${collapsed ? "justify-center" : ""}`}
                    style={{
                      background: isActive ? "linear-gradient(135deg, rgba(37,99,235,0.25), rgba(124,58,237,0.15))" : "transparent",
                      color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
                      border: isActive ? "1px solid rgba(37,99,235,0.3)" : "1px solid transparent",
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-blue-400" : "text-white/40 group-hover:text-white/70"}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {isActive && !collapsed && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                    )}
                    {/* Tooltip for collapsed */}
                    {collapsed && (
                      <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
                        style={{ backgroundColor: "#0d1526", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: Settings + User */}
      <div className="shrink-0 px-3 py-3 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <Link to="/settings"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all group relative ${collapsed ? "justify-center" : ""}`}
          style={{
            color: currentPath === "/settings" ? "#fff" : "rgba(255,255,255,0.5)",
            background: currentPath === "/settings" ? "linear-gradient(135deg, rgba(37,99,235,0.25), rgba(124,58,237,0.15))" : "transparent",
            border: currentPath === "/settings" ? "1px solid rgba(37,99,235,0.3)" : "1px solid transparent",
          }}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-4 w-4 shrink-0 text-white/40 group-hover:text-white/70" />
          {!collapsed && <span>Settings</span>}
          {collapsed && (
            <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
              style={{ backgroundColor: "#0d1526", border: "1px solid rgba(255,255,255,0.1)" }}>
              Settings
            </div>
          )}
        </Link>

        {/* User row */}
        <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${collapsed ? "justify-center" : ""}`}>
          <Link to="/settings"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white hover:scale-105 transition-transform"
            style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}
            title={user.full_name ?? user.email}
          >
            {initials}
          </Link>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.full_name || "Operator"}</p>
              <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.3)" }}>{user.email}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={logout} className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0" title="Logout">
              <LogOut className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.4)" }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#060b18", color: "#f1f5f9" }}>

      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden lg:flex flex-col shrink-0 transition-all duration-300 relative"
        style={{
          width: collapsed ? "64px" : "220px",
          backgroundColor: "#030712",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full transition-all hover:scale-110 z-10"
          style={{ backgroundColor: "#0d1526", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col" style={{ backgroundColor: "#030712", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Top header bar */}
        <header className="flex items-center gap-4 px-6 py-3 shrink-0"
          style={{ backgroundColor: "#060b14", borderBottom: "1px solid rgba(255,255,255,0.06)", minHeight: "56px" }}>
          {/* Mobile menu button */}
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <Menu className="h-5 w-5 text-white/60" />
          </button>

          {/* Breadcrumb / page title */}
          <div className="flex-1 min-w-0">
            {sectionLabel && (
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#22d3ee" }}>{sectionLabel}</p>
            )}
            <h1 className="text-base font-black text-white leading-tight truncate">{title}</h1>
          </div>

          {/* Cmd+K search trigger */}
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))}
            className="hidden md:flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs transition-all hover:bg-white/[0.06]"
            style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
            title="Search (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
            <kbd className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>
          {/* Actions */}
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}

          {/* Right: world clock + notification bell + mobile user */}
          <div className="flex items-center gap-2 shrink-0">
            <WorldClock />
            <NotificationPanel />
            <button onClick={logout} className="lg:hidden p-2 rounded-xl hover:bg-white/[0.06] transition-colors" title="Logout">
              <LogOut className="h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Page subtitle */}
            {subtitle && (
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>{subtitle}</p>
            )}
            {children}
          </div>
        </main>
      </div>

      <FloatingNav />
      <Chatbot />
      <CommandPalette />
      <OnboardingFlow />
      <SessionTimeoutWarning />
      <KeyboardShortcuts />
    </div>
  );
}
