import { useCallback, useState, useEffect } from "react";
import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import {
  Brain, Eye, FileUp, Trash2, Zap, RefreshCw, X,
  ChevronLeft, ChevronRight, FileText, ToggleLeft, ToggleRight,
  Table2, Code2, Loader2, Download, ArrowRight, Search, Filter, AlertTriangle, Copy, Check
} from "lucide-react";
import { AppShell, SkeletonTable, EmptyState } from "@/components/aqt/app-shell";
import { pushNotification } from "@/components/aqt/app-shell";
import { StatusBadge, GradeBadge } from "@/components/aqt/badges";
import { Button } from "@/components/ui/button";
import { api, downloadBlob } from "@/lib/aqt";

export const Route = createFileRoute("/documents")({ component: Documents });

type DocMeta = { id: string; file_name: string; status: string; page_count: number; file_size: number; chunk_count: number; table_count: number; created_at: string; file_path?: string };
type Chunk = { id: string; type: string; markdown: string; grounding?: { page: number } };
type ExtractionJob = { job_id: string; schema_name: string; provider: string; status: string; created_at: string; document_id?: string; result?: { quality?: { score?: number } } };

// ── Copy ID helper ────────────────────────────────────────────────────────────
function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(id); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 font-mono text-xs transition-colors hover:text-blue-400"
      style={{ color: "rgba(255,255,255,0.25)" }} title="Copy ID">
      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
      {id.slice(0, 8)}…
    </button>
  );
}

// ── Confirm Delete Modal ──────────────────────────────────────────────────────
function ConfirmDeleteModal({ label, count, onConfirm, onCancel }: {
  label: string; count: number; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-sm mx-4 rounded-2xl p-6 text-center" style={{ backgroundColor: "#0d1526", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl mx-auto mb-4" style={{ backgroundColor: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertTriangle className="h-8 w-8" style={{ color: "#ef4444" }} />
        </div>
        <h3 className="text-lg font-black text-white mb-2">Delete {count > 1 ? `${count} Documents` : "Document"}?</h3>
        <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          {count > 1 ? `You are about to delete ${count} documents.` : `You are about to delete:`}
        </p>
        {count === 1 && <p className="text-sm font-bold text-white mb-1 truncate px-4">{label}</p>}
        <p className="text-xs mb-6" style={{ color: "#ef4444" }}>This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-all"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-xl py-2.5 text-sm font-black text-white transition-all hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)" }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function TableChunk({ chunk }: { chunk: Chunk }) {
  const rows: string[][] = [];
  const rowMatches = chunk.markdown.match(/<tr>(.*?)<\/tr>/gs) ?? [];
  for (const row of rowMatches) {
    const cells = (row.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/gs) ?? []).map((c) => c.replace(/<[^>]+>/g, "").trim());
    if (cells.length) rows.push(cells);
  }
  if (!rows.length)
    return <div className="font-mono text-xs p-3 rounded-lg whitespace-pre-wrap" style={{ backgroundColor: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.6)" }}>{chunk.markdown.replace(/<[^>]+>/g, " ").trim()}</div>;
  return (
    <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
      <table className="w-full text-xs">
        <thead style={{ backgroundColor: "rgba(37,99,235,0.08)" }}>
          <tr>{rows[0]?.map((h, i) => <th key={i} className="px-3 py-2 text-left font-bold" style={{ color: "#60a5fa", borderRight: "1px solid rgba(255,255,255,0.06)" }}>{h || "—"}</th>)}</tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, ri) => (
            <tr key={ri} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              {row.map((cell, ci) => <td key={ci} className="px-3 py-2 text-xs" style={{ color: "rgba(255,255,255,0.6)", borderRight: "1px solid rgba(255,255,255,0.04)" }}>{cell || "—"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocViewerPanel({ doc, onClose, allJobs }: { doc: DocMeta; onClose: () => void; allJobs: ExtractionJob[] }) {
  const [activeTab, setActiveTab] = useState<"markdown" | "json">("markdown");
  const [currentPage, setCurrentPage] = useState(1);
  const [showConfidence, setShowConfidence] = useState(true);

  const { data: parsedData, isLoading: parsedLoading } = useQuery({
    queryKey: ["doc-parsed", doc.id],
    queryFn: () => api.get(`/documents/${doc.id}/parsed`).then((r) => r.data),
  });

  const docJobs = allJobs.filter((j) => j.document_id === doc.id);
  const chunks: Chunk[] = (parsedData as { chunks?: Chunk[] })?.chunks ?? [];
  const markdown: string = (parsedData as { markdown?: string })?.markdown ?? "";
  const tables = (parsedData as { tables?: Array<{ headers: string[]; rows: string[][] }> })?.tables ?? [];
  const pageCount = doc.page_count || 1;

  const pageChunks = chunks.filter((c) => (c.grounding?.page ?? 0) === currentPage - 1);
  const displayChunks = pageChunks.length > 0 ? pageChunks : chunks.slice(0, 40);

  const isPdf = /\.pdf$/i.test(doc.file_name);
  const isImage = /\.(png|jpg|jpeg|webp|gif|bmp|tiff|heic)$/i.test(doc.file_name);
  // file_path is like "./uploads/uuid.pdf" or "uploads/uuid.pdf" — extract just the filename
  const fileBasename = doc.file_path ? doc.file_path.replace(/\\/g, "/").split("/").pop() : null;
  const BACKEND = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL?.replace("/api/v1", "") ?? "https://ai-data-intelligence-1.onrender.com";
  const fileUrl = fileBasename ? `${BACKEND}/uploads/${fileBasename}` : null;

  const handleExport = async (jobId: string, type: "excel" | "csv") => {
    try {
      const res = await api.get(`/export/${jobId}/${type}`, { responseType: "blob" });
      downloadBlob(res.data, `result_${jobId.slice(0, 8)}.${type === "excel" ? "xlsx" : "csv"}`);
    } catch { toast.error("Export failed"); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ backgroundColor: "#060b18" }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-3 shrink-0" style={{ backgroundColor: "#060b14", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <FileText className="h-4 w-4 shrink-0" style={{ color: "#60a5fa" }} />
        <span className="font-black text-white truncate max-w-[400px]" title={doc.file_name}>{doc.file_name}</span>
        <StatusBadge status={doc.status} />
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{pageCount} pages · {chunks.length} chunks · {tables.length} tables</span>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/extract">
            <button className="flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-black text-white" style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
              <Zap className="h-3.5 w-3.5" />Run Extraction
            </button>
          </Link>
          <button onClick={onClose} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all hover:bg-white/10" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
            <X className="h-4 w-4" /> Close
          </button>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Document preview */}
        <div className="flex flex-col w-1/2 border-r" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-3 py-2 shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronLeft className="h-4 w-4 text-white" /></button>
              <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>{currentPage} / {pageCount}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))} disabled={currentPage >= pageCount} className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronRight className="h-4 w-4 text-white" /></button>
            </div>
          )}
          <div className="flex-1 overflow-auto flex items-start justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
            {isPdf && fileUrl ? (
              <div className="w-full h-full flex flex-col gap-2" style={{ minHeight: "500px" }}>
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>PDF Preview</span>
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: "#60a5fa" }}>
                    Open in new tab ↗
                  </a>
                </div>
                <object
                  data={`${fileUrl}#page=${currentPage}&toolbar=1&navpanes=0`}
                  type="application/pdf"
                  className="w-full flex-1 rounded-lg"
                  style={{ minHeight: "480px", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  {/* Fallback if object tag doesn't work */}
                  <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
                    <FileText className="h-12 w-12 opacity-20" style={{ color: "#60a5fa" }} />
                    <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>PDF preview blocked by browser</p>
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
                      Open PDF ↗
                    </a>
                  </div>
                </object>
              </div>
            ) : isImage && fileUrl ? (
              <img src={fileUrl} alt={doc.file_name} className="max-w-full rounded-lg shadow-xl" style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FileText className="h-16 w-16 mb-3 opacity-20" style={{ color: "#60a5fa" }} />
                <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>Preview not available</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>Parsed content is shown on the right</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Parsed content + extraction history */}
        <div className="flex flex-col w-1/2 overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex gap-1">
              {(["markdown", "json"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all" style={{ background: activeTab === tab ? "linear-gradient(135deg, #2563eb, #7c3aed)" : "transparent", color: activeTab === tab ? "#fff" : "rgba(255,255,255,0.4)" }}>
                  {tab === "markdown" ? <FileText className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
                  {tab === "markdown" ? "Markdown" : "JSON"}
                </button>
              ))}
            </div>
            <button onClick={() => setShowConfidence((s) => !s)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all" style={{ backgroundColor: showConfidence ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.04)", color: showConfidence ? "#60a5fa" : "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {showConfidence ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
              Confidence
            </button>
          </div>

          {/* Parsed content */}
          <div className="flex-1 overflow-auto p-4">
            {parsedLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "#3b82f6" }} /></div>
            ) : activeTab === "markdown" ? (
              <div className="space-y-3">
                {displayChunks.length > 0 ? displayChunks.map((chunk, i) => (
                  <div key={chunk.id ?? i}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{i + 1} · {chunk.type}</span>
                      {showConfidence && <span className="text-xs rounded-md px-1.5 py-0.5 font-bold" style={{ backgroundColor: chunk.type === "table" ? "rgba(34,197,94,0.15)" : "rgba(37,99,235,0.15)", color: chunk.type === "table" ? "#22c55e" : "#60a5fa" }}>{chunk.type === "table" ? "95%" : chunk.type === "title" ? "98%" : "87%"}</span>}
                      {chunk.type === "table" && <Table2 className="h-3 w-3" style={{ color: "#22d3ee" }} />}
                    </div>
                    {chunk.type === "table" ? <TableChunk chunk={chunk} /> : (
                      <div className="rounded-lg px-3 py-2.5 font-mono text-xs leading-relaxed whitespace-pre-wrap" style={{ backgroundColor: chunk.type === "title" ? "rgba(37,99,235,0.06)" : "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: chunk.type === "title" ? "#e2e8f0" : "rgba(255,255,255,0.6)", fontWeight: chunk.type === "title" ? "700" : "400" }}>
                        {chunk.markdown.replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, " ").trim()}
                      </div>
                    )}
                  </div>
                )) : markdown ? (
                  <div className="font-mono text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.6)" }}>{markdown.slice(0, 6000)}</div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FileText className="h-10 w-10 mb-3 opacity-20" style={{ color: "#60a5fa" }} />
                    <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>No parsed content</p>
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>Parse the document first</p>
                  </div>
                )}
              </div>
            ) : (
              <pre className="text-xs font-mono leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                {JSON.stringify({ chunks: chunks.length, tables: tables.length, metadata: (parsedData as { metadata?: unknown })?.metadata }, null, 2)}
              </pre>
            )}
          </div>

          {/* Extraction history */}
          <div className="shrink-0 p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.02)", maxHeight: "260px", overflowY: "auto" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#22d3ee" }}>● EXTRACTION HISTORY</p>
            {docJobs.length === 0 ? (
              <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>Not yet extracted</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>No extraction jobs run for this document</p>
                </div>
                <Link to="/extract">
                  <button className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white" style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
                    <Zap className="h-3.5 w-3.5" />Extract Now <ArrowRight className="h-3 w-3" />
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {docJobs.map((job) => (
                  <div key={job.job_id} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs" style={{ color: "#60a5fa" }}>{job.job_id.slice(0, 12)}…</span>
                        <StatusBadge status={job.status} />
                        <GradeBadge score={job.result?.quality?.score ?? 0} />
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{job.schema_name} · {job.provider}</p>
                    </div>
                    {job.status === "completed" && (
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => handleExport(job.job_id, "excel")} className="rounded-lg px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: "rgba(37,99,235,0.15)", color: "#60a5fa" }}>
                          <Download className="h-3 w-3 inline mr-1" />Excel
                        </button>
                        <button onClick={() => handleExport(job.job_id, "csv")} className="rounded-lg px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>CSV</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Documents() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [viewingDoc, setViewingDoc] = useState<DocMeta | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; label: string } | null>(null);

  // Auto-open viewer if ?view=docId is in the URL
  const routerState = useRouterState();
  const viewParam = new URLSearchParams(routerState.location.search).get("view");

  const { data, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.get("/documents").then((r) => r.data.documents ?? []),
    refetchInterval: (query) => {
      const docs = query.state.data as Array<{ status: string }> | undefined;
      return docs?.some((d) => d.status === "parsing") ? 3000 : false;
    },
  });

  const { data: jobsData } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => api.get("/jobs").then((r) => r.data.jobs ?? []),
  });

  const documents: DocMeta[] = data ?? [];
  const allJobs: ExtractionJob[] = jobsData ?? [];

  // Auto-open viewer when navigated with ?view=docId
  useEffect(() => {
    if (viewParam && documents.length > 0 && !viewingDoc) {
      const doc = documents.find(d => d.id === viewParam);
      if (doc) setViewingDoc(doc);
    }
  }, [viewParam, documents.length]);

  // Filter documents by search + status
  const filteredDocs = documents.filter(doc => {
    const matchSearch = !search || doc.file_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const uploadMut = useMutation({
    mutationFn: (files: File[]) => {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      return api.post("/documents/upload/batch", fd);
    },
    onSuccess: (_, files) => {
      toast.success(`${files.length} file(s) uploaded — parsing started`);
      pushNotification("info", "Documents Uploaded", `${files.length} file(s) uploaded and parsing started`);
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: () => toast.error("Upload failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["documents"] }); },
  });

  const reparseMut = useMutation({
    mutationFn: (id: string) => api.post(`/documents/${id}/reparse`),
    onSuccess: () => { toast.success("Reparsing started"); qc.invalidateQueries({ queryKey: ["documents"] }); },
  });

  const batchParseMut = useMutation({
    mutationFn: (ids: string[]) => api.post("/parse/batch", { document_ids: ids }),
    onSuccess: () => { toast.success("Batch parse started"); qc.invalidateQueries({ queryKey: ["documents"] }); },
  });

  const onDrop = useCallback((files: File[]) => uploadMut.mutate(files), [uploadMut]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp", ".gif", ".heic"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "text/html": [".html", ".htm"],
      "text/csv": [".csv"],
    },
    multiple: true,
  });

  const toggle = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const selectAll = () => setSelected(documents.map((d) => d.id));

  const fmt = (bytes: number) => {
    if (!bytes) return "—";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const anyParsing = documents.some((d) => d.status === "parsing");

  return (
    <>
      {viewingDoc && <DocViewerPanel doc={viewingDoc} onClose={() => setViewingDoc(null)} allJobs={allJobs} />}
      {confirmDelete && (
        <ConfirmDeleteModal
          label={confirmDelete.label}
          count={confirmDelete.ids.length}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            confirmDelete.ids.forEach(id => deleteMut.mutate(id));
            setSelected([]);
            setConfirmDelete(null);
          }}
        />
      )}

      <AppShell title="Files" subtitle="Upload and manage your document files" sectionLabel="DOCUMENT INTAKE">
        <div className="space-y-5">
          <div {...getRootProps()} className="rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer" style={{ borderColor: isDragActive ? "#2563eb" : "rgba(255,255,255,0.1)", backgroundColor: isDragActive ? "rgba(37,99,235,0.08)" : "rgba(255,255,255,0.02)" }}>
            <input {...getInputProps()} />
            <FileUp className="mx-auto h-12 w-12 text-primary" />
            <p className="mt-3 text-lg font-black">Drag & drop PDFs, images, Word, Excel, or any document</p>
            <p className="text-sm text-muted-foreground">PDF · PNG · JPG · DOCX · XLSX · TXT · MD · HTML · CSV · Multiple files supported</p>
            {uploadMut.isPending && <p className="mt-2 text-sm text-primary animate-pulse">Uploading...</p>}
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2 rounded-xl p-3" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Button onClick={() => batchParseMut.mutate(selected)}>Parse Selected ({selected.length})</Button>
              <Button variant="destructive" onClick={() => setConfirmDelete({ ids: selected, label: `${selected.length} document${selected.length > 1 ? "s" : ""}` })}>
                <Trash2 className="h-4 w-4" />Delete Selected ({selected.length})
              </Button>
              <Button asChild><Link to="/extract">Extract Selected →</Link></Button>
              <Button variant="outline" onClick={() => setSelected([])}>Clear</Button>
            </div>
          )}

          <section className="rounded-2xl p-5" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-black">Documents ({filteredDocs.length}{filteredDocs.length !== documents.length ? ` of ${documents.length}` : ""})</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files..."
                    className="h-8 rounded-lg pl-8 pr-3 text-xs w-44"
                    style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc" }} />
                  {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="h-3 w-3" style={{ color: "rgba(255,255,255,0.4)" }} /></button>}
                </div>
                {/* Status filter */}
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="h-8 rounded-lg px-2 text-xs"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc" }}>
                  <option value="all">All Status</option>
                  <option value="parsed">Parsed</option>
                  <option value="parsing">Parsing</option>
                  <option value="uploaded">Uploaded</option>
                  <option value="error">Error</option>
                </select>
                {anyParsing && <span className="text-xs text-primary animate-pulse">Auto-refreshing</span>}
                <Button size="sm" variant="outline" onClick={selectAll}>Select All</Button>
              </div>
            </div>

            {isLoading ? (
              <SkeletonTable rows={5} />
            ) : filteredDocs.length === 0 ? (
              <EmptyState icon={FileUp} title={search || statusFilter !== "all" ? "No matching documents" : "No documents yet"}
                description={search || statusFilter !== "all" ? "Try adjusting your search or filter." : "Drag and drop PDFs, images, or Word files above to get started."}
                action={search || statusFilter !== "all" ? () => { setSearch(""); setStatusFilter("all"); } : undefined}
                actionLabel={search || statusFilter !== "all" ? "Clear filters" : undefined} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="pb-2"><input type="checkbox" onChange={(e) => e.target.checked ? selectAll() : setSelected([])} checked={selected.length === filteredDocs.length && filteredDocs.length > 0} /></th>
                      <th className="pb-2">File Name</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Pages</th>
                      <th className="pb-2">Size</th>
                      <th className="pb-2">Chunks</th>
                      <th className="pb-2">Tables</th>
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((doc) => (
                      <tr key={doc.id} className="border-t border-border hover:bg-white/[0.02] transition-colors">
                        <td className="py-3"><input type="checkbox" checked={selected.includes(doc.id)} onChange={() => toggle(doc.id)} /></td>
                        <td className="py-3">
                          <button onClick={() => setViewingDoc(doc)} className="text-left hover:text-blue-400 transition-colors">
                            <p className="max-w-[200px] truncate font-bold text-white" title={doc.file_name}>{doc.file_name}</p>
                          </button>
                          <CopyId id={doc.id} />
                        </td>
                        <td><StatusBadge status={doc.status} /></td>
                        <td>{doc.page_count || "—"}</td>
                        <td>{fmt(doc.file_size)}</td>
                        <td>{doc.chunk_count || "—"}</td>
                        <td>{doc.table_count || "—"}</td>
                        <td>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" title="View parsed content" onClick={() => setViewingDoc(doc)}><Eye className="h-4 w-4" /></Button>
                            <Button asChild size="icon" variant="ghost" title="Extract"><Link to="/extract" search={{ doc: doc.id } as never}><Zap className="h-4 w-4" /></Link></Button>
                            <Button size="icon" variant="ghost" title="Auto Schema" onClick={() => toast("Go to Intelligence → Auto Schema")}><Brain className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" title="Reparse" onClick={() => reparseMut.mutate(doc.id)}><RefreshCw className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" title="Delete" onClick={() => setConfirmDelete({ ids: [doc.id], label: doc.file_name })}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </AppShell>
    </>
  );
}
