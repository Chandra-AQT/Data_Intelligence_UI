import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { BarChart2, Download, ChevronDown, Loader2 } from "lucide-react";
import { AppShell } from "@/components/aqt/app-shell";
import { Button } from "@/components/ui/button";
import { GradeBadge, StatusBadge } from "@/components/aqt/badges";
import { ResultView } from "@/components/aqt/result-view";
import { api, downloadBlob } from "@/lib/aqt";

export const Route = createFileRoute("/results")({ component: Results });

type Job = {
    job_id: string;
    schema_name: string;
    provider: string;
    model?: string;
    created_at: string;
    status: string;
    result?: { quality?: { score?: number } };
};

function Results() {
    const [filter, setFilter] = useState("All");
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [jobDetail, setJobDetail] = useState<Record<string, unknown> | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ["jobs"],
        queryFn: () => api.get("/jobs").then((r) => r.data.jobs ?? []),
        refetchInterval: 5000,
    });

    const allJobs: Job[] = data ?? [];
    const jobs = allJobs.filter((j) =>
        filter === "All" || j.status === filter.toLowerCase()
    );

    const selectedJob = allJobs.find((j) => j.job_id === selectedJobId);

    const loadJob = async (jobId: string) => {
        setSelectedJobId(jobId);
        setDropdownOpen(false);
        setLoadingDetail(true);
        try {
            const res = await api.get(`/jobs/${jobId}`);
            setJobDetail(res.data);
        } catch {
            toast.error("Failed to load job");
        }
        setLoadingDetail(false);
    };

    const handleExport = async (type: "excel" | "csv" | "json") => {
        if (!selectedJobId) return;
        try {
            const res = await api.get(`/export/${selectedJobId}/${type}`, { responseType: "blob" });
            downloadBlob(res.data, `result_${selectedJobId.slice(0, 8)}.${type === "excel" ? "xlsx" : type}`);
        } catch {
            toast.error("Export failed");
        }
    };

    const result = jobDetail?.result as Record<string, unknown> | undefined;
    type QualityType = { score?: number; breakdown?: { coverage?: number; avg_confidence?: number }; missing_critical?: string[]; suggestions?: string[] };
    const quality = (result as { quality?: QualityType } | undefined)?.quality;
    const records = (result as { records?: unknown[] } | undefined)?.records as Array<{ result: Record<string, unknown>; confidence: Record<string, number>; schema_fields?: string[] }> | undefined;
    const singleResult = (result as { result?: Record<string, unknown> } | undefined)?.result;
    const confidence = (result as { confidence?: Record<string, number> } | undefined)?.confidence ?? {};
    const schemaFields = (result as { schema_fields?: string[] } | undefined)?.schema_fields ?? [];
    const failureLog = (result as { failure_log?: Array<{ type: string; reason?: string }> } | undefined)?.failure_log ?? [];

    // Safe string helpers for unknown fields
    const jd = jobDetail ?? {};
    const jdSchemaName = String(jd.schema_name ?? "Extraction Result");
    const jdJobId = String(jd.job_id ?? "").slice(0, 20);
    const jdProvider = String(jd.provider ?? "python");
    const jdModel = jd.model ? String(jd.model) : null;
    const jdCreatedAt = jd.created_at ? new Date(String(jd.created_at)).toLocaleString() : null;
    const jdStatus = String(jd.status ?? "");

    return (
        <AppShell
            title="Database"
            subtitle="Browse all extraction runs and view full results"
            sectionLabel="EXTRACTION RECORDS"
            actions={
                selectedJobId ? (
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={() => handleExport("excel")}
                            style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)", border: "none" }}
                            className="font-black text-white"
                        >
                            <Download className="h-4 w-4" />Excel
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleExport("csv")}>CSV</Button>
                        <Button size="sm" variant="outline" onClick={() => handleExport("json")}>JSON</Button>
                    </div>
                ) : undefined
            }
        >
            <div className="space-y-6">

                {/* Top bar: filter tabs + job selector */}
                <div
                    className="rounded-2xl p-4 flex flex-wrap items-center gap-4"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                    {/* Filter tabs */}
                    <div className="flex gap-2 shrink-0">
                        {["All", "Completed", "Failed", "Running"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab)}
                                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                                style={{
                                    background: filter === tab ? "linear-gradient(135deg, #2563eb, #7c3aed)" : "rgba(255,255,255,0.05)",
                                    color: filter === tab ? "#fff" : "rgba(255,255,255,0.4)",
                                    border: filter === tab ? "none" : "1px solid rgba(255,255,255,0.08)",
                                }}
                            >
                                {tab}
                                <span className="ml-1.5 opacity-60">
                                    {tab === "All"
                                        ? allJobs.length
                                        : allJobs.filter((j) => j.status === tab.toLowerCase()).length}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Job selector dropdown */}
                    <div className="relative flex-1 min-w-[260px]">
                        <button
                            onClick={() => setDropdownOpen((o) => !o)}
                            className="w-full flex items-center justify-between gap-2 h-10 rounded-xl px-4 text-sm transition-all"
                            style={{
                                backgroundColor: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: selectedJob ? "#f1f5f9" : "rgba(255,255,255,0.3)",
                            }}
                        >
                            <span className="truncate">
                                {selectedJob
                                    ? `${selectedJob.schema_name || "Job"} · ${selectedJob.job_id.slice(0, 10)}...`
                                    : isLoading ? "Loading jobs…" : "Select a job to view results"}
                            </span>
                            <ChevronDown
                                className="h-4 w-4 shrink-0 transition-transform"
                                style={{
                                    color: "rgba(255,255,255,0.3)",
                                    transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                                }}
                            />
                        </button>

                        {dropdownOpen && jobs.length > 0 && (
                            <div
                                className="absolute top-full left-0 right-0 mt-1 rounded-xl z-50 max-h-72 overflow-y-auto"
                                style={{
                                    backgroundColor: "#0d1526",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                                }}
                            >
                                {jobs.map((job) => {
                                    const score = job.result?.quality?.score ?? 0;
                                    return (
                                        <button
                                            key={job.job_id}
                                            onClick={() => loadJob(job.job_id)}
                                            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.05]"
                                            style={{
                                                borderBottom: "1px solid rgba(255,255,255,0.04)",
                                                background: selectedJobId === job.job_id ? "rgba(37,99,235,0.1)" : "transparent",
                                            }}
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{job.schema_name || "Unnamed"}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="font-mono text-xs" style={{ color: "#60a5fa" }}>{job.job_id.slice(0, 12)}…</span>
                                                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{job.provider || "python"}</span>
                                                    {job.created_at && (
                                                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                                                            {new Date(job.created_at).toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <GradeBadge score={score} />
                                                <StatusBadge status={job.status} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {dropdownOpen && jobs.length === 0 && (
                            <div
                                className="absolute top-full left-0 right-0 mt-1 rounded-xl px-4 py-6 text-center z-50"
                                style={{ backgroundColor: "#0d1526", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}
                            >
                                No jobs match this filter
                            </div>
                        )}
                    </div>
                </div>

                {/* Full-width result detail */}
                <div
                    className="rounded-2xl p-6 min-h-[400px]"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                    {/* Empty state */}
                    {!selectedJobId && !loadingDetail && (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <BarChart2 className="h-16 w-16 mb-4" style={{ color: "rgba(59,130,246,0.2)" }} />
                            <h2 className="text-2xl font-black text-white mb-2">No job selected</h2>
                            <p style={{ color: "rgba(255,255,255,0.3)" }}>
                                Use the dropdown above to select an extraction job and view its full results.
                            </p>
                        </div>
                    )}

                    {/* Loading */}
                    {loadingDetail && (
                        <div className="flex flex-col items-center justify-center py-24 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#3b82f6" }} />
                            <p style={{ color: "rgba(255,255,255,0.3)" }}>Loading result…</p>
                        </div>
                    )}

                    {/* Result */}
                    {jobDetail && !loadingDetail && (
                        <>
                            {/* Job header */}
                            <div className="mb-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                <h2 className="text-2xl font-black text-white">{jdSchemaName}</h2>
                                <div className="flex flex-wrap items-center gap-3 mt-3">
                                    <span
                                        className="font-mono text-xs px-2 py-1 rounded-lg"
                                        style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#60a5fa" }}
                                    >
                                        {jdJobId}…
                                    </span>
                                    <span
                                        className="text-xs px-2 py-1 rounded-lg"
                                        style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}
                                    >
                                        {jdProvider}
                                    </span>
                                    {jdModel && (
                                        <span
                                            className="text-xs px-2 py-1 rounded-lg"
                                            style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}
                                        >
                                            {jdModel}
                                        </span>
                                    )}
                                    {jdCreatedAt && (
                                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                                            {jdCreatedAt}
                                        </span>
                                    )}
                                    <StatusBadge status={jdStatus} />
                                    {quality?.score !== undefined && <GradeBadge score={quality.score} />}
                                </div>
                            </div>

                            {/* Result view — full width */}
                            <ResultView
                                result={singleResult}
                                confidence={confidence}
                                records={records}
                                schemaFields={schemaFields}
                                score={quality?.score ?? 0}
                                failureLog={failureLog}
                                coverage={quality?.breakdown?.coverage ? Math.round((quality.breakdown.coverage / 40) * 100) : undefined}
                                avgConfidence={quality?.breakdown?.avg_confidence ? Math.round((quality.breakdown.avg_confidence / 35) * 100) : undefined}
                                missingFields={quality?.missing_critical ?? []}
                                suggestions={quality?.suggestions ?? []}
                            />
                        </>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
