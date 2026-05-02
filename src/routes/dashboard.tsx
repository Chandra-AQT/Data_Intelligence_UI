import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
    Boxes, FileText, Layers3, Zap, RotateCcw, ShieldCheck,
    ArrowRight, TrendingUp, CheckCircle2, AlertCircle,
    FolderArchive, Clock, Activity, Sparkles
} from "lucide-react";
import { AppShell, SkeletonCard } from "@/components/aqt/app-shell";
import { StatusBadge, GradeBadge } from "@/components/aqt/badges";
import { api, gradeFor, getUser } from "@/lib/aqt";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

// ── Animated stat card ────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, gradient, glow, to, loading, suffix = "" }: {
    label: string; value: number; icon: React.ElementType;
    gradient: string; glow: string; to: string; loading?: boolean; suffix?: string;
}) {
    if (loading) return <SkeletonCard />;
    return (
        <Link to={to}
            className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5"
            style={{ background: "linear-gradient(135deg, #0d1526 0%, #111827 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {/* Glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                style={{ background: `radial-gradient(ellipse at 50% -20%, ${glow}, transparent 70%)` }} />
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
                style={{ background: gradient }} />
            {/* Icon */}
            <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl"
                style={{ background: gradient }}>
                <Icon className="h-6 w-6 text-white" />
            </div>
            {/* Value */}
            <p className="relative text-4xl font-black text-white tabular-nums tracking-tight">
                {value.toLocaleString()}{suffix}
            </p>
            <p className="relative mt-1.5 text-sm font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</p>
            {/* Arrow */}
            <div className="absolute bottom-5 right-5 flex h-7 w-7 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                <ArrowRight className="h-3.5 w-3.5 text-white/60" />
            </div>
        </Link>
    );
}

// ── Activity item ─────────────────────────────────────────────────────────────
function ActivityItem({ job }: { job: { job_id: string; schema_name: string; provider: string; status: string; created_at: string; result?: { quality?: { score?: number } } } }) {
    const score = job.result?.quality?.score ?? 0;
    const grade = gradeFor(score);
    const gradeColors: Record<string, string> = { A: "#22c55e", B: "#60a5fa", C: "#f59e0b", D: "#f97316", F: "#ef4444" };
    const statusDot: Record<string, string> = { completed: "#22c55e", failed: "#ef4444", running: "#3b82f6", pending: "#f59e0b" };

    return (
        <Link to="/results"
            className="group flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all duration-150 hover:bg-white/[0.03]"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            {/* Status dot */}
            <div className="relative shrink-0">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${statusDot[job.status] ?? "#6b7280"}18`, border: `1px solid ${statusDot[job.status] ?? "#6b7280"}30` }}>
                    {job.status === "running"
                        ? <Activity className="h-4 w-4 animate-pulse" style={{ color: statusDot[job.status] }} />
                        : job.status === "completed"
                            ? <CheckCircle2 className="h-4 w-4" style={{ color: statusDot[job.status] }} />
                            : <AlertCircle className="h-4 w-4" style={{ color: statusDot[job.status] }} />
                    }
                </div>
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                    {job.schema_name || "Unnamed Schema"}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{job.provider || "python"}</span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
                    <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{job.job_id.slice(0, 8)}…</span>
                </div>
            </div>
            {/* Right side */}
            <div className="flex items-center gap-3 shrink-0">
                {score > 0 && (
                    <span className="text-sm font-black" style={{ color: gradeColors[grade] }}>{grade}</span>
                )}
                <StatusBadge status={job.status} />
                <span className="text-xs hidden sm:block" style={{ color: "rgba(255,255,255,0.2)" }}>
                    {job.created_at ? new Date(job.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
            </div>
        </Link>
    );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
function Dashboard() {
    const user = getUser();
    const firstName = user?.full_name?.split(" ")[0] || "there";

    const { data: docsData, isLoading: docsLoading } = useQuery({ queryKey: ["documents"], queryFn: () => api.get("/documents").then(r => r.data.documents ?? []) });
    const { data: schemasData, isLoading: schemasLoading } = useQuery({ queryKey: ["schemas"], queryFn: () => api.get("/schemas").then(r => r.data.schemas ?? []) });
    const { data: jobsData, isLoading: jobsLoading } = useQuery({ queryKey: ["jobs"], queryFn: () => api.get("/jobs").then(r => r.data.jobs ?? []), refetchInterval: 8000 });

    const isLoading = docsLoading || schemasLoading || jobsLoading;
    const docs = docsData ?? [];
    const schemas = schemasData ?? [];
    const jobs = jobsData ?? [];

    const parsed = docs.filter((d: { status: string }) => d.status === "parsed").length;
    const completed = jobs.filter((j: { status: string }) => j.status === "completed").length;
    const failed = jobs.filter((j: { status: string }) => j.status === "failed").length;
    const running = jobs.filter((j: { status: string }) => j.status === "running").length;
    const recentJobs = jobs.slice(0, 10);

    // Grade distribution
    const gradeCount = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    jobs.forEach((j: { result?: { quality?: { score?: number } } }) => {
        const score = j.result?.quality?.score ?? 0;
        if (score > 0) gradeCount[gradeFor(score) as keyof typeof gradeCount]++;
    });
    const totalGraded = Object.values(gradeCount).reduce((a, b) => a + b, 0);

    // Chart data
    const chartData = recentJobs
        .filter((j: { result?: { quality?: { score?: number } } }) => (j.result?.quality?.score ?? 0) > 0)
        .slice(0, 8)
        .map((j: { job_id: string; result?: { quality?: { score?: number } }; schema_name: string }) => ({
            id: (j.schema_name?.slice(0, 8) || j.job_id.slice(0, 6)),
            score: j.result?.quality?.score ?? 0,
        }));

    // Avg quality
    const avgScore = chartData.length > 0
        ? Math.round(chartData.reduce((a: number, b: { score: number }) => a + b.score, 0) / chartData.length)
        : 0;

    const actions = [
        { label: "Upload & Parse", to: "/documents", icon: FileText, desc: "PDF, image, Word, Excel", gradient: "linear-gradient(135deg,#2563eb,#1d4ed8)" },
        { label: "Run Extraction", to: "/extract", icon: Zap, desc: "Single doc with AI engine", gradient: "linear-gradient(135deg,#7c3aed,#6d28d9)" },
        { label: "Batch / ZIP", to: "/extract", icon: FolderArchive, desc: "Process hundreds at once", gradient: "linear-gradient(135deg,#d97706,#b45309)" },
        { label: "Schemas", to: "/schemas", icon: Layers3, desc: "Create or upload schemas", gradient: "linear-gradient(135deg,#059669,#047857)" },
        { label: "Compare Engines", to: "/compare", icon: ShieldCheck, desc: "Side-by-side AI matrix", gradient: "linear-gradient(135deg,#e11d48,#be123c)" },
        { label: "Smart Retry", to: "/intelligence", icon: RotateCcw, desc: "Improve low-confidence fields", gradient: "linear-gradient(135deg,#0891b2,#0e7490)" },
    ];

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    return (
        <AppShell title="Dashboard" subtitle="" sectionLabel="">
            <div className="space-y-7">

                {/* ── Welcome banner ── */}
                <div className="relative overflow-hidden rounded-2xl px-7 py-6"
                    style={{ background: "linear-gradient(135deg, #0f1f3d 0%, #1a1040 50%, #0d1526 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {/* Background glow blobs */}
                    <div className="absolute top-0 right-0 h-40 w-40 rounded-full blur-3xl opacity-30"
                        style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }} />
                    <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full blur-3xl opacity-20"
                        style={{ background: "radial-gradient(circle, #2563eb, transparent)" }} />
                    <div className="relative flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-4 w-4" style={{ color: "#a78bfa" }} />
                                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#a78bfa" }}>AQT Data Intelligence</span>
                            </div>
                            <h1 className="text-2xl font-black text-white">{greeting}, {firstName} 👋</h1>
                            <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                                {isLoading ? "Loading your workspace..." :
                                    `${docs.length} documents · ${schemas.length} schemas · ${completed} extractions completed`}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            {running > 0 && (
                                <div className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"
                                    style={{ backgroundColor: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.3)", color: "#60a5fa" }}>
                                    <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                                    {running} running
                                </div>
                            )}
                            <Link to="/extract"
                                className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-black text-white transition-all hover:-translate-y-0.5"
                                style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                                <Zap className="h-4 w-4" /> New Extraction
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ── Stat cards ── */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Total Documents" value={docs.length} icon={FileText}
                        gradient="linear-gradient(135deg,#2563eb,#1d4ed8)" glow="rgba(37,99,235,0.25)"
                        to="/documents" loading={isLoading} />
                    <StatCard label="Parsed & Ready" value={parsed} icon={CheckCircle2}
                        gradient="linear-gradient(135deg,#059669,#047857)" glow="rgba(5,150,105,0.25)"
                        to="/documents" loading={isLoading} />
                    <StatCard label="Schemas" value={schemas.length} icon={Layers3}
                        gradient="linear-gradient(135deg,#7c3aed,#6d28d9)" glow="rgba(124,58,237,0.25)"
                        to="/schemas" loading={isLoading} />
                    <StatCard label="Completed Jobs" value={completed} icon={Boxes}
                        gradient="linear-gradient(135deg,#d97706,#b45309)" glow="rgba(217,119,6,0.25)"
                        to="/jobs" loading={isLoading} />
                </div>

                {/* ── Main content grid ── */}
                <div className="grid gap-5 lg:grid-cols-5">

                    {/* Activity feed — 3 cols */}
                    <div className="lg:col-span-3 rounded-2xl overflow-hidden"
                        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div className="flex items-center justify-between px-5 py-4"
                            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                                    style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                                    <Activity className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white">Extraction Activity</p>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Last {recentJobs.length} jobs</p>
                                        {completed > 0 && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold"
                                                style={{ color: "#22c55e" }}>
                                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                                                {completed} passed
                                            </span>
                                        )}
                                        {failed > 0 && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold"
                                                style={{ color: "#ef4444" }}>
                                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />
                                                {failed} failed
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Link to="/results" className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                                View all <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>

                        {isLoading ? (
                            <div className="p-4 space-y-2">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="flex gap-3 px-2 py-3 rounded-xl animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
                                        <div className="h-9 w-9 rounded-xl shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3.5 rounded w-2/3" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />
                                            <div className="h-3 rounded w-1/3" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : recentJobs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
                                    style={{ background: "linear-gradient(135deg,rgba(37,99,235,0.15),rgba(124,58,237,0.15))", border: "1px solid rgba(37,99,235,0.2)" }}>
                                    <Zap className="h-7 w-7" style={{ color: "#60a5fa" }} />
                                </div>
                                <p className="text-base font-black text-white mb-1">No extractions yet</p>
                                <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.35)" }}>Run your first extraction to see activity here</p>
                                <Link to="/extract" className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-white"
                                    style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                                    <Zap className="h-4 w-4" /> Start Extracting
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0)" }}>
                                {recentJobs.map((job: { job_id: string; schema_name: string; provider: string; status: string; created_at: string; result?: { quality?: { score?: number } } }) => (
                                    <ActivityItem key={job.job_id} job={job} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right column — 2 cols */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Quality summary card */}
                        <div className="rounded-2xl p-5"
                            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                                    style={{ background: "linear-gradient(135deg,#059669,#047857)" }}>
                                    <TrendingUp className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white">Quality Overview</p>
                                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{totalGraded} scored extractions</p>
                                </div>
                            </div>

                            {totalGraded === 0 ? (
                                <div className="py-6 text-center">
                                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No scored extractions yet</p>
                                </div>
                            ) : (
                                <>
                                    {/* Big avg score */}
                                    <div className="flex items-end gap-3 mb-5 px-1">
                                        <p className="text-5xl font-black" style={{ color: avgScore >= 75 ? "#22c55e" : avgScore >= 50 ? "#f59e0b" : "#ef4444" }}>
                                            {avgScore}
                                        </p>
                                        <div className="mb-1">
                                            <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>avg score</p>
                                            <p className="text-lg font-black" style={{ color: avgScore >= 75 ? "#22c55e" : avgScore >= 50 ? "#f59e0b" : "#ef4444" }}>
                                                Grade {gradeFor(avgScore)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Grade bars */}
                                    <div className="space-y-2.5">
                                        {(["A", "B", "C", "D", "F"] as const).map(grade => {
                                            const count = gradeCount[grade];
                                            const pct = totalGraded > 0 ? Math.round((count / totalGraded) * 100) : 0;
                                            const colors = { A: "#22c55e", B: "#60a5fa", C: "#f59e0b", D: "#f97316", F: "#ef4444" };
                                            if (count === 0) return null;
                                            return (
                                                <div key={grade} className="flex items-center gap-3">
                                                    <span className="text-xs font-black w-4 shrink-0" style={{ color: colors[grade] }}>{grade}</span>
                                                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                                                        <div className="h-full rounded-full transition-all duration-700"
                                                            style={{ width: `${pct}%`, backgroundColor: colors[grade] }} />
                                                    </div>
                                                    <span className="text-xs tabular-nums w-6 text-right" style={{ color: "rgba(255,255,255,0.35)" }}>{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Quick actions */}
                        <div className="rounded-2xl p-5"
                            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                                    style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>
                                    <Sparkles className="h-4 w-4 text-white" />
                                </div>
                                <p className="text-sm font-black text-white">Quick Actions</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {actions.map(action => (
                                    <Link key={action.label} to={action.to}
                                        className="group flex flex-col gap-2.5 rounded-xl p-3.5 transition-all duration-200 hover:-translate-y-0.5"
                                        style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-110"
                                            style={{ background: action.gradient }}>
                                            <action.icon className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors leading-tight">{action.label}</p>
                                            <p className="text-[10px] mt-0.5 leading-tight" style={{ color: "rgba(255,255,255,0.3)" }}>{action.desc}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Quality trend chart ── */}
                {chartData.length > 0 && (
                    <div className="rounded-2xl p-5"
                        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                                    style={{ background: "linear-gradient(135deg,#0891b2,#0e7490)" }}>
                                    <Clock className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white">Quality Trend</p>
                                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Last {chartData.length} scored extractions</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" />≥75 Good</span>
                                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" />50–74 Fair</span>
                                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />&lt;50 Poor</span>
                            </div>
                        </div>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} barSize={32} barGap={6}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                    <XAxis dataKey="id" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                                    <Tooltip
                                        contentStyle={{ background: "#0d1526", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", color: "#e2e8f0", fontSize: "12px", padding: "10px 14px" }}
                                        formatter={(v: number) => [`${v}/100`, "Quality Score"]}
                                        cursor={{ fill: "rgba(255,255,255,0.03)", radius: 8 }}
                                    />
                                    <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                                        {chartData.map((entry: { score: number }, i: number) => (
                                            <Cell key={i}
                                                fill={entry.score >= 75 ? "#22c55e" : entry.score >= 50 ? "#f59e0b" : "#ef4444"}
                                                fillOpacity={0.9}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
