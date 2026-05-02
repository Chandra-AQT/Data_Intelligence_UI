import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Briefcase, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Copy, Check, StopCircle } from "lucide-react";
import { AppShell, SkeletonTable, EmptyState } from "@/components/aqt/app-shell";
import { StatusBadge, GradeBadge } from "@/components/aqt/badges";
import { api } from "@/lib/aqt";

export const Route = createFileRoute("/jobs")({ component: Jobs });

const PAGE_SIZE = 20;

type SortKey = "created_at" | "schema_name" | "status" | "provider" | "duration_seconds";
type SortDir = "asc" | "desc";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
    if (col !== sortKey) return <ArrowUpDown className="h-3 w-3 opacity-30 ml-1 inline" />;
    return sortDir === "asc"
        ? <ArrowUp className="h-3 w-3 ml-1 inline" style={{ color: "#60a5fa" }} />
        : <ArrowDown className="h-3 w-3 ml-1 inline" style={{ color: "#60a5fa" }} />;
}

function Jobs() {
    const qc = useQueryClient();
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [sortKey, setSortKey] = useState<SortKey>("created_at");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ["jobs"],
        queryFn: () => api.get("/jobs").then((r) => r.data.jobs ?? []),
        refetchInterval: 5000,
    });

    const cancelMut = useMutation({
        mutationFn: (jobId: string) => api.post(`/jobs/${jobId}/cancel`),
        onSuccess: () => { toast.success("Job cancelled"); qc.invalidateQueries({ queryKey: ["jobs"] }); },
        onError: () => toast.error("Could not cancel job"),
    });

    const copyId = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const allJobs = data ?? [];
    const filtered = filter === "all" ? allJobs : allJobs.filter((j: { status: string }) => j.status === filter);

    const sorted = [...filtered].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
    });

    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const jobs = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const counts = {
        completed: allJobs.filter((j: { status: string }) => j.status === "completed").length,
        failed: allJobs.filter((j: { status: string }) => j.status === "failed").length,
        running: allJobs.filter((j: { status: string }) => j.status === "running").length,
        pending: allJobs.filter((j: { status: string }) => j.status === "pending").length,
    };

    const handleFilter = (f: string) => { setFilter(f); setPage(1); };
    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("desc"); }
        setPage(1);
    };

    return (
        <AppShell title="Jobs" subtitle="All extraction runs with status, quality, and timing." sectionLabel="EXTRACTION RECORDS">
            <div className="space-y-5">

                {/* Status filter cards */}
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
                                className="rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5"
                                style={{
                                    backgroundColor: isActive ? "rgba(37,99,235,0.12)" : "rgba(255,255,255,0.03)",
                                    border: isActive ? "1px solid rgba(37,99,235,0.3)" : "1px solid rgba(255,255,255,0.07)",
                                }}>
                                <p className={`text-3xl font-black bg-gradient-to-br ${colors[key]} bg-clip-text text-transparent tabular-nums`}>{value}</p>
                                <p className="capitalize mt-1 text-sm font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>{key}</p>
                            </button>
                        );
                    })}
                </div>

                {/* Jobs table */}
                <div className="rounded-2xl p-5" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <h2 className="font-black text-white">
                                {filter === "all" ? `All Jobs (${allJobs.length})` : `${filter.charAt(0).toUpperCase() + filter.slice(1)} (${filtered.length})`}
                            </h2>
                            {filter !== "all" && (
                                <button onClick={() => handleFilter("all")} className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-white/10"
                                    style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                                    Clear ×
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs animate-pulse" style={{ color: "rgba(255,255,255,0.3)" }}>Auto-refreshing every 5s</span>
                            {totalPages > 1 && (
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                                        className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors">
                                        <ChevronLeft className="h-4 w-4 text-white" />
                                    </button>
                                    <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>{page} / {totalPages}</span>
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                                        className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors">
                                        <ChevronRight className="h-4 w-4 text-white" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {isLoading ? (
                        <SkeletonTable rows={6} />
                    ) : jobs.length === 0 ? (
                        <EmptyState icon={Briefcase} title={filter === "all" ? "No jobs yet" : `No ${filter} jobs`}
                            description={filter === "all" ? "Run an extraction to see jobs here." : `No jobs with status "${filter}" found.`}
                            action={filter !== "all" ? () => handleFilter("all") : undefined}
                            actionLabel={filter !== "all" ? "Clear filter" : undefined} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs font-bold border-b" style={{ color: "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.06)" }}>
                                        <th className="pb-3 pr-4">Job ID</th>
                                        <th className="pb-3 pr-4 cursor-pointer select-none hover:text-white/60 transition-colors" onClick={() => handleSort("schema_name")}>
                                            Schema <SortIcon col="schema_name" sortKey={sortKey} sortDir={sortDir} />
                                        </th>
                                        <th className="pb-3 pr-4 cursor-pointer select-none hover:text-white/60 transition-colors" onClick={() => handleSort("status")}>
                                            Status <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
                                        </th>
                                        <th className="pb-3 pr-4">Quality</th>
                                        <th className="pb-3 pr-4 cursor-pointer select-none hover:text-white/60 transition-colors" onClick={() => handleSort("provider")}>
                                            Provider <SortIcon col="provider" sortKey={sortKey} sortDir={sortDir} />
                                        </th>
                                        <th className="pb-3 pr-4 cursor-pointer select-none hover:text-white/60 transition-colors" onClick={() => handleSort("duration_seconds")}>
                                            Duration <SortIcon col="duration_seconds" sortKey={sortKey} sortDir={sortDir} />
                                        </th>
                                        <th className="pb-3 cursor-pointer select-none hover:text-white/60 transition-colors" onClick={() => handleSort("created_at")}>
                                            Created <SortIcon col="created_at" sortKey={sortKey} sortDir={sortDir} />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobs.map((job: { job_id: string; schema_name: string; status: string; provider: string; model: string; duration_seconds: number; created_at: string; error?: string; result?: { quality?: { score?: number } } }) => (
                                        <tr key={job.job_id} className="border-b group transition-colors hover:bg-white/[0.02]" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                                            <td className="py-3 pr-4">
                                                <div className="flex items-center gap-1.5">
                                                    <Link to="/results" className="font-mono text-xs hover:underline" style={{ color: "#60a5fa" }}>
                                                        {job.job_id.slice(0, 10)}…
                                                    </Link>
                                                    <button onClick={() => copyId(job.job_id)} title="Copy full ID"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/10">
                                                        {copiedId === job.job_id
                                                            ? <Check className="h-3 w-3" style={{ color: "#22c55e" }} />
                                                            : <Copy className="h-3 w-3" style={{ color: "rgba(255,255,255,0.4)" }} />
                                                        }
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-3 pr-4 max-w-[140px] truncate font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>{job.schema_name || "—"}</td>
                                            <td className="py-3 pr-4">
                                                <StatusBadge status={job.status} />
                                                {job.status === "failed" && job.error && (
                                                    <p className="text-xs mt-0.5 max-w-[160px] truncate" style={{ color: "#ef4444" }} title={job.error}>{job.error}</p>
                                                )}
                                            </td>
                                            <td className="py-3 pr-4"><GradeBadge score={job.result?.quality?.score ?? 0} /></td>
                                            <td className="py-3 pr-4 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{job.provider || "python"}</td>
                                            <td className="py-3 pr-4 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{job.duration_seconds ? `${job.duration_seconds}s` : "—"}</td>
                                            <td className="py-3 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                                                <div className="flex items-center gap-2">
                                                    <span>{job.created_at ? new Date(job.created_at).toLocaleString() : "—"}</span>
                                                    {(job.status === "running" || job.status === "pending") && (
                                                        <button onClick={() => cancelMut.mutate(job.job_id)}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold"
                                                            style={{ backgroundColor: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
                                                            title="Cancel job">
                                                            <StopCircle className="h-3 w-3" />Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
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
                                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
                            </span>
                            <div className="flex gap-1">
                                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                                    <button key={p} onClick={() => setPage(p)}
                                        className="h-7 w-7 rounded-lg text-xs font-bold transition-all"
                                        style={{
                                            background: p === page ? "linear-gradient(135deg, #2563eb, #7c3aed)" : "rgba(255,255,255,0.04)",
                                            color: p === page ? "#fff" : "rgba(255,255,255,0.4)",
                                        }}>
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
