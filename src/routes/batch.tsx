import { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Boxes, Download, Loader2 } from "lucide-react";
import { AppShell } from "@/components/aqt/app-shell";
import { ProviderConfig, type ProviderValues } from "@/components/aqt/provider-config";
import { StatusBadge } from "@/components/aqt/badges";
import { Button } from "@/components/ui/button";
import { api, downloadBlob, storedKey } from "@/lib/aqt";

export const Route = createFileRoute("/batch")({ component: Batch });

const CARD = { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" } as const;
const INPUT = { backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc" } as const;

function Batch() {
    const [selected, setSelected] = useState<string[]>([]);
    const [schemaId, setSchemaId] = useState("");
    const [multiRecord, setMultiRecord] = useState(true);
    const [provider, setProvider] = useState<ProviderValues>({
        provider: "landingai",
        api_key: storedKey("landingai"),
        model: "dpt-2-latest",
        base_url: "",
    });
    const [batchId, setBatchId] = useState<string | null>(null);
    const [batchStatus, setBatchStatus] = useState<{
        status: string;
        total: number;
        completed: number;
        failed: number;
    } | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const { data: docsData } = useQuery({
        queryKey: ["documents"],
        queryFn: () => api.get("/documents").then((r) => r.data.documents ?? []),
    });
    const { data: schemasData } = useQuery({
        queryKey: ["schemas"],
        queryFn: () => api.get("/schemas").then((r) => r.data.schemas ?? []),
    });

    const docs = (docsData ?? []).filter((d: { status: string }) => d.status === "parsed");
    const schemas = schemasData ?? [];

    const batchMut = useMutation({
        mutationFn: () =>
            api.post("/batch/run-from-documents", {
                document_ids: selected,
                schema_id: schemaId,
                provider: provider.provider,
                api_key: provider.api_key,
                base_url: provider.base_url,
                model: provider.model,
                multi_record: multiRecord,
            }),
        onSuccess: (res) => {
            const id = res.data.batch_id;
            setBatchId(id);
            toast.success(`Batch started — processing ${selected.length} documents`);
            pollRef.current = setInterval(async () => {
                try {
                    const status = await api.get(`/batch/${id}`);
                    setBatchStatus(status.data);
                    if (["completed", "completed_with_errors", "failed"].includes(status.data.status)) {
                        clearInterval(pollRef.current!);
                        toast.success(`Batch ${status.data.status}`);
                    }
                } catch {
                    clearInterval(pollRef.current!);
                }
            }, 5000);
        },
        onError: (err: { response?: { data?: { detail?: string } } }) =>
            toast.error(err.response?.data?.detail ?? "Batch failed"),
    });

    useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

    const toggle = (id: string) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const handleExport = async (type: "excel" | "csv") => {
        if (!batchId) return;
        try {
            const res = await api.get(`/batch/${batchId}/${type}`, { responseType: "blob" });
            downloadBlob(res.data, `batch_${batchId.slice(0, 8)}.${type === "excel" ? "xlsx" : "csv"}`);
        } catch {
            toast.error("Export failed");
        }
    };

    const progress = batchStatus ? Math.round((batchStatus.completed / batchStatus.total) * 100) : 0;

    return (
        <AppShell
            title="Multi Doc"
            subtitle="Batch processing sessions and multi-document extraction"
            sectionLabel="BATCH SESSIONS"
        >
            <div className="flex flex-col lg:flex-row gap-6 items-start">

                {/* Config panel */}
                <div className="w-full lg:w-[360px] shrink-0 rounded-2xl p-5 space-y-5" style={CARD}>
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22d3ee" }}>● CONFIGURATION</p>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                            Schema *
                        </label>
                        <select
                            value={schemaId}
                            onChange={(e) => setSchemaId(e.target.value)}
                            className="w-full h-10 rounded-lg px-3 text-sm"
                            style={INPUT}
                        >
                            <option value="">Select schema...</option>
                            {schemas.map((s: { id: string; name: string }) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                            Engine
                        </label>
                        <ProviderConfig value={provider} onChange={setProvider} />
                    </div>

                    <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "rgba(255,255,255,0.6)" }}>
                        <input
                            type="checkbox"
                            checked={multiRecord}
                            onChange={(e) => setMultiRecord(e.target.checked)}
                            className="rounded"
                        />
                        Multi-record mode
                    </label>

                    <button
                        onClick={() => {
                            if (!selected.length) return toast.error("Select at least one document");
                            if (!schemaId) return toast.error("Select a schema");
                            batchMut.mutate();
                        }}
                        disabled={batchMut.isPending}
                        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-white transition-all disabled:opacity-50"
                        style={{ background: batchMut.isPending ? "rgba(37,99,235,0.5)" : "linear-gradient(135deg, #2563eb, #7c3aed)" }}
                    >
                        {batchMut.isPending
                            ? <><Loader2 className="h-4 w-4 animate-spin" />Starting...</>
                            : <><Boxes className="h-4 w-4" />Run Batch ({selected.length})</>
                        }
                    </button>
                </div>

                {/* Right panel */}
                <div className="flex-1 min-w-0 space-y-5">

                    {/* Document selector */}
                    <div className="rounded-2xl p-5" style={CARD}>
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#22d3ee" }}>● SELECT DOCUMENTS</p>
                                <p className="text-sm font-black text-white">{selected.length} of {docs.length} selected</p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelected(docs.map((d: { id: string }) => d.id))}
                                >
                                    Select All
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setSelected([])}>Clear</Button>
                            </div>
                        </div>

                        {docs.length === 0 ? (
                            <div className="py-10 text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
                                <Boxes className="mx-auto h-10 w-10 mb-2 opacity-30" />
                                <p>No parsed documents. Upload and parse documents first.</p>
                            </div>
                        ) : (
                            <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                                {docs.map((doc: { id: string; file_name: string; page_count: number; status: string }) => (
                                    <label
                                        key={doc.id}
                                        className="flex cursor-pointer items-center justify-between rounded-xl p-3 transition-colors"
                                        style={{
                                            backgroundColor: selected.includes(doc.id) ? "rgba(37,99,235,0.1)" : "rgba(255,255,255,0.02)",
                                            border: selected.includes(doc.id) ? "1px solid rgba(37,99,235,0.3)" : "1px solid rgba(255,255,255,0.06)",
                                        }}
                                    >
                                        <span className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selected.includes(doc.id)}
                                                onChange={() => toggle(doc.id)}
                                                className="rounded"
                                            />
                                            <span className="max-w-[240px] truncate font-medium text-sm text-white">{doc.file_name}</span>
                                        </span>
                                        <span className="flex items-center gap-2 text-xs shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>
                                            {doc.page_count}p
                                            <StatusBadge status={doc.status} />
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Batch progress */}
                    {batchStatus && (
                        <div className="rounded-2xl p-5" style={CARD}>
                            <div className="mb-4 flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22d3ee" }}>● BATCH PROGRESS</p>
                                <StatusBadge status={batchStatus.status} />
                            </div>

                            <div className="mb-2 flex justify-between text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                                <span>{batchStatus.completed} / {batchStatus.total} completed</span>
                                <span className="font-black text-white">{progress}%</span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${progress}%`,
                                        background: "linear-gradient(90deg, #2563eb, #7c3aed)",
                                    }}
                                />
                            </div>

                            {batchStatus.failed > 0 && (
                                <p className="mt-2 text-sm" style={{ color: "#ef4444" }}>{batchStatus.failed} failed</p>
                            )}
                            {batchStatus.status === "running" && (
                                <p className="mt-2 text-sm animate-pulse" style={{ color: "#60a5fa" }}>⟳ Polling for updates every 5s...</p>
                            )}

                            {["completed", "completed_with_errors"].includes(batchStatus.status) && (
                                <div className="mt-4 flex gap-2">
                                    <Button
                                        onClick={() => handleExport("excel")}
                                        style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)", border: "none" }}
                                        className="font-black text-white"
                                    >
                                        <Download className="h-4 w-4" />Download Excel
                                    </Button>
                                    <Button variant="outline" onClick={() => handleExport("csv")}>
                                        <Download className="h-4 w-4" />CSV
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
