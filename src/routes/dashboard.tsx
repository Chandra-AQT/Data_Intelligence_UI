import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Boxes, FileText, Layers3, Sparkles, Zap, RotateCcw, ShieldCheck, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/aqt/app-shell";
import { StatusBadge, GradeBadge } from "@/components/aqt/badges";
import { api } from "@/lib/aqt";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const { data: docsData } = useQuery({ queryKey: ["documents"], queryFn: () => api.get("/documents").then(r => r.data.documents ?? []) });
  const { data: schemasData } = useQuery({ queryKey: ["schemas"], queryFn: () => api.get("/schemas").then(r => r.data.schemas ?? []) });
  const { data: jobsData } = useQuery({ queryKey: ["jobs"], queryFn: () => api.get("/jobs").then(r => r.data.jobs ?? []), refetchInterval: 10000 });

  const docs = docsData ?? [];
  const schemas = schemasData ?? [];
  const jobs = jobsData ?? [];

  const parsed = docs.filter((d: { status: string }) => d.status === "parsed").length;
  const completed = jobs.filter((j: { status: string }) => j.status === "completed").length;
  const recentJobs = jobs.slice(0, 6);

  const chartData = recentJobs.map((j: { job_id: string; result?: { quality?: { score?: number } }; created_at: string }) => ({
    id: j.job_id.slice(0, 6),
    score: j.result?.quality?.score ?? 0,
    date: j.created_at ? new Date(j.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
  }));

  const stats = [
    { label: "Total Documents", value: docs.length, icon: FileText, color: "from-blue-600 to-blue-500", glow: "shadow-blue-600/20", to: "/documents" },
    { label: "Parsed", value: parsed, icon: Sparkles, color: "from-green-600 to-emerald-500", glow: "shadow-green-600/20", to: "/documents" },
    { label: "Schemas", value: schemas.length, icon: Layers3, color: "from-violet-600 to-purple-500", glow: "shadow-violet-600/20", to: "/schemas" },
    { label: "Completed Jobs", value: completed, icon: Boxes, color: "from-amber-600 to-orange-500", glow: "shadow-amber-600/20", to: "/jobs" },
  ];

  const actions = [
    { label: "Upload Documents", to: "/documents", icon: FileText, desc: "Upload and parse PDFs" },
    { label: "Auto-Generate Schema", to: "/intelligence", icon: Sparkles, desc: "AI-powered schema creation" },
    { label: "Run Extraction", to: "/extract", icon: Zap, desc: "Extract data from documents" },
    { label: "Batch Process", to: "/batch", icon: Boxes, desc: "Process multiple PDFs" },
    { label: "Compare Engines", to: "/compare", icon: ShieldCheck, desc: "Side-by-side AI comparison" },
    { label: "Smart Retry", to: "/intelligence", icon: RotateCcw, desc: "Improve low-confidence fields" },
  ];

  return (
    <AppShell title="Dashboard" subtitle="Live PAD extraction operations overview." sectionLabel="OVERVIEW">
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.label} to={stat.to} className="group relative overflow-hidden rounded-xl p-5 transition-all hover:-translate-y-0.5" style={{ backgroundColor: "#0d1526", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "radial-gradient(circle at 50% 0%, rgba(59,130,246,0.06), transparent 70%)" }} />
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} shadow-lg ${stat.glow}`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-3xl font-black text-white">{stat.value.toLocaleString()}</p>
              <p className="mt-1 text-sm font-medium text-white/40">{stat.label}</p>
            </Link>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Recent extractions */}
          <div className="rounded-2xl border border-white/[0.06] bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">Recent Extractions</h2>
              <Link to="/results" className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {recentJobs.length === 0 ? (
              <div className="py-8 text-center text-white/30">
                <Boxes className="mx-auto h-10 w-10 mb-2 opacity-30" />
                <p>No jobs yet. Run an extraction to see results.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-white/30 border-b border-white/[0.05]">
                      <th className="pb-2">Job ID</th>
                      <th className="pb-2">Schema</th>
                      <th className="pb-2">Engine</th>
                      <th className="pb-2">Quality</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentJobs.map((job: { job_id: string; schema_name: string; provider: string; status: string; result?: { quality?: { score?: number } } }) => (
                      <tr key={job.job_id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5">
                          <Link to="/results" className="font-mono text-xs text-blue-400 hover:text-blue-300">{job.job_id.slice(0, 10)}...</Link>
                        </td>
                        <td className="py-2.5 text-white/70 max-w-[100px] truncate">{job.schema_name || "—"}</td>
                        <td className="py-2.5 text-white/50 text-xs">{job.provider || "python"}</td>
                        <td className="py-2.5"><GradeBadge score={job.result?.quality?.score ?? 0} /></td>
                        <td className="py-2.5"><StatusBadge status={job.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl border border-white/[0.06] bg-card p-5">
            <h2 className="mb-4 text-lg font-black text-white">Quick Actions</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {actions.map((action) => (
                <Link
                  key={action.label}
                  to={action.to}
                  className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-all hover:border-blue-500/30 hover:bg-blue-500/5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 group-hover:bg-blue-600/30 transition-colors">
                    <action.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">{action.label}</p>
                    <p className="text-xs text-white/30">{action.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Quality chart — only render when at least one job has a real score */}
        {chartData.some((d: { score: number }) => d.score > 0) && (
          <div className="rounded-2xl border border-white/[0.06] bg-card p-5">
            <h2 className="mb-5 text-lg font-black text-white">Quality Overview</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.filter((d: { score: number }) => d.score > 0)} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="id" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#0d1526", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#e2e8f0" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                    formatter={(value: number) => [`${value}`, "Quality Score"]}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {chartData
                      .filter((d: { score: number }) => d.score > 0)
                      .map((entry: { score: number }, index: number) => (
                        <Cell
                          key={index}
                          fill={entry.score >= 75 ? "#22c55e" : entry.score >= 50 ? "#f59e0b" : "#ef4444"}
                          fillOpacity={0.9}
                        />
                      ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />≥75 Good</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />50–74 Fair</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" />&lt;50 Poor</span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
