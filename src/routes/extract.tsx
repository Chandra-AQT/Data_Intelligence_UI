import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Download, Loader2, Zap } from "lucide-react";
import { AppShell } from "@/components/aqt/app-shell";
import { ProviderConfig, type ProviderValues } from "@/components/aqt/provider-config";
import { ResultView } from "@/components/aqt/result-view";
import { Button } from "@/components/ui/button";
import { api, downloadBlob, storedKey } from "@/lib/aqt";

export const Route = createFileRoute("/extract")({ component: Extract });

const CARD = { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" } as const;
const INPUT = { backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc" } as const;
const LABEL = "block text-xs font-semibold uppercase tracking-wide mb-1.5" as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className={LABEL} style={{ color: "#22d3ee" }}>{children}</p>;
}

function Extract() {
  const [docId, setDocId] = useState("");
  const [schemaId, setSchemaId] = useState("");
  const [multiRecord, setMultiRecord] = useState(false);
  const [smartRetryEnabled, setSmartRetryEnabled] = useState(false);
  const [retryThreshold, setRetryThreshold] = useState(0.5);
  const [maxRetries, setMaxRetries] = useState(5);
  const [provider, setProvider] = useState<ProviderValues>({
    provider: "landingai",
    api_key: storedKey("landingai"),
    model: "dpt-2-latest",
    base_url: "",
  });
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const { data: docsData } = useQuery({ queryKey: ["documents"], queryFn: () => api.get("/documents").then((r) => r.data.documents ?? []) });
  const { data: schemasData } = useQuery({ queryKey: ["schemas"], queryFn: () => api.get("/schemas").then((r) => r.data.schemas ?? []) });

  const docs = (docsData ?? []).filter((d: { status: string }) => d.status === "parsed");
  const schemas = schemasData ?? [];

  const extractMut = useMutation({
    mutationFn: () => api.post("/extraction/run", {
      document_id: docId, schema_id: schemaId,
      provider_config: provider, options: { multi_record: multiRecord },
    }),
    onSuccess: (res) => { setResult(res.data); setJobId(res.data.job_id); toast.success("Extraction complete!"); },
    onError: (err: { response?: { data?: { detail?: string } } }) => toast.error(err.response?.data?.detail ?? "Extraction failed"),
  });

  const retryMut = useMutation({
    mutationFn: () => api.post("/intelligence/smart-retry", {
      job_id: jobId, provider: provider.provider, api_key: provider.api_key,
      model: provider.model, base_url: provider.base_url,
      threshold: retryThreshold, max_retries: maxRetries,
    }),
    onSuccess: (res) => { setResult((prev) => ({ ...prev, ...res.data })); toast.success(`Smart Retry: ${res.data.fields_improved} fields improved!`); },
    onError: () => toast.error("Smart retry failed"),
  });

  const handleExport = async (type: "excel" | "csv") => {
    if (!jobId) return;
    try {
      const res = await api.get(`/export/${jobId}/${type}`, { responseType: "blob" });
      downloadBlob(res.data, `extraction_${jobId.slice(0, 8)}.${type === "excel" ? "xlsx" : "csv"}`);
    } catch { toast.error("Export failed"); }
  };

  const run = () => {
    if (!docId) return toast.error("Select a document");
    if (!schemaId) return toast.error("Select a schema");
    extractMut.mutate();
  };

  const quality = (result as { quality?: { score?: number; breakdown?: { coverage?: number; avg_confidence?: number }; missing_critical?: string[]; suggestions?: string[] } } | null)?.quality;
  const records = (result as { records?: unknown[] } | null)?.records as Array<{ result: Record<string, unknown>; confidence: Record<string, number>; schema_fields?: string[] }> | undefined;
  const singleResult = (result as { result?: Record<string, unknown> } | null)?.result;
  const confidence = (result as { confidence?: Record<string, number> } | null)?.confidence ?? {};
  const schemaFields = (result as { schema_fields?: string[] } | null)?.schema_fields ?? [];
  const failureLog = (result as { failure_log?: Array<{ type: string; reason?: string }> } | null)?.failure_log ?? [];

  return (
    <AppShell title="Upload & Extract" subtitle="End-to-end document extraction pipeline" sectionLabel="EXTRACTION PIPELINE">
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── Config panel (fixed width) ── */}
        <div className="w-full lg:w-[360px] shrink-0 rounded-2xl p-5 space-y-5" style={CARD}>

          {/* Document */}
          <div>
            <SectionLabel>Document</SectionLabel>
            <select
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              className="w-full h-10 rounded-lg px-3 text-sm"
              style={INPUT}
            >
              <option value="">Select a parsed document...</option>
              {docs.map((d: { id: string; file_name: string; page_count: number }) => (
                <option key={d.id} value={d.id}>{d.file_name} ({d.page_count}p)</option>
              ))}
            </select>
          </div>

          {/* Schema */}
          <div>
            <SectionLabel>Schema</SectionLabel>
            <select
              value={schemaId}
              onChange={(e) => setSchemaId(e.target.value)}
              className="w-full h-10 rounded-lg px-3 text-sm"
              style={INPUT}
            >
              <option value="">Select a schema...</option>
              {schemas.map((s: { id: string; name: string; field_count: number }) => (
                <option key={s.id} value={s.id}>{s.name} ({s.field_count} fields)</option>
              ))}
            </select>
          </div>

          {/* Engine */}
          <div>
            <SectionLabel>Engine</SectionLabel>
            <ProviderConfig value={provider} onChange={setProvider} />
          </div>

          {/* Options */}
          <div>
            <SectionLabel>Options</SectionLabel>
            <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
              <input type="checkbox" checked={multiRecord} onChange={(e) => setMultiRecord(e.target.checked)} className="rounded" />
              Multi-record mode
            </label>
          </div>

          {/* Intelligence */}
          <div>
            <SectionLabel>Intelligence</SectionLabel>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                Auto Quality Score
              </label>
              <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                <input type="checkbox" checked={smartRetryEnabled} onChange={(e) => setSmartRetryEnabled(e.target.checked)} className="rounded" />
                Smart Retry low-confidence fields
              </label>
              {smartRetryEnabled && (
                <div className="pl-5 space-y-2 pt-1">
                  <label className="grid gap-1 text-xs text-white/50">
                    Threshold: {retryThreshold}
                    <input type="range" min="0" max="1" step="0.1" value={retryThreshold} onChange={(e) => setRetryThreshold(Number(e.target.value))} />
                  </label>
                  <label className="grid gap-1 text-xs text-white/50">
                    Max retries
                    <input type="number" min="1" max="10" value={maxRetries} onChange={(e) => setMaxRetries(Number(e.target.value))} className="h-9 rounded-lg px-3 text-sm" style={INPUT} />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Run button */}
          <button
            onClick={run}
            disabled={extractMut.isPending}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: extractMut.isPending ? "rgba(37,99,235,0.5)" : "linear-gradient(135deg, #2563eb, #7c3aed)" }}
          >
            {extractMut.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" />Extracting...</>
              : <><Zap className="h-4 w-4" />Run Extraction</>
            }
          </button>
        </div>

        {/* ── Results panel (fills remaining space) ── */}
        <div className="flex-1 min-w-0 rounded-2xl p-5" style={CARD}>
          {!result && !extractMut.isPending && (
            <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4" style={{ backgroundColor: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)" }}>
                <Zap className="h-8 w-8 text-blue-400" />
              </div>
              <h2 className="text-xl font-black text-white">Configure and run extraction</h2>
              <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Select a document and schema, then click Run Extraction</p>
            </div>
          )}

          {extractMut.isPending && (
            <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-400 mb-4" />
              <h2 className="text-xl font-black text-white">Extracting data...</h2>
              <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>This may take 20-60 seconds</p>
            </div>
          )}

          {result && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22d3ee" }}>● Extraction Result</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleExport("excel")}><Download className="h-4 w-4" />Excel</Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport("csv")}><Download className="h-4 w-4" />CSV</Button>
                </div>
              </div>
              <ResultView
                result={singleResult}
                confidence={confidence}
                records={records}
                schemaFields={schemaFields}
                score={quality?.score ?? 0}
                failureLog={failureLog}
                duration={(result as { duration_seconds?: number }).duration_seconds}
                provider={provider.provider}
                schemaName={schemas.find((s: { id: string; name: string }) => s.id === schemaId)?.name}
                jobId={jobId ?? undefined}
                coverage={quality?.breakdown?.coverage ? Math.round((quality.breakdown.coverage / 40) * 100) : undefined}
                avgConfidence={quality?.breakdown?.avg_confidence ? Math.round((quality.breakdown.avg_confidence / 35) * 100) : undefined}
                missingFields={quality?.missing_critical ?? []}
                suggestions={quality?.suggestions ?? []}
                onSmartRetry={jobId ? () => retryMut.mutate() : undefined}
              />
              {retryMut.isPending && <p className="mt-3 text-sm text-blue-400 animate-pulse">Running smart retry...</p>}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
