import { useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { clearAuth, getUser } from "@/lib/aqt";
import { Chatbot } from "./chatbot";
import { ApiStatusBar } from "./api-status";

const nav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/extract", label: "Extract" },
  { to: "/results", label: "Database" },
  { to: "/jobs", label: "Jobs" },
  { to: "/schemas", label: "Schemas" },
  { to: "/batch", label: "Batch Extraction" },
  { to: "/compare", label: "Engine Comparison" },
  { to: "/documents", label: "Files" },
  { to: "/intelligence", label: "Schema Generator" },
  { to: "/settings", label: "Settings" },
] as const;

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

  useEffect(() => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("aqt_access_token") : null;
    if (!token) navigate({ to: "/login" });
  }, [navigate]);

  const logout = () => { clearAuth(); toast.success("Logged out"); navigate({ to: "/login" }); };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e", color: "#f1f5f9" }}>
      {/* Top nav */}
      <header style={{ backgroundColor: "#060b14", borderBottom: "1px solid rgba(255,255,255,0.06)" }} className="sticky top-0 z-40">
        <ApiStatusBar />
        <div className="flex items-center justify-between px-6 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-lg font-black text-white tracking-tight">AQT</span>
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#22d3ee" }}>AI DATA ENGINE</span>
          </Link>

          {/* Nav items */}
          <nav className="flex items-center gap-1">
            {nav.map((item) => {
              const isActive = currentPath === item.to || currentPath.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/settings"
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white transition-all hover:scale-105"
              title={user.full_name ?? user.email}
              style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}
            >
              {initials}
            </Link>
            <button onClick={logout} className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1" title="Logout">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 w-full">
        <div className="max-w-7xl mx-auto px-8 py-10">
          {/* Page header */}
          <div className="mb-10">
            {sectionLabel && (
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#22d3ee" }}>
                ● {sectionLabel}
              </p>
            )}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-4xl font-black leading-tight" style={{ background: "linear-gradient(135deg, #a78bfa, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {title}
                </h1>
                <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{subtitle}</p>
              </div>
              {actions && <div className="flex flex-wrap gap-2 shrink-0 mt-1">{actions}</div>}
            </div>
            <div className="mt-6 h-px" style={{ background: "linear-gradient(to right, rgba(59,130,246,0.25), transparent)" }} />
          </div>

          {children}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", backgroundColor: "#060b14" }} className="px-8 py-10 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
              <span className="font-black text-white text-sm">AQT</span>
            </div>
            <p className="text-xs" style={{ color: "#6b7280" }}>Agentic Document Extraction Platform. AI-powered data intelligence.</p>
          </div>
          <div>
            <p className="text-xs font-bold text-white mb-3 uppercase tracking-wide">Platform</p>
            {[["Extract", "/extract"], ["Schemas", "/schemas"], ["Sessions", "/batch"], ["Jobs", "/jobs"]].map(([l, h]) => (
              <Link key={l} to={h as never} className="block text-xs mb-1.5 transition-colors" style={{ color: "#6b7280" }}>{l}</Link>
            ))}
          </div>
          <div>
            <p className="text-xs font-bold text-white mb-3 uppercase tracking-wide">Resources</p>
            {[["Dashboard", "/dashboard"], ["Engine Comparison", "/compare"], ["Downloads", "/results"]].map(([l, h]) => (
              <Link key={l} to={h as never} className="block text-xs mb-1.5 transition-colors" style={{ color: "#6b7280" }}>{l}</Link>
            ))}
          </div>
          <div>
            <p className="text-xs font-bold text-white mb-3 uppercase tracking-wide">Connect</p>
            <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: "#6b7280" }}>API Docs ↗</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="text-xs" style={{ color: "#374151" }}>© 2026 AQT Data Intelligence</p>
        </div>
      </footer>

      <Chatbot />
    </div>
  );
}
