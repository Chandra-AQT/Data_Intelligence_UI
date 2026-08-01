import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ShieldCheck, Download, Loader2 } from "lucide-react";
import { AppShell } from "@/components/aqt/app-shell";
import { Button } from "@/components/ui/button";
import { api, downloadBlob, storedKey } from "@/lib/aqt";

export const Route = createFileRoute("/compare")({ component: Compare });

interface CompareResult {
    engine: string;
    provider: string;
    status: string;
    duration_seconds?: number;
    result?: Record<string, unknown>;
    error?: string;
}

function Compare() {
    const [selectedDoc, setSelectedDoc] = useState("");
    const [selectedSchema, setSelectedSchema] = useState("");
    const [results, setResults] = useState<CompareResult[]>([]);
    const [compareId, setCompareId] = useState<string | null>(null);
    const [fieldNames, setFieldNames] = useState<string[]>([]);

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

    const compareMut = useMutation({
        mutationFn: () =>
            api.post("/compare/run", {
                document_id: selectedDoc,
                schema_id: selectedSchema,
                engines: [
                    { provider: "python", model: "heuristic" },
                    { provider: "openai", model: "gpt-4o-mini", api_key: storedKey("openai") },
                    { provider: "anthropic", model: "claude-3-5-haiku-20241022", api_key: storedKey("anthropic") },
                ],
            }),
        onSuccess: (res) => {
            setResults(res.data.engines ?? []);
            setCompareId(res.data.compare_id ?? null);
            setFieldNames(res.data.field_names ?? []);
            toast.success("Comparison complete");
        },
        onError: () => toast.error("Comparison failed"),
    });

    const handleExport = async () => {
        if (!compareId) return;
        try {
            const res = await api.get(`/compare/${compareId}/excel`, { responseType: "blob" });
            downloadBlob(res.data, "comparison.xlsx");
        } catch {
            toast.error("Export failed");
        }
    };

    // Use field names from API response, fallback to extracting from results
    const allFields = fieldNames.length > 0 ? fieldNames : Array.from(
        new Set(
            results.flatMap((r) =>
                r.result ? Object.keys(r.result).filter((k) => k !== "quality") : []
            )
        )
    );

    return (
        <AppShell
            title="Engine Comparison"
            subtitle="Run the same document through multiple AI engines side-by-side"
            sectionLabel="ENGINE COMPARISON"
            actions={
                <Button
                    onClick={handleExport}
                    disabled={!compareId}
                    style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)", border: "none" }}
                    className="font-black text-white"
                >
                    <Download className="h-4 w-4" />
                    Export Excel
                </Button>
            }
        >
            <div className="space-y-6">
                {/* Config panel */}
                <div
                    className="rounded-2xl p-6 space-y-4"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22d3ee" }}>
                        ● SETUP
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-bold text-white/50 mb-1.5 uppercase tracking-wide">Document</label>
                            <select
                                value={selectedDoc}
                                onChange={(e) => setSelectedDoc(e.target.value)}
                                className="h-10 w-full rounded-lg px-3 text-sm"
                                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9" }}
                            >
                                <option value="">Select a parsed document…</option>
                                {docs.map((d: { id: string; file_name: string }) => (
                                    <option key={d.id} value={d.id}>{d.file_name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-white/50 mb-1.5 uppercase tracking-wide">Schema</label>
                            <select
                                value={selectedSchema}
                                onChange={(e) => setSelectedSchema(e.target.value)}
                                className="h-10 w-full rounded-lg px-3 text-sm"
                                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9" }}
                            >
                                <option value="">Select a schema…</option>
                                {schemas.map((s: { id: string; name: string }) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <p className="text-xs text-white/30">Engines: Python Heuristic · OpenAI GPT-4o · Anthropic Claude (uses saved API keys from Settings)</p>
                    <Button
                        onClick={() => compareMut.mutate()}
                        disabled={!selectedDoc || !selectedSchema || compareMut.isPending}
                        style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)", border: "none" }}
                        className="font-black text-white"
                    >
                        {compareMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        {compareMut.isPending ? "Comparing…" : "Compare Engines"}
                    </Button>
                </div>

                {/* Results */}
                {results.length > 0 && (
                    <>
                        {/* Engine summary cards */}
                        <div className="grid gap-4 sm:grid-cols-3">
                            {results.map((r) => (
                                <div
                                    key={r.engine}
                                    className="rounded-2xl p-4"
                                    style={{
                                        backgroundColor: r.status === "completed" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                                        border: `1px solid ${r.status === "completed" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                                    }}
                                >
                                    <p className="font-black text-white">{r.engine}</p>
                                    <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                                        Fields: {r.result ? Object.keys(r.result).filter((k) => k !== "quality" && r.result![k] !== null).length : 0} extracted
                                    </p>
                                    {r.duration_seconds && (
                                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Duration: {r.duration_seconds}s</p>
                                    )}
                                    <p
                                        className="text-sm font-bold mt-1"
                                        style={{ color: r.status === "completed" ? "#22c55e" : "#ef4444" }}
                                    >
                                        {r.status}
                                    </p>
                                    {r.error && <p className="text-xs mt-1 text-red-400">{r.error}</p>}
                                </div>
                            ))}
                        </div>

                        {/* Comparison matrix */}
                        {allFields.length > 0 && (
                            <div
                                className="rounded-2xl p-5 overflow-x-auto"
                                style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                            >
                                <h2 className="mb-4 text-lg font-black text-white">Field Comparison Matrix</h2>
                                <table className="w-full min-w-[600px] text-sm">
                                    <thead>
                                        <tr className="text-left text-xs font-bold text-white/30 border-b border-white/[0.06]">
                                            <th className="pb-3 pr-4">Field</th>
                                            {results.map((r) => (
                                                <th key={r.engine} className="pb-3 px-2">{r.engine}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allFields.map((field) => {
                                            const values = results.map((r) => r.result?.[field]);
                                            const allSame = values.every((v) => JSON.stringify(v) === JSON.stringify(values[0]));
                                            return (
                                                <tr key={field} className="border-b border-white/[0.04]">
                                                    <td className="py-2.5 pr-4 font-mono text-xs" style={{ color: "#22d3ee" }}>{field}</td>
                                                    {results.map((r) => {
                                                        const val = r.result?.[field];
                                                        const isEmpty = val === null || val === undefined || val === "";
                                                        return (
                                                            <td key={r.engine} className="py-2.5 px-2">
                                                                <span
                                                                    className="block rounded-lg px-2 py-1 text-center text-xs font-bold max-w-[160px] truncate"
                                                                    style={{
                                                                        backgroundColor: isEmpty
                                                                            ? "rgba(239,68,68,0.12)"
                                                                            : allSame
                                                                                ? "rgba(34,197,94,0.12)"
                                                                                : "rgba(245,158,11,0.12)",
                                                                        color: isEmpty ? "#ef4444" : allSame ? "#22c55e" : "#f59e0b",
                                                                    }}
                                                                    title={String(val ?? "—")}
                                                                >
                                                                    {isEmpty ? "—" : String(val)}
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {results.length === 0 && !compareMut.isPending && (
                    <div className="py-16 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
                        <ShieldCheck className="mx-auto h-12 w-12 mb-3 opacity-30" />
                        <p>Select a document and schema, then click Compare Engines.</p>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
