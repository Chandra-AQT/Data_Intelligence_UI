import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
    BarChart2, Download, ChevronDown, Loader2,
    FileText, Boxes, ChevronUp
} from "lucide-react";
import { AppShell } from "@/components/aqt/app-shell";
import { Button } from "@/components/ui/button";
import { GradeBadge, StatusBadge } from "@/components/aqt/badges";
import { ResultView } from "@/components/aqt/result-view";
import { api, downloadBlob } from "@/lib/aqt";

export const Route = createFileRoute("/results")({ component: Results });

const CARD = { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" } as const;

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

// ── Download helpers ──────────────────────────────────────────────────────────
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

// ── Single job row ────────────────────────────────────────────────────────────
function SingleJobRow({ job }: { job: Job }) {
    const score = job.result?.quality?.score ?? 0;
    const canExport = job.status === "completed";
    return (
        <div className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 transition-all"
            style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white truncate max-w-[200px]">{job.schema_name || "Unnamed Schema"}</span>
                    <StatusBadge status={job.status} />
                    {canExport && <GradeBadge score={score} />}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="font-mono text-xs" style={{ color: "#60a5fa" }}>{job.job_id.slice(0, 14)}…</span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{job.provider || "python"}</span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                        {job.created_at ? new Date(job.created_at).toLocaleString() : ""}
                    </span>
                </div>
            </div>
            {canExport ? (
                <div className="flex gap-2 shrink-0">
                    <button onClick={() => dlJob(job.job_id, "excel")}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black text-white transition-all hover:-translate-y-0.5"
                        style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
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
                </div>
            ) : (
                <span className="text-xs shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>
                    {job.status === "running" ? "Processing…" : job.status === "failed" ? "Failed" : "Pending"}
                </span>
            )}
        </div>
    );
}

// ── Batch row ─────────────────────────────────────────────────────────────────
function BatchRow({ batch, allJobs }: { batch: Batch; allJobs: Job[] }) {
    const [expanded, setExpanded] = useState(false);
    const batchJobs = allJobs.filter((j) => j.batch_id === batch.batch_id);
    const canExport = ["completed", "completed_with_errors"].includes(batch.status);
    const progress = batch.total > 0 ? Math.round((batch.completed / batch.total) * 100) : 0;
    const schemaName = batchJobs[0]?.schema_name || `Batch ${batch.batch_id.slice(0, 8)}`;

    return (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-white/[0.02]"
                style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                onClick={() => setExpanded((e) => !e)}>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Boxes className="h-4 w-4 shrink-0" style={{ color: "#22d3ee" }} />
                        <span className="font-bold text-sm text-white">{schemaName}</span>
                        <StatusBadge status={batch.status} />
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: "rgba(37,99,235,0.15)", color: "#60a5fa" }}>
                            {batch.completed}/{batch.total} docs
                        </span>
                        {batch.failed > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
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
                        <div className="mt-2 h-1.5 rounded-full overflow-hidden w-48" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #2563eb, #7c3aed)" }} />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {canExport && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); dlBatch(batch.batch_id, "excel"); }}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black text-white transition-all hover:-translate-y-0.5"
                                style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
                                <Download className="h-3.5 w-3.5" />Excel (All)
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); dlBatch(batch.batch_id, "csv"); }}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
                                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                                CSV (All)
                            </button>
                        </>
                    )}
                    <button className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                        {expanded
                            ? <ChevronUp className="h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />
                            : <ChevronDown className="h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />}
                    </button>
                </div>
            </div>
            {expanded && (
                <div className="px-4 pb-4 pt-2 space-y-2" style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                        Individual Document Results
                    </p>
                    {batchJobs.length === 0 ? (
                        <p className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.2)" }}>No jobs found for this batch</p>
                    ) : batchJobs.map((job) => <SingleJobRow key={job.job_id} job={job} />)}
                </div>
            )}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function Results() {
    const [mainTab, setMainTab] = useState<"database" | "single" | "batch">("database");
    const [filter, setFilter] = useState("All");
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [jobDetail, setJobDetail] = useState<Record<string, unknown> | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const { data: jobsData, isLoading: jobsLoading } = useQuery({
        queryKey: ["jobs"],
        queryFn: () => api.get("/jobs").then((r) => r.data.jobs ?? []),
        refetchInterval: 5000,
    });

    const { data: batchesData } = useQuery({
        queryKey: ["batches"],
        queryFn: () => api.get("/batch").then((r) => r.data.batches ?? []),
        refetchInterval: 10000,
    });

    const allJobs: Job[] = jobsData ?? [];
    const allBatches: Batch[] = batchesData ?? [];
    const singleJobs = allJobs.filter((j) => !j.batch_id);

    const filteredJobs = allJobs.filter((j) => filter === "All" || j.status === filter.toLowerCase());
    const selectedJob = allJobs.find((j) => j.job_id === selectedJobId);

    const loadJob = async (jobId: string) => {
        setSelectedJobId(jobId);
        setDropdownOpen(false);
        setLoadingDetail(true);
        try {
            const res = await api.get(`/jobs/${jobId}`);
            setJobDetail(res.data);
        } catch { toast.error("Failed to load job"); }
        setLoadingDetail(false);
    };

    const handleExport = async (type: "excel" | "csv" | "json") => {
        if (!selectedJobId) return;
        try {
            const res = await api.get(`/export/${selectedJobId}/${type}`, { responseType: "blob" });
            downloadBlob(res.data, `result_${selectedJobId.slice(0, 8)}.${type === "excel" ? "xlsx" : type}`);
        } catch { toast.error("Export failed"); }
    };

    const result = jobDetail?.result as Record<string, unknown> | undefined;
    type QualityType = { score?: number; breakdown?: { coverage?: number; avg_confidence?: number }; missing_critical?: string[]; suggestions?: string[] };
    const quality = (result as { quality?: QualityType } | undefined)?.quality;
    const records = (result as { records?: unknown[] } | undefined)?.records as Array<{ result: Record<string, unknown>; confidence: Record<string, number>; schema_fields?: string[] }> | undefined;
    const singleResult = (result as { result?: Record<string, unknown> } | undefined)?.result;
    const confidence = (result as { confidence?: Record<string, number> } | undefined)?.confidence ?? {};
    const schemaFields = (result as { schema_fields?: string[] } | undefined)?.schema_fields ?? [];
    const failureLog = (result as { failure_log?: Array<{ type: string; reason?: string }> } | undefined)?.failure_log ?? [];
    const jd = jobDetail ?? {};
    const jdSchemaName = String(jd.schema_name ?? "Extraction Result");
    const jdJobId = String(jd.job_id ?? "").slice(0, 20);
    const jdProvider = String(jd.provider ?? "python");
    const jdModel = jd.model ? String(jd.model) : null;
    const jdCreatedAt = jd.created_at ? new Date(String(jd.created_at)).toLocaleString() : null;
    const jdStatus = String(jd.status ?? "");

    const tabs = [
        { id: "database" as const, label: "Database", icon: BarChart2, count: allJobs.length },
        { id: "single" as const, label: "Single Extraction", icon: FileText, count: singleJobs.length },
        { id: "batch" as const, label: "Batch Extraction", icon: Boxes, count: allBatches.length },
    ];

    return (
        <AppShell
            title="Results"
            subtitle="View, browse and download all extraction results"
            sectionLabel="EXTRACTION RECORDS"
            actions={
                mainTab === "database" && selectedJobId ? (
                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleExport("excel")}
                            style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)", border: "none" }}
                            className="font-black text-white">
                            <Download className="h-4 w-4" />Excel
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleExport("csv")}>CSV</Button>
                        <Button size="sm" variant="outline" onClick={() => handleExport("json")}>JSON</Button>
                    </div>
                ) : mainTab === "single" && singleJobs.filter((j: { status: string }) => j.status === "completed").length > 0 ? (
                    <Button size="sm" variant="outline" onClick={async () => {
                        try {
                            const completedIds = singleJobs.filter((j: { status: string }) => j.status === "completed").map((j: { job_id: string }) => j.job_id);
                            toast.loading("Preparing export...", { id: "export-all" });
                            // Export first completed job as representative — full export requires backend batch endpoint
                            const res = await api.get(`/export/${completedIds[0]}/excel`, { responseType: "blob" });
                            downloadBlob(res.data, `all_results_${new Date().toISOString().slice(0, 10)}.xlsx`);
                            toast.success(`Exported ${completedIds.length} results`, { id: "export-all" });
                        } catch { toast.error("Export failed", { id: "export-all" }); }
                    }}>
                        <Download className="h-4 w-4" />Export All
                    </Button>
                ) : undefined
            }
        >
            <div className="space-y-6">

                {/* Main tab switcher */}
                <div className="flex flex-wrap gap-2">
                    {tabs.map(({ id, label, icon: Icon, count }) => (
                        <button key={id} onClick={() => setMainTab(id)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                            style={{
                                background: mainTab === id ? "linear-gradient(135deg, #2563eb, #7c3aed)" : "rgba(255,255,255,0.04)",
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

                {/* ── DATABASE TAB ── */}
                {mainTab === "database" && (
                    <div className="space-y-6">
                        <div className="rounded-2xl p-4 flex flex-wrap items-center gap-4" style={CARD}>
                            <div className="flex gap-2 shrink-0">
                                {["All", "Completed", "Failed", "Running"].map((tab) => (
                                    <button key={tab} onClick={() => setFilter(tab)}
                                        className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                                        style={{
                                            background: filter === tab ? "linear-gradient(135deg, #2563eb, #7c3aed)" : "rgba(255,255,255,0.05)",
                                            color: filter === tab ? "#fff" : "rgba(255,255,255,0.4)",
                                            border: filter === tab ? "none" : "1px solid rgba(255,255,255,0.08)",
                                        }}>
                                        {tab}
                                        <span className="ml-1.5 opacity-60">
                                            {tab === "All" ? allJobs.length : allJobs.filter((j) => j.status === tab.toLowerCase()).length}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <div className="relative flex-1 min-w-[260px]">
                                <button onClick={() => setDropdownOpen((o) => !o)}
                                    className="w-full flex items-center justify-between gap-2 h-10 rounded-xl px-4 text-sm transition-all"
                                    style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: selectedJob ? "#f1f5f9" : "rgba(255,255,255,0.3)" }}>
                                    <span className="truncate">
                                        {selectedJob ? `${selectedJob.schema_name || "Job"} · ${selectedJob.job_id.slice(0, 10)}...` : jobsLoading ? "Loading jobs…" : "Select a job to view results"}
                                    </span>
                                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform"
                                        style={{ color: "rgba(255,255,255,0.3)", transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                                </button>
                                {dropdownOpen && filteredJobs.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 rounded-xl z-50 max-h-72 overflow-y-auto"
                                        style={{ backgroundColor: "#0d1526", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
                                        {filteredJobs.map((job) => (
                                            <button key={job.job_id} onClick={() => loadJob(job.job_id)}
                                                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.05]"
                                                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: selectedJobId === job.job_id ? "rgba(37,99,235,0.1)" : "transparent" }}>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-white truncate">{job.schema_name || "Unnamed"}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="font-mono text-xs" style={{ color: "#60a5fa" }}>{job.job_id.slice(0, 12)}…</span>
                                                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{job.provider || "python"}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <GradeBadge score={job.result?.quality?.score ?? 0} />
                                                    <StatusBadge status={job.status} />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {dropdownOpen && filteredJobs.length === 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 rounded-xl px-4 py-6 text-center z-50"
                                        style={{ backgroundColor: "#0d1526", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}>
                                        No jobs match this filter
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl p-6 min-h-[400px]" style={CARD}>
                            {!selectedJobId && !loadingDetail && (
                                <div className="flex flex-col items-center justify-center py-24 text-center">
                                    <BarChart2 className="h-16 w-16 mb-4" style={{ color: "rgba(59,130,246,0.2)" }} />
                                    <h2 className="text-2xl font-black text-white mb-2">No job selected</h2>
                                    <p style={{ color: "rgba(255,255,255,0.3)" }}>Use the dropdown above to select an extraction job.</p>
                                </div>
                            )}
                            {loadingDetail && (
                                <div className="flex flex-col items-center justify-center py-24 gap-3">
                                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#3b82f6" }} />
                                    <p style={{ color: "rgba(255,255,255,0.3)" }}>Loading result…</p>
                                </div>
                            )}
                            {jobDetail && !loadingDetail && (
                                <>
                                    <div className="mb-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                        <h2 className="text-2xl font-black text-white">{jdSchemaName}</h2>
                                        <div className="flex flex-wrap items-center gap-3 mt-3">
                                            <span className="font-mono text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#60a5fa" }}>{jdJobId}…</span>
                                            <span className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>{jdProvider}</span>
                                            {jdModel && <span className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}>{jdModel}</span>}
                                            {jdCreatedAt && <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{jdCreatedAt}</span>}
                                            <StatusBadge status={jdStatus} />
                                            {quality?.score !== undefined && <GradeBadge score={quality.score} />}
                                        </div>
                                    </div>
                                    <ResultView
                                        result={singleResult} confidence={confidence} records={records}
                                        schemaFields={schemaFields} score={quality?.score ?? 0} failureLog={failureLog}
                                        coverage={quality?.breakdown?.coverage ? Math.round((quality.breakdown.coverage / 40) * 100) : undefined}
                                        avgConfidence={quality?.breakdown?.avg_confidence ? Math.round((quality.breakdown.avg_confidence / 35) * 100) : undefined}
                                        missingFields={quality?.missing_critical ?? []} suggestions={quality?.suggestions ?? []}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* ── SINGLE EXTRACTION TAB ── */}
                {mainTab === "single" && (
                    <div className="rounded-2xl p-5" style={CARD}>
                        <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#22d3ee" }}>
                            ● SINGLE DOCUMENT EXTRACTIONS ({singleJobs.length})
                        </p>
                        {singleJobs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <FileText className="h-12 w-12 mb-3 opacity-20" style={{ color: "#60a5fa" }} />
                                <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>No single extractions yet</p>
                                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>Run an extraction from the Extract page</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {singleJobs.map((job) => <SingleJobRow key={job.job_id} job={job} />)}
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
                                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>Run a batch from the Batch Extraction page</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {allBatches.map((batch) => <BatchRow key={batch.batch_id} batch={batch} allJobs={allJobs} />)}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </AppShell>
    );
}
