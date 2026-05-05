import { useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import {
    Globe, Upload, Plus, X, Loader2, Download, CheckCircle2,
    AlertCircle, ChevronRight, Layers3, BarChart2, Link, Trash2,
    RefreshCw, FolderOpen
} from "lucide-react";
import { AppShell } from "@/components/aqt/app-shell";
import { api, downloadBlob } from "@/lib/aqt";

export const Route = createFileRoute("/webextract")({ component: WebExtract });

const CARD = { backgroundColor: "#0d1526", border: "1px solid rgba(255,255,255,0.1)" } as const;
const INPUT = { backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc" } as const;

type CrawlJob = {
    job_id: string;
    status: string;
    total: number;
    completed: number;
    failed: number;
    result_count: number;
    schema_name: string;
    created_at: string;
};

// ── Main page ─────────────────────────────────────────────────────────────────
function WebExtract() {
    const [tab, setTab] = useState<"new" | "jobs">("new");
    const [inputMode, setInputMode] = useState<"manual" | "file">("manual");
    const [urls, setUrls] = useState<string[]>([""]);
    const [schemaId, setSchemaId] = useState("");
    const [maxDepth, setMaxDepth] = useState(1);
    const [maxPages, setMaxPages] = useState(50);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [jobResults, setJobResults] = useState<Record<string, unknown>[] | null>(null);

    const qc = useQueryClient();

    // Load schemas
    const { data: schemasData } = useQuery({
        queryKey: ["schemas"],
        queryFn: () => api.get("/schemas").then(r => r.data.schemas ?? []),
    });
    const schemas = schemasData ?? [];

    // Poll active job
    const { data: jobStatus } = useQuery({
        queryKey: ["webcrawl-job", activeJobId],
        queryFn: () => api.get(`/webcrawl/${activeJobId}`).then(r => r.data),
        enabled: !!activeJobId,
        refetchInterval: (q) => {
            const d = q.state.data as CrawlJob | undefined;
            return d?.status === "running" ? 2000 : false;
        },
    });

    // File upload dropzone
    const onDropFile = useCallback(async (files: File[]) => {
        if (!files[0]) return;
        if (!schemaId) {
            toast.error("Please select a schema first (right panel) before uploading a URL file");
            return;
        }
        const fd = new FormData();
        fd.append("file", files[0]);
        fd.append("schema_id", schemaId);
        fd.append("max_depth", String(maxDepth));
        fd.append("max_pages", String(maxPages));
        try {
            const res = await api.post("/webcrawl/run-from-file", fd);
            toast.success(`Found ${res.data.total_urls} URLs — crawling started`);
            setActiveJobId(res.data.job_id);
            setTab("jobs");
        } catch (err: unknown) {
            toast.error((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Upload failed");
        }
    }, [schemaId, maxDepth, maxPages]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: onDropFile,
        accept: {
            "text/csv": [".csv"],
            "text/plain": [".txt"],
            "application/json": [".json"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
        },
        multiple: false,
    });

    // Start crawl mutation
    const startMut = useMutation({
        mutationFn: () => {
            const validUrls = urls.filter(u => u.trim().startsWith("http"));
            if (!validUrls.length) throw new Error("Add at least one valid URL");
            if (!schemaId) throw new Error("Select a schema");
            return api.post("/webcrawl/run", {
                urls: validUrls,
                schema_id: schemaId,
                max_depth: maxDepth,
                max_pages: maxPages,
            });
        },
        onSuccess: (res) => {
            toast.success(`Crawling ${res.data.total_urls} URL(s)...`);
            setActiveJobId(res.data.job_id);
            setTab("jobs");
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const loadResults = async (jobId: string) => {
        try {
            const res = await api.get(`/webcrawl/${jobId}/results`);
            setJobResults(res.data.results);
            setActiveJobId(jobId);
        } catch { toast.error("Failed to load results"); }
    };

    const addUrl = () => setUrls(u => [...u, ""]);
    const removeUrl = (i: number) => setUrls(u => u.filter((_, idx) => idx !== i));
    const updateUrl = (i: number, val: string) => setUrls(u => u.map((x, idx) => idx === i ? val : x));

    const validUrls = urls.filter(u => u.trim().startsWith("http"));

    return (
        <AppShell title="Web Extract" subtitle="Crawl websites and extract structured data using your schema" sectionLabel="WEB EXTRACTION">
            <div className="space-y-6">

                {/* Tab switcher */}
                <div className="flex gap-2">
                    {[
                        { id: "new" as const, label: "New Crawl", icon: Globe },
                        { id: "jobs" as const, label: "Crawl Jobs", icon: BarChart2 },
                    ].map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setTab(id)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                            style={{
                                background: tab === id ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "rgba(255,255,255,0.04)",
                                color: tab === id ? "#fff" : "rgba(255,255,255,0.5)",
                                border: tab === id ? "none" : "1px solid rgba(255,255,255,0.08)",
                            }}>
                            <Icon className="h-4 w-4" />{label}
                        </button>
                    ))}
                </div>

                {/* ── NEW CRAWL TAB ── */}
                {tab === "new" && (
                    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                        {/* Left: URL input */}
                        <div className="space-y-5">
                            {/* Input mode toggle */}
                            <div className="rounded-2xl p-5" style={CARD}>
                                <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#22d3ee" }}>● URL SOURCE</p>
                                <div className="flex gap-3 mb-5">
                                    {[
                                        { id: "manual" as const, label: "Enter URLs manually" },
                                        { id: "file" as const, label: "Upload URL file" },
                                    ].map(opt => (
                                        <button key={opt.id} onClick={() => setInputMode(opt.id)}
                                            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                                            style={{
                                                background: inputMode === opt.id ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "rgba(255,255,255,0.04)",
                                                color: inputMode === opt.id ? "#fff" : "rgba(255,255,255,0.5)",
                                                border: inputMode === opt.id ? "none" : "1px solid rgba(255,255,255,0.08)",
                                            }}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>

                                {inputMode === "manual" ? (
                                    <div className="space-y-2">
                                        {urls.map((url, i) => (
                                            <div key={i} className="flex gap-2 items-center">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                                    style={{ backgroundColor: "rgba(37,99,235,0.15)" }}>
                                                    <Link className="h-3.5 w-3.5" style={{ color: "#60a5fa" }} />
                                                </div>
                                                <input
                                                    value={url}
                                                    onChange={e => updateUrl(i, e.target.value)}
                                                    placeholder="https://example.com/products/..."
                                                    className="flex-1 h-9 rounded-lg px-3 text-sm font-mono"
                                                    style={INPUT}
                                                />
                                                {urls.length > 1 && (
                                                    <button onClick={() => removeUrl(i)}
                                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                                                        style={{ color: "rgba(255,255,255,0.3)" }}>
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button onClick={addUrl}
                                            className="flex items-center gap-2 mt-2 text-sm font-bold transition-colors hover:text-white"
                                            style={{ color: "#60a5fa" }}>
                                            <Plus className="h-4 w-4" /> Add another URL
                                        </button>
                                        {validUrls.length > 0 && (
                                            <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                                                {validUrls.length} valid URL{validUrls.length > 1 ? "s" : ""} ready to crawl
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        {!schemaId && (
                                            <div className="mb-3 rounded-xl p-3 text-xs font-bold flex items-center gap-2"
                                                style={{ backgroundColor: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }}>
                                                ⚠ Select a schema in the right panel before uploading your URL file
                                            </div>
                                        )}
                                        <div {...getRootProps()} className="rounded-2xl p-8 text-center cursor-pointer transition-all"
                                            style={{
                                                border: !schemaId ? "2px dashed rgba(245,158,11,0.3)" : isDragActive ? "2px dashed #2563eb" : "2px dashed rgba(255,255,255,0.12)",
                                                backgroundColor: !schemaId ? "rgba(245,158,11,0.03)" : isDragActive ? "rgba(37,99,235,0.08)" : "rgba(255,255,255,0.02)",
                                            }}>
                                            <input {...getInputProps()} />
                                            <Upload className="mx-auto h-10 w-10 mb-3" style={{ color: !schemaId ? "#f59e0b" : isDragActive ? "#60a5fa" : "rgba(255,255,255,0.3)" }} />
                                            <p className="text-base font-black text-white">
                                                {!schemaId ? "Select a schema first →" : isDragActive ? "Drop file here" : "Drop your URL file here"}
                                            </p>
                                            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                                                CSV · TXT · Excel · JSON — one URL per row/value
                                            </p>
                                        </div>
                                        <div className="mt-3 rounded-xl p-3 text-xs" style={{ backgroundColor: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)", color: "#60a5fa" }}>
                                            💡 File format: one URL per line, CSV/Excel with URLs in any column, or a JSON file with URLs as values. The system auto-detects them.
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Crawl settings */}
                            <div className="rounded-2xl p-5" style={CARD}>
                                <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#22d3ee" }}>● CRAWL SETTINGS</p>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                                            Crawl Depth
                                        </label>
                                        <select value={maxDepth} onChange={e => setMaxDepth(Number(e.target.value))}
                                            className="w-full h-10 rounded-lg px-3 text-sm" style={INPUT}>
                                            <option value={1}>1 — Single page only</option>
                                            <option value={2}>2 — Page + direct links</option>
                                            <option value={3}>3 — Deep crawl (3 levels)</option>
                                            <option value={5}>5 — Full site crawl</option>
                                        </select>
                                        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                                            {maxDepth === 1 ? "Extracts from the given URL only" :
                                                maxDepth === 2 ? "Follows links on the page (product listings)" :
                                                    "Crawls the entire site structure"}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                                            Max Pages per URL
                                        </label>
                                        <select value={maxPages} onChange={e => setMaxPages(Number(e.target.value))}
                                            className="w-full h-10 rounded-lg px-3 text-sm" style={INPUT}>
                                            <option value={10}>10 pages</option>
                                            <option value={25}>25 pages</option>
                                            <option value={50}>50 pages</option>
                                            <option value={100}>100 pages</option>
                                            <option value={200}>200 pages</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Schema + Start */}
                        <div className="space-y-5">
                            <div className="rounded-2xl p-5" style={CARD}>
                                <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#22d3ee" }}>● SCHEMA</p>
                                {schemas.length === 0 ? (
                                    <div className="py-6 text-center">
                                        <Layers3 className="mx-auto h-8 w-8 mb-2 opacity-20" style={{ color: "#60a5fa" }} />
                                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No schemas yet</p>
                                        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>Create one in the Schemas page</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                        {schemas.map((s: { id: string; name: string; field_count: number; domain: string }) => (
                                            <button key={s.id} onClick={() => setSchemaId(s.id)}
                                                className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all"
                                                style={{
                                                    backgroundColor: schemaId === s.id ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.02)",
                                                    border: schemaId === s.id ? "1px solid rgba(37,99,235,0.4)" : "1px solid rgba(255,255,255,0.06)",
                                                }}>
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                                    style={{ background: schemaId === s.id ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "rgba(255,255,255,0.06)" }}>
                                                    <Layers3 className="h-4 w-4 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-white truncate">{s.name}</p>
                                                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{s.field_count} fields{s.domain ? ` · ${s.domain}` : ""}</p>
                                                </div>
                                                {schemaId === s.id && <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#22c55e" }} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Summary + Start */}
                            {inputMode === "manual" && (
                                <div className="rounded-2xl p-5 space-y-4" style={CARD}>
                                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22d3ee" }}>● SUMMARY</p>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span style={{ color: "rgba(255,255,255,0.4)" }}>URLs</span>
                                            <span className="font-bold text-white">{validUrls.length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span style={{ color: "rgba(255,255,255,0.4)" }}>Depth</span>
                                            <span className="font-bold text-white">{maxDepth} level{maxDepth > 1 ? "s" : ""}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span style={{ color: "rgba(255,255,255,0.4)" }}>Max pages</span>
                                            <span className="font-bold text-white">{maxPages}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span style={{ color: "rgba(255,255,255,0.4)" }}>Schema</span>
                                            <span className="font-bold text-white truncate max-w-[140px]">
                                                {schemas.find((s: { id: string; name: string }) => s.id === schemaId)?.name ?? "—"}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => startMut.mutate()}
                                        disabled={startMut.isPending || validUrls.length === 0 || !schemaId}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-white transition-all disabled:opacity-40 hover:-translate-y-0.5"
                                        style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                                        {startMut.isPending
                                            ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting...</>
                                            : <><Globe className="h-4 w-4" /> Start Web Crawl</>}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── JOBS TAB ── */}
                {tab === "jobs" && (
                    <div className="space-y-5">
                        {/* Active job progress */}
                        {activeJobId && jobStatus && (
                            <div className="rounded-2xl p-5" style={{ ...CARD, border: "1px solid rgba(37,99,235,0.3)" }}>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-sm font-black text-white">{jobStatus.schema_name}</p>
                                        <p className="text-xs font-mono mt-0.5" style={{ color: "#60a5fa" }}>{activeJobId.slice(0, 16)}…</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {jobStatus.status === "running" && (
                                            <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "#60a5fa" }}>
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Crawling...
                                            </span>
                                        )}
                                        {jobStatus.status === "completed" && (
                                            <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "#22c55e" }}>
                                                <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                                            </span>
                                        )}
                                        {jobStatus.status === "failed" && (
                                            <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "#ef4444" }}>
                                                <AlertCircle className="h-3.5 w-3.5" /> Failed
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                                    <div className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${jobStatus.total > 0 ? Math.round((jobStatus.completed / jobStatus.total) * 100) : 0}%`,
                                            background: jobStatus.status === "completed" ? "#22c55e" : "linear-gradient(90deg,#2563eb,#7c3aed)",
                                        }} />
                                </div>

                                <div className="flex items-center justify-between text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                                    <span>{jobStatus.completed}/{jobStatus.total} URLs · {jobStatus.result_count} records found</span>
                                    {jobStatus.status === "completed" && (
                                        <div className="flex gap-2">
                                            <button onClick={() => loadResults(activeJobId)}
                                                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all hover:-translate-y-0.5"
                                                style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "#fff" }}>
                                                <BarChart2 className="h-3 w-3" /> View Results
                                            </button>
                                            <button onClick={() => downloadBlob(
                                                new Blob([]),
                                                `webcrawl_${activeJobId.slice(0, 8)}.xlsx`
                                            ) || api.get(`/webcrawl/${activeJobId}/excel`, { responseType: "blob" }).then(r => downloadBlob(r.data, `webcrawl_${activeJobId.slice(0, 8)}.xlsx`))}
                                                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
                                                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                                                <Download className="h-3 w-3" /> Excel
                                            </button>
                                            <button onClick={() => api.get(`/webcrawl/${activeJobId}/csv`, { responseType: "blob" }).then(r => downloadBlob(r.data, `webcrawl_${activeJobId.slice(0, 8)}.csv`))}
                                                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
                                                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                                                CSV
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Results table */}
                        {jobResults && jobResults.length > 0 && (
                            <div className="rounded-2xl overflow-hidden" style={CARD}>
                                <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22d3ee" }}>
                                        ● {jobResults.length} RECORDS EXTRACTED
                                    </p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                                                {Object.keys(jobResults[0]).filter(k => k !== "page_title").slice(0, 8).map(col => (
                                                    <th key={col} className="px-4 py-3 text-left font-bold uppercase tracking-wide"
                                                        style={{ color: "rgba(255,255,255,0.4)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {jobResults.slice(0, 50).map((row, i) => (
                                                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                                                    className="hover:bg-white/[0.02] transition-colors">
                                                    {Object.keys(jobResults[0]).filter(k => k !== "page_title").slice(0, 8).map(col => (
                                                        <td key={col} className="px-4 py-2.5 max-w-[200px] truncate"
                                                            style={{ color: row[col] !== null ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.2)" }}>
                                                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : "—"}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {jobResults.length > 50 && (
                                        <p className="px-5 py-3 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                                            Showing 50 of {jobResults.length} records — download Excel for full data
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {!activeJobId && !jobResults && (
                            <div className="rounded-2xl p-16 text-center" style={CARD}>
                                <Globe className="mx-auto h-16 w-16 mb-4 opacity-20" style={{ color: "#60a5fa" }} />
                                <p className="text-lg font-black text-white mb-2">No crawl jobs yet</p>
                                <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Start a new crawl from the New Crawl tab</p>
                                <button onClick={() => setTab("new")}
                                    className="mt-4 flex items-center gap-2 mx-auto rounded-xl px-6 py-2.5 text-sm font-black text-white transition-all hover:-translate-y-0.5"
                                    style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                                    <Globe className="h-4 w-4" /> New Crawl
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
