import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
    BarChart2, Download, ChevronDown, ChevronUp,
    Loader2, FileText, Boxes, X, CheckCircle2, AlertCircle
} from "lucide-react";
import { AppShell } from "@/components/aqt/app-shell";
import { GradeBadge, StatusBadge } from "@/components/aqt/badges";
import { ResultView } from "@/components/aqt/result-view";
import { api, downloadBlob } from "@/lib/aqt";

export const Route = createFileRoute("/results")({ component: Results });

const CARD = { backgroundColor: "#0d1526", border: "1px solid rgba(255,255,255,0.1)" } as const;
const INNER = { backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" } as const;

type Job = {
    job_id: string;
    schema_name: string;
    provider: string;
    model?: string;
    created_at: string;
    status: string;
    batch_id?: string | null;
    result?: { quality?: { score?: number } };
};

type Batch = {
    batch_id: string;
    schema_id: string;
    status: string;
    total: number;
    completed: number;
    failed: number;
    job_ids: string[];
    created_at: string;
};

// ── helpers ───────────────────────────────────────────────────────────────────
async function dlJob(jobId: string, type: "excel" | "csv" | "json") {
    try {
        const res = await api.get(`/export/${jobId}/${type}`, { responseType: "blob" });
        downloadBlob(res.data, `result_${jobId.slice(0, 8)}.${type === "excel" ? "xlsx" : type}`);
    } catch { toast.error("Export failed"); }
}

async function dlBatch(batchId: string, type: "excel" | "csv") {
    try {
        const res = await api.get(`/batch/${batchId}/${type}`, { responseType: "blob" });
        downloadBlob(res.data, `batch_${batchId.slice(0, 8)}.${type === "excel" ? "xlsx" : "csv"}`);
    } catch { toast.error("Export failed"); }
}

// ── Result drawer shown below a clicked row ───────────────────────────────────
function ResultDrawer({ jobId, onClose }: { jobId: string; onClose: () => void }) {
    const { data, isLoading, error } = useQuery({
        queryKey: ["job-detail", jobId],
        queryFn: () => api.get(`/jobs/${jobId}`).then(r => r.data),
        staleTime: 30_000,
    });

    const result = data?.result as Record<string, unknown> | undefined;
    type QT = { score?: number; breakdown?: { coverage?: number; avg_confidence?: number }; missing_critical?: string[]; suggestions?: string[] };
    const quality = (result as { quality?: QT } | undefined)?.quality;
    const records = (result as { records?: unknown[] } | undefined)?.records as
        Array<{ result: Record<string, unknown>; confidence: Record<string, number>; schema_fields?: string[] }> | undefined;
    const singleResult = (result as { result?: Record<string, unknown> } | undefined)?.result;
    const confidence = (result as { confidence?: Record<string, number> } | undefined)?.confidence ?? {};
    const schemaFields = (result as { schema_fields?: string[] } | undefined)?.schema_fields ?? [];
    const failureLog = (result as { failure_log?: Array<{ type: string; reason?: string }> } | undefined)?.failure_log ?? [];

    return (
        <div className="rounded-2xl mt-2 overflow-hidden"
            style={{ backgroundColor: "#0a1020", border: "1px solid rgba(37,99,235,0.35)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-3"
                style={{ backgroundColor: "rgba(37,99,235,0.08)", borderBottom: "1px solid rgba(37,99,235,0.2)" }}>
                <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: "#3b82f6" }} />
                    <span className="text-sm font-black text-white">{data?.schema_name ?? "Extraction Result"}</span>
                    <span className="font-mono text-xs" style={{ color: "#60a5fa" }}>{jobId.slice(0, 14)}…</span>
                    {data?.provider && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                            style={{ backgroundColor: "rgba(37,99,235,0.15)", color: "#60a5fa" }}>
                            {String(data.provider)}
                        </span>
                    )}
                    {quality?.score !== undefined && <GradeBadge score={quality.score} />}
                </div>
                <div className="flex items-center gap-2">
                    {data?.status === "completed" && (
                        <>
                            <button onClick={() => dlJob(jobId, "excel")}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black text-white transition-all hover:-translate-y-0.5"
                                style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                                <Download className="h-3 w-3" />Excel
                            </button>
                            <button onClick={() => dlJob(jobId, "csv")}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
                                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                                CSV
                            </button>
                            <button onClick={() => dlJob(jobId, "json")}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
                                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                                JSON
                            </button>
                        </>
                    )}
                    <button onClick={onClose}
                        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                        style={{ color: "rgba(255,255,255,0.4)" }}>
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Drawer body */}
            <div className="p-5">
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#3b82f6" }} />
                        <span className="ml-3 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading result…</span>
                    </div>
                )}
                {error && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <AlertCircle className="h-8 w-8 mb-2" style={{ color: "#ef4444" }} />
                        <p className="text-sm font-bold" style={{ color: "#ef4444" }}>Failed to load result</p>
                    </div>
                )}
                {data && !isLoading && (
                    data.status === "failed" ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <AlertCircle className="h-10 w-10 mb-3" style={{ color: "#ef4444" }} />
                            <p className="text-sm font-bold" style={{ color: "#ef4444" }}>Extraction Failed</p>
                            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                                {String((data.result as { error?: string } | undefined)?.error ?? "No details available")}
                            </p>
                        </div>
                    ) : data.status === "running" ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Loader2 className="h-10 w-10 animate-spin mb-3" style={{ color: "#3b82f6" }} />
                            <p className="text-sm font-bold text-white">Extraction in progress…</p>
                        </div>
                    ) : (
                        <ResultView
                            result={singleResult}
                            confidence={confidence}
                            records={records}
                            schemaFields={schemaFields}
                            score={quality?.score ?? 0}
                            failureLog={failureLog}
                            provider={String(data.provider ?? "")}
                            schemaName={String(data.schema_name ?? "")}
                            jobId={jobId}
                            coverage={quality?.breakdown?.coverage ? Math.round((quality.breakdown.coverage / 40) * 100) : undefined}
                            avgConfidence={quality?.breakdown?.avg_confidence ? Math.round((quality.breakdown.avg_confidence / 35) * 100) : undefined}
                            missingFields={quality?.missing_critical ?? []}
                            suggestions={quality?.suggestions ?? []}
                        />
                    )
                )}
            </div>
        </div>
    );
}

// ── Single job row (clickable) ────────────────────────────────────────────────
function SingleJobRow({ job }: { job: Job }) {
    const [open, setOpen] = useState(false);
    const score = job.result?.quality?.score ?? 0;
    const canExport = job.status === "completed";

    return (
        <div>
            <div
                onClick={() => setOpen(o => !o)}
                className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-all hover:bg-white/[0.03]"
                style={{
                    backgroundColor: open ? "rgba(37,99,235,0.08)" : "rgba(255,255,255,0.02)",
                    border: open ? "1px solid rgba(37,99,235,0.35)" : "1px solid rgba(255,255,255,0.06)",
                }}>
                {/* Icon */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: canExport ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.06)" }}>
                    {canExport
                        ? <CheckCircle2 className="h-4 w-4" style={{ color: "#22c55e" }} />
                        : <FileText className="h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white truncate max-w-[220px]">{job.schema_name || "Unnamed Schema"}</span>
                        <StatusBadge status={job.status} />
                        {canExport && <GradeBadge score={score} />}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="font-mono text-xs" style={{ color: "#60a5fa" }}>{job.job_id.slice(0, 14)}…</span>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{job.provider || "python"}</span>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                            {job.created_at ? new Date(job.created_at).toLocaleString() : ""}
                        </span>
                    </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    {canExport && (
                        <>
                            <button onClick={() => dlJob(job.job_id, "excel")}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black text-white transition-all hover:-translate-y-0.5"
                                style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                                <Download className="h-3.5 w-3.5" />Excel
                            </button>
                            <button onClick={() => dlJob(job.job_id, "csv")}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
                                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                                CSV
                            </button>
                            <button onClick={() => dlJob(job.job_id, "json")}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
                                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                                JSON
                            </button>
                        </>
                    )}
                </div>
                {/* Expand chevron */}
                <div className="shrink-0">
                    {open
                        ? <ChevronUp className="h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />
                        : <ChevronDown className="h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />}
                </div>
            </div>

            {/* Inline result drawer */}
            {open && <ResultDrawer jobId={job.job_id} onClose={() => setOpen(false)} />}
        </div>
    );
}

// ── Batch row (clickable header + per-doc rows) ───────────────────────────────
function BatchRow({ batch, allJobs }: { batch: Batch; allJobs: Job[] }) {
    const [expanded, setExpanded] = useState(false);
    const batchJobs = allJobs.filter(j => j.batch_id === batch.batch_id);
    const canExport = ["completed", "completed_with_errors"].includes(batch.status);
    const progress = batch.total > 0 ? Math.round((batch.completed / batch.total) * 100) : 0;
    const schemaName = batchJobs[0]?.schema_name || `Batch ${batch.batch_id.slice(0, 8)}`;

    return (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            {/* Batch header row */}
            <div
                className="flex flex-wrap items-center gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-white/[0.02]"
                style={{ backgroundColor: expanded ? "rgba(37,99,235,0.06)" : "rgba(255,255,255,0.03)" }}
                onClick={() => setExpanded(e => !e)}>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Boxes className="h-4 w-4 shrink-0" style={{ color: "#22d3ee" }} />
                        <span className="font-bold text-sm text-white">{schemaName}</span>
                        <StatusBadge status={batch.status} />
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                            style={{ backgroundColor: "rgba(37,99,235,0.15)", color: "#60a5fa" }}>
                            {batch.completed}/{batch.total} docs
                        </span>
                        {batch.failed > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                                style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                                {batch.failed} failed
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="font-mono text-xs" style={{ color: "#60a5fa" }}>{batch.batch_id.slice(0, 14)}…</span>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                            {batch.created_at ? new Date(batch.created_at).toLocaleString() : ""}
                        </span>
                    </div>
                    {batch.status === "running" && (
                        <div className="mt-2 h-1.5 rounded-full overflow-hidden w-48"
                            style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full transition-all"
                                style={{ width: `${progress}%`, background: "linear-gradient(90deg,#2563eb,#7c3aed)" }} />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    {canExport && (
                        <>
                            <button onClick={() => dlBatch(batch.batch_id, "excel")}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black text-white transition-all hover:-translate-y-0.5"
                                style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                                <Download className="h-3.5 w-3.5" />Excel (All)
                            </button>
                            <button onClick={() => dlBatch(batch.batch_id, "csv")}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
                                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                                CSV (All)
                            </button>
                        </>
                    )}
                </div>
                <div className="shrink-0">
                    {expanded
                        ? <ChevronUp className="h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />
                        : <ChevronDown className="h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />}
                </div>
            </div>

            {/* Expanded: per-doc job rows */}
            {expanded && (
                <div className="px-4 pb-4 pt-2 space-y-2" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                        ● INDIVIDUAL DOCUMENT RESULTS
                    </p>
                    {batchJobs.length === 0 ? (
                        <div className="py-6 text-center">
                            <Loader2 className="mx-auto h-5 w-5 animate-spin mb-2" style={{ color: "#3b82f6" }} />
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>Loading documents…</p>
                        </div>
                    ) : (
                        batchJobs.map(job => <SingleJobRow key={job.job_id} job={job} />)
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function Results() {
    const [mainTab, setMainTab] = useState<"single" | "batch">("batch");

    const { data: jobsData, isLoading: jobsLoading } = useQuery({
        queryKey: ["jobs"],
        queryFn: () => api.get("/jobs").then(r => r.data.jobs ?? []),
        refetchInterval: 5000,
    });

    const { data: batchesData } = useQuery({
        queryKey: ["batches"],
        queryFn: () => api.get("/batch").then(r => r.data.batches ?? []),
        refetchInterval: 10000,
    });

    const allJobs: Job[] = jobsData ?? [];
    const allBatches: Batch[] = batchesData ?? [];
    // Single tab shows ALL individual jobs (standalone + inside batches)
    const singleJobs = allJobs;

    const tabs = [
        { id: "single" as const, label: "Single Extraction", icon: FileText, count: singleJobs.length },
        { id: "batch" as const, label: "Batch Extraction", icon: Boxes, count: allBatches.length },
    ];

    return (
        <AppShell
            title="Results"
            subtitle="Click any row to view extracted data inline"
            sectionLabel="EXTRACTION RECORDS"
        >
            <div className="space-y-6">

                {/* Tab switcher */}
                <div className="flex flex-wrap gap-2">
                    {tabs.map(({ id, label, icon: Icon, count }) => (
                        <button key={id} onClick={() => setMainTab(id)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                            style={{
                                background: mainTab === id ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "rgba(255,255,255,0.04)",
                                color: mainTab === id ? "#fff" : "rgba(255,255,255,0.5)",
                                border: mainTab === id ? "none" : "1px solid rgba(255,255,255,0.08)",
                            }}>
                            <Icon className="h-4 w-4" />
                            {label}
                            <span className="rounded-full px-2 py-0.5 text-xs font-black"
                                style={{ backgroundColor: mainTab === id ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)" }}>
                                {count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* ── SINGLE EXTRACTION TAB ── */}
                {mainTab === "single" && (
                    <div className="rounded-2xl p-5" style={CARD}>
                        <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#22d3ee" }}>
                            ● SINGLE DOCUMENT EXTRACTIONS ({singleJobs.length})
                        </p>
                        {jobsLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#3b82f6" }} />
                            </div>
                        ) : singleJobs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <FileText className="h-12 w-12 mb-3 opacity-20" style={{ color: "#60a5fa" }} />
                                <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>No single extractions yet</p>
                                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>Run an extraction from the Extract page</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {singleJobs.map(job => <SingleJobRow key={job.job_id} job={job} />)}
                            </div>
                        )}
                    </div>
                )}

                {/* ── BATCH EXTRACTION TAB ── */}
                {mainTab === "batch" && (
                    <div className="rounded-2xl p-5" style={CARD}>
                        <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#22d3ee" }}>
                            ● BATCH EXTRACTION SESSIONS ({allBatches.length})
                        </p>
                        {allBatches.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <Boxes className="h-12 w-12 mb-3 opacity-20" style={{ color: "#22d3ee" }} />
                                <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>No batch sessions yet</p>
                                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>Run a batch from the Extract page</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {allBatches.map(batch => <BatchRow key={batch.batch_id} batch={batch} allJobs={allJobs} />)}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </AppShell>
    );
}
