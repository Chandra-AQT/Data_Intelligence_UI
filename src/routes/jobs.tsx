import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/aqt/app-shell";
import { StatusBadge, GradeBadge } from "@/components/aqt/badges";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/aqt";

export const Route = createFileRoute("/jobs")({ component: Jobs });

const PAGE_SIZE = 20;

function Jobs() {
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ["jobs"],
        queryFn: () => api.get("/jobs").then((r) => r.data.jobs ?? []),
        refetchInterval: 5000,
    });

    const allJobs = data ?? [];
    const filtered = filter === "all" ? allJobs : allJobs.filter((j: { status: string }) => j.status === filter);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const jobs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const counts = {
        completed: allJobs.filter((j: { status: string }) => j.status === "completed").length,
        failed: allJobs.filter((j: { status: string }) => j.status === "failed").length,
        running: allJobs.filter((j: { status: string }) => j.status === "running").length,
        pending: allJobs.filter((j: { status: string }) => j.status === "pending").length,
    };

    const handleFilter = (f: string) => { setFilter(f); setPage(1); };

    return (
        <AppShell title="Jobs & Results" subtitle="View all extraction runs and their results" sectionLabel="EXTRACTION RECORDS">
            <div className="space-y-5">
                {/* Status counts — clickable filters */}
                <div className="grid gap-3 sm:grid-cols-4">
                    {(Object.entries(counts) as [string, number][]).map(([key, value]) => {
                        const colors: Record<string, string> = {
                            completed: "from-green-600 to-emerald-500",
                            failed: "from-red-600 to-rose-500",
                            running: "from-blue-600 to-blue-500",
                            pending: "from-amber-600 to-orange-500",
                        };
                        const isActive = filter === key;
                        return (
                            <button key={key} onClick={() => handleFilter(isActive ? "all" : key)}
                                className="rounded-xl p-4 text-left transition-all hover:-translate-y-0.5"
                                style={{ backgroundColor: isActive ? "rgba(37,99,235,0.12)" : "rgba(255,255,255,0.04)", border: isActive ? "1px solid rgba(37,99,235,0.3)" : "1px solid rgba(255,255,255,0.08)" }}>
                                <p className={`text-3xl font-black bg-gradient-to-br ${colors[key]} bg-clip-text text-transparent`}>{value}</p>
                                <p className="capitalize mt-1 text-sm font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>{key}</p>
                            </button>
                        );
                    })}
                </div>

                {/* Jobs table */}
                <div className="rounded-2xl p-5" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <h2 className="font-black">
                                {filter === "all" ? `All Jobs (${allJobs.length})` : `${filter.charAt(0).toUpperCase() + filter.slice(1)} (${filtered.length})`}
                            </h2>
                            {filter !== "all" && (
                                <button onClick={() => handleFilter("all")} className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                                    Clear filter ×
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs animate-pulse" style={{ color: "rgba(255,255,255,0.3)" }}>Auto-refreshing every 5s</span>
                            {totalPages > 1 && (
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30">
                                        <ChevronLeft className="h-4 w-4 text-white" />
                                    </button>
                                    <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>{page} / {totalPages}</span>
                                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30">
                                        <ChevronRight className="h-4 w-4 text-white" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {isLoading ? (
                        <p className="py-8 text-center text-muted-foreground">Loading...</p>
                    ) : jobs.length === 0 ? (
                        <div className="py-12 text-center">
                            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/30" />
                            <p className="mt-3 text-muted-foreground">
                                {filter === "all" ? "No jobs yet. Run an extraction to see jobs here." : `No ${filter} jobs.`}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-left text-muted-foreground">
                                    <tr className="border-b border-white/[0.06]">
                                        <th className="pb-2 pr-4">Job ID</th>
                                        <th className="pb-2 pr-4">Schema</th>
                                        <th className="pb-2 pr-4">Status</th>
                                        <th className="pb-2 pr-4">Quality</th>
                                        <th className="pb-2 pr-4">Provider</th>
                                        <th className="pb-2 pr-4">Duration</th>
                                        <th className="pb-2">Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobs.map((job: { job_id: string; schema_name: string; status: string; provider: string; model: string; duration_seconds: number; created_at: string; error?: string; result?: { quality?: { score?: number } } }) => (
                                        <tr key={job.job_id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                            <td className="py-3 pr-4">
                                                <Link to="/results" className="font-mono text-xs hover:underline" style={{ color: "#60a5fa" }}>
                                                    {job.job_id.slice(0, 12)}…
                                                </Link>
                                            </td>
                                            <td className="py-3 pr-4 max-w-[140px] truncate text-white/70">{job.schema_name || "—"}</td>
                                            <td className="py-3 pr-4">
                                                <div>
                                                    <StatusBadge status={job.status} />
                                                    {job.status === "failed" && job.error && (
                                                        <p className="text-xs mt-0.5 max-w-[160px] truncate" style={{ color: "#ef4444" }} title={job.error}>{job.error}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 pr-4"><GradeBadge score={job.result?.quality?.score ?? 0} /></td>
                                            <td className="py-3 pr-4 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{job.provider || "python"}</td>
                                            <td className="py-3 pr-4 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{job.duration_seconds ? `${job.duration_seconds}s` : "—"}</td>
                                            <td className="py-3 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{job.created_at ? new Date(job.created_at).toLocaleString() : "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Bottom pagination */}
                    {totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                            </span>
                            <div className="flex gap-1">
                                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                                    <button key={p} onClick={() => setPage(p)}
                                        className="h-7 w-7 rounded-lg text-xs font-bold transition-all"
                                        style={{ background: p === page ? "linear-gradient(135deg, #2563eb, #7c3aed)" : "rgba(255,255,255,0.04)", color: p === page ? "#fff" : "rgba(255,255,255,0.4)" }}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
