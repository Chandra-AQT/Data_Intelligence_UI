import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Brain, RotateCcw, Star, Loader2 } from "lucide-react";
import { AppShell } from "@/components/aqt/app-shell";
import { Button } from "@/components/ui/button";
import { QualityPanel } from "@/components/aqt/quality-panel";
import { ProviderConfig, type ProviderValues } from "@/components/aqt/provider-config";
import { api, storedKey } from "@/lib/aqt";

export const Route = createFileRoute("/intelligence")({ component: Intelligence });

const CARD = { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" } as const;
const INPUT = { backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc" } as const;

function SectionHeader({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
    return (
        <div className="flex items-start gap-3 mb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
                <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
                <h2 className="text-lg font-black text-white">{title}</h2>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{desc}</p>
            </div>
        </div>
    );
}

function Intelligence() {
    // Auto Schema
    const [schemaDocId, setSchemaDocId] = useState("");
    const [schemaApiKey, setSchemaApiKey] = useState(storedKey("openai"));
    const [schemaModel, setSchemaModel] = useState("gpt-4o");
    const [domainHint, setDomainHint] = useState("");
    const [maxFields, setMaxFields] = useState(30);
    const [saveSchema, setSaveSchema] = useState(true);
    const [generatedSchema, setGeneratedSchema] = useState<{
        name: string;
        fields: Array<{ name: string; type: string }>;
    } | null>(null);

    // Quality Score
    const [qualityJobId, setQualityJobId] = useState("");
    const [qualityResult, setQualityResult] = useState<{
        score: number;
        grade: string;
        breakdown: { coverage: number; avg_confidence: number; source_quality: number };
        missing_critical: string[];
        suggestions: string[];
    } | null>(null);

    // Smart Retry
    const [retryJobId, setRetryJobId] = useState("");
    const [retryProvider, setRetryProvider] = useState<ProviderValues>({
        provider: "openai",
        api_key: storedKey("openai"),
        model: "gpt-4o-mini",
        base_url: "",
    });
    const [retryThreshold, setRetryThreshold] = useState(0.5);
    const [maxRetries, setMaxRetries] = useState(5);
    const [retryResult, setRetryResult] = useState<{
        fields_improved: number;
        fields_retried: number;
        retry_log: Array<{
            field: string;
            old_value: unknown;
            new_value: unknown;
            old_confidence: number;
            new_confidence: number;
            status: string;
        }>;
        new_quality_score: number;
        new_grade: string;
    } | null>(null);

    const { data: docsData } = useQuery({
        queryKey: ["documents"],
        queryFn: () => api.get("/documents").then((r) => r.data.documents ?? []),
    });
    const { data: jobsData } = useQuery({
        queryKey: ["jobs"],
        queryFn: () => api.get("/jobs").then((r) => r.data.jobs ?? []),
    });

    const docs = (docsData ?? []).filter((d: { status: string }) => d.status === "parsed");
    const completedJobs = (jobsData ?? []).filter((j: { status: string }) => j.status === "completed");

    const autoSchemaMut = useMutation({
        mutationFn: () =>
            api.post("/intelligence/auto-schema", {
                document_id: schemaDocId,
                api_key: schemaApiKey,
                model: schemaModel,
                domain_hint: domainHint,
                max_fields: maxFields,
                save: saveSchema,
            }),
        onSuccess: (res) => {
            setGeneratedSchema(res.data.schema);
            toast.success(`Schema generated: ${res.data.field_count} fields`);
        },
        onError: (err: { response?: { data?: { detail?: string } } }) =>
            toast.error(err.response?.data?.detail ?? "Schema generation failed"),
    });

    const qualityMut = useMutation({
        mutationFn: () => api.get(`/intelligence/quality-score/${qualityJobId}`),
        onSuccess: (res) => { setQualityResult(res.data); toast.success("Quality score computed"); },
        onError: () => toast.error("Failed to compute quality score"),
    });

    const retryMut = useMutation({
        mutationFn: () =>
            api.post("/intelligence/smart-retry", {
                job_id: retryJobId,
                provider: retryProvider.provider,
                api_key: retryProvider.api_key,
                model: retryProvider.model,
                base_url: retryProvider.base_url,
                threshold: retryThreshold,
                max_retries: maxRetries,
            }),
        onSuccess: (res) => {
            setRetryResult(res.data);
            toast.success(`Smart Retry: ${res.data.fields_improved} fields improved`);
        },
        onError: (err: { response?: { data?: { detail?: string } } }) =>
            toast.error(err.response?.data?.detail ?? "Smart retry failed"),
    });

    return (
        <AppShell
            title="Platform Architecture"
            subtitle="Auto Schema Generator · Quality Scorer · Smart Retry"
            sectionLabel="PLATFORM OVERVIEW"
        >
            <div className="space-y-6">

                {/* Auto Schema Generator */}
                <section className="rounded-2xl p-6" style={CARD}>
                    <SectionHeader
                        icon={Brain}
                        title="Auto Schema Generator"
                        desc="Upload a document and let GPT-4o automatically generate the perfect extraction schema."
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Document</label>
                            <select
                                value={schemaDocId}
                                onChange={(e) => setSchemaDocId(e.target.value)}
                                className="w-full h-10 rounded-lg px-3 text-sm"
                                style={INPUT}
                            >
                                <option value="">Select document...</option>
                                {docs.map((d: { id: string; file_name: string }) => (
                                    <option key={d.id} value={d.id}>{d.file_name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>OpenAI API Key</label>
                            <input
                                type="password"
                                value={schemaApiKey}
                                onChange={(e) => setSchemaApiKey(e.target.value)}
                                placeholder="sk-..."
                                className="w-full h-10 rounded-lg px-3 text-sm"
                                style={INPUT}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Model</label>
                            <select
                                value={schemaModel}
                                onChange={(e) => setSchemaModel(e.target.value)}
                                className="w-full h-10 rounded-lg px-3 text-sm"
                                style={INPUT}
                            >
                                <option value="gpt-4o">gpt-4o (Best)</option>
                                <option value="gpt-4o-mini">gpt-4o-mini (Faster)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Domain Hint</label>
                            <input
                                value={domainHint}
                                onChange={(e) => setDomainHint(e.target.value)}
                                placeholder="e.g. HVAC, Foodservice, Industrial..."
                                className="w-full h-10 rounded-lg px-3 text-sm"
                                style={INPUT}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                                Max Fields: {maxFields}
                            </label>
                            <input
                                type="range" min="5" max="80" value={maxFields}
                                onChange={(e) => setMaxFields(Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                        <div className="flex items-center">
                            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "rgba(255,255,255,0.6)" }}>
                                <input
                                    type="checkbox"
                                    checked={saveSchema}
                                    onChange={(e) => setSaveSchema(e.target.checked)}
                                    className="rounded"
                                />
                                Save schema automatically
                            </label>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (!schemaDocId) return toast.error("Select a document");
                            if (!schemaApiKey) return toast.error("Enter OpenAI API key");
                            autoSchemaMut.mutate();
                        }}
                        disabled={autoSchemaMut.isPending}
                        className="mt-5 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-white transition-all disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}
                    >
                        {autoSchemaMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Generating...</> : <><Brain className="h-4 w-4" />Generate Schema</>}
                    </button>

                    {generatedSchema && (
                        <div className="mt-5 rounded-xl p-4" style={{ backgroundColor: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)" }}>
                            <p className="font-black text-white">{generatedSchema.name}</p>
                            <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{generatedSchema.fields.length} fields generated</p>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {generatedSchema.fields.slice(0, 10).map((f) => (
                                    <span key={f.name} className="rounded-lg px-2 py-0.5 text-xs font-mono" style={{ backgroundColor: "rgba(37,99,235,0.15)", color: "#60a5fa" }}>
                                        {f.name}
                                    </span>
                                ))}
                                {generatedSchema.fields.length > 10 && (
                                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>+{generatedSchema.fields.length - 10} more</span>
                                )}
                            </div>
                        </div>
                    )}
                </section>

                {/* Quality Scorer */}
                <section className="rounded-2xl p-6" style={CARD}>
                    <SectionHeader
                        icon={Star}
                        title="Quality Scorer"
                        desc="Analyze any extraction result and get a detailed quality report with grade and suggestions."
                    />
                    <div className="flex flex-wrap gap-3">
                        <select
                            value={qualityJobId}
                            onChange={(e) => setQualityJobId(e.target.value)}
                            className="h-10 rounded-lg px-3 text-sm flex-1 min-w-[260px]"
                            style={INPUT}
                        >
                            <option value="">Select completed job...</option>
                            {completedJobs.map((j: { job_id: string; schema_name: string }) => (
                                <option key={j.job_id} value={j.job_id}>
                                    {j.job_id.slice(0, 12)}... · {j.schema_name}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => { if (!qualityJobId) return toast.error("Select a job"); qualityMut.mutate(); }}
                            disabled={qualityMut.isPending}
                            className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-black text-white transition-all disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}
                        >
                            {qualityMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Computing...</> : <><Star className="h-4 w-4" />Compute Score</>}
                        </button>
                    </div>

                    {qualityResult && (
                        <div className="mt-5 space-y-4">
                            <QualityPanel
                                score={qualityResult.score}
                                coverage={qualityResult.breakdown?.coverage ? Math.round((qualityResult.breakdown.coverage / 40) * 100) : undefined}
                                avgConfidence={qualityResult.breakdown?.avg_confidence ? Math.round((qualityResult.breakdown.avg_confidence / 35) * 100) : undefined}
                                missingFields={qualityResult.missing_critical ?? []}
                                suggestions={qualityResult.suggestions ?? []}
                                showRetry={false}
                            />
                            <div className="grid gap-2 text-sm md:grid-cols-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                                <p>Coverage: <span className="text-white font-bold">{qualityResult.breakdown?.coverage?.toFixed(1)}/40</span></p>
                                <p>Confidence: <span className="text-white font-bold">{qualityResult.breakdown?.avg_confidence?.toFixed(1)}/35</span></p>
                                <p>Source quality: <span className="text-white font-bold">{qualityResult.breakdown?.source_quality?.toFixed(1)}/15</span></p>
                                <p>Grade: <span className="text-white font-black">{qualityResult.grade}</span></p>
                            </div>
                        </div>
                    )}
                </section>

                {/* Smart Retry */}
                <section className="rounded-2xl p-6" style={CARD}>
                    <SectionHeader
                        icon={RotateCcw}
                        title="Smart Retry"
                        desc="Re-extract low-confidence fields with targeted AI prompts to improve accuracy."
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Job to Retry</label>
                            <select
                                value={retryJobId}
                                onChange={(e) => setRetryJobId(e.target.value)}
                                className="w-full h-10 rounded-lg px-3 text-sm"
                                style={INPUT}
                            >
                                <option value="">Select completed job...</option>
                                {completedJobs.map((j: { job_id: string; schema_name: string }) => (
                                    <option key={j.job_id} value={j.job_id}>
                                        {j.job_id.slice(0, 12)}... · {j.schema_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                                Confidence Threshold: {retryThreshold}
                            </label>
                            <input
                                type="range" min="0" max="1" step="0.1" value={retryThreshold}
                                onChange={(e) => setRetryThreshold(Number(e.target.value))}
                                className="w-full mt-2"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Engine</label>
                            <ProviderConfig value={retryProvider} onChange={setRetryProvider} compact />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                                Max Fields to Retry: {maxRetries}
                            </label>
                            <input
                                type="range" min="1" max="10" value={maxRetries}
                                onChange={(e) => setMaxRetries(Number(e.target.value))}
                                className="w-full mt-2"
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => { if (!retryJobId) return toast.error("Select a job"); retryMut.mutate(); }}
                        disabled={retryMut.isPending}
                        className="mt-5 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-white transition-all disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}
                    >
                        {retryMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Running...</> : <><RotateCcw className="h-4 w-4" />Run Smart Retry</>}
                    </button>

                    {retryResult && (
                        <div className="mt-5 space-y-4">
                            <div className="flex flex-wrap gap-4 text-sm">
                                <span className="font-black" style={{ color: "#22c55e" }}>✅ Improved: {retryResult.fields_improved}</span>
                                <span style={{ color: "rgba(255,255,255,0.4)" }}>Retried: {retryResult.fields_retried}</span>
                                <span className="font-black text-white">New Score: {retryResult.new_quality_score}/100 · {retryResult.new_grade}</span>
                            </div>
                            <div className="overflow-x-auto rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs font-bold border-b" style={{ color: "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.06)" }}>
                                            <th className="px-4 py-3">Field</th>
                                            <th className="px-4 py-3">Old Value</th>
                                            <th className="px-4 py-3">New Value</th>
                                            <th className="px-4 py-3">Old Conf</th>
                                            <th className="px-4 py-3">New Conf</th>
                                            <th className="px-4 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {retryResult.retry_log.map((r) => (
                                            <tr key={r.field} className="border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                                                <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "#22d3ee" }}>{r.field}</td>
                                                <td className="px-4 py-2.5 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{r.old_value === null ? "—" : String(r.old_value)}</td>
                                                <td className="px-4 py-2.5 text-xs font-medium text-white">{r.new_value === null ? "—" : String(r.new_value)}</td>
                                                <td className="px-4 py-2.5 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{Math.round((r.old_confidence ?? 0) * 100)}%</td>
                                                <td className="px-4 py-2.5 text-xs font-bold" style={{ color: "#22c55e" }}>{Math.round((r.new_confidence ?? 0) * 100)}%</td>
                                                <td className="px-4 py-2.5 text-xs" style={{ color: r.status === "improved" ? "#22c55e" : "rgba(255,255,255,0.3)" }}>
                                                    {r.status === "improved" ? "✅ improved" : "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </AppShell>
    );
}
