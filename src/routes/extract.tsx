import { useState, useEffect, useRef, useCallback, useMemo, Component, type ReactNode, type ErrorInfo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import {
  FileText, Boxes, FolderArchive, Upload, Layers3, Cpu, Zap, BarChart2,
  CheckCircle2, ChevronRight, ChevronLeft, Download, Loader2,
  RotateCcw, AlertCircle, X, FolderOpen, Eye, MapPin
} from "lucide-react";
import { pushNotification } from "@/components/aqt/app-shell";
import { AppShell } from "@/components/aqt/app-shell";
import { ProviderConfig, type ProviderValues } from "@/components/aqt/provider-config";
import { ResultView } from "@/components/aqt/result-view";
import { StatusBadge } from "@/components/aqt/badges";
import { Button } from "@/components/ui/button";
import { api, downloadBlob, storedKey } from "@/lib/aqt";
import { PdfViewerLazy as PdfViewer, type HighlightBox } from "@/components/aqt/pdf-viewer-lazy";

export const Route = createFileRoute("/extract")({ component: ExtractionWizard });

// ── PDF Error Boundary — prevents PDF crashes from killing the whole page ─────
class PdfErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.warn("PDF viewer error:", error, info); }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
          <FileText className="h-12 w-12 opacity-20" style={{ color: "#60a5fa" }} />
          <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>PDF preview unavailable</p>
          <button onClick={() => this.setState({ hasError: false })} className="text-xs underline" style={{ color: "#60a5fa" }}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Parsed Content Viewer Modal ───────────────────────────────────────────────
function ParsedViewer({ docId, fileName, onClose }: { docId: string; fileName: string; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["doc-parsed-extract", docId],
    queryFn: () => api.get(`/documents/${docId}/parsed`).then(r => r.data),
  });

  const chunks = (data as { chunks?: Array<{ id: string; type: string; markdown: string }> })?.chunks ?? [];
  const tables = (data as { tables?: unknown[] })?.tables ?? [];
  const markdown = (data as { markdown?: string })?.markdown ?? "";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-3xl mx-4 rounded-2xl overflow-hidden flex flex-col" style={{ backgroundColor: "#0d1526", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 32px 80px rgba(0,0,0,0.8)", maxHeight: "80vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ backgroundColor: "#060b14", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <p className="text-sm font-black text-white truncate max-w-[400px]">{fileName}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
              {chunks.length} chunks · {tables.length} tables · {markdown.length} chars
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#3b82f6" }} />
            </div>
          )}
          {error && (
            <div className="py-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 mb-2" style={{ color: "#ef4444" }} />
              <p className="text-sm" style={{ color: "#ef4444" }}>Failed to load parsed content</p>
            </div>
          )}
          {!isLoading && !error && chunks.length === 0 && markdown && (
            <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.7)" }}>
              {markdown.slice(0, 8000)}
            </pre>
          )}
          {!isLoading && !error && chunks.map((chunk, i) => (
            <div key={chunk.id ?? i}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md"
                  style={{ backgroundColor: chunk.type === "table" ? "rgba(34,197,94,0.15)" : "rgba(37,99,235,0.15)", color: chunk.type === "table" ? "#22c55e" : "#60a5fa" }}>
                  {chunk.type}
                </span>
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>#{i + 1}</span>
              </div>
              <div className="rounded-lg px-3 py-2.5 font-mono text-xs leading-relaxed whitespace-pre-wrap"
                style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.65)" }}>
                {chunk.markdown.replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, " ").trim().slice(0, 500)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CARD = { backgroundColor: "#0d1526", border: "1px solid rgba(255,255,255,0.1)" } as const;
const INPUT = { backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc" } as const;

type UploadMode = "single" | "batch" | "zip";

const STEPS = [
  { id: 1, label: "Upload", icon: Upload },
  { id: 2, label: "Schema", icon: Layers3 },
  { id: 3, label: "Engine", icon: Cpu },
  { id: 4, label: "Extract", icon: Zap },
  { id: 5, label: "Results", icon: BarChart2 },
] as const;

// ── Step progress bar ─────────────────────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const done = current > step.id;
        const active = current === step.id;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-black transition-all duration-300"
                style={{
                  background: done ? "linear-gradient(135deg,#22c55e,#16a34a)" : active ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "rgba(255,255,255,0.06)",
                  color: done || active ? "#fff" : "rgba(255,255,255,0.3)",
                  border: active ? "2px solid rgba(124,58,237,0.5)" : "2px solid transparent",
                  boxShadow: active ? "0 0 20px rgba(37,99,235,0.4)" : "none",
                }}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide"
                style={{ color: active ? "#fff" : done ? "#22c55e" : "rgba(255,255,255,0.25)" }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-12 h-px mx-2 mb-5 transition-all duration-500"
                style={{ backgroundColor: done ? "#22c55e" : "rgba(255,255,255,0.08)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Upload ─────────────────────────────────────────────────────────────
function Step1Upload({
  mode, setMode,
  singleDocId, setSingleDocId,
  batchDocIds, setBatchDocIds,
  zipFile, setZipFile,
  onNext,
}: {
  mode: UploadMode; setMode: (m: UploadMode) => void;
  singleDocId: string; setSingleDocId: (id: string) => void;
  batchDocIds: string[]; setBatchDocIds: (ids: string[]) => void;
  zipFile: File | null; setZipFile: (f: File | null) => void;
  onNext: () => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: docsData, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.get("/documents").then(r => r.data.documents ?? []),
    refetchInterval: 3000,
  });
  const parsedDocs = (docsData ?? []).filter((d: { status: string }) => d.status === "parsed");
  const allDocs = docsData ?? [];
  const anyParsing = allDocs.some((d: { status: string }) => ["parsing", "uploaded"].includes(d.status));

  // Upload mutation for single/batch files
  const uploadMut = useMutation({
    mutationFn: (files: File[]) => {
      const fd = new FormData();
      files.forEach(f => fd.append("files", f));
      return api.post("/documents/upload/batch", fd);
    },
    onSuccess: (res, files) => {
      toast.success(`${files.length} file(s) uploaded — parsing started`);
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: () => toast.error("Upload failed"),
  });

  // Dropzone for single/batch
  const onDropFiles = useCallback((files: File[]) => {
    if (mode === "single" && files.length > 1) {
      toast.error("Single mode: drop one file at a time");
      files = [files[0]];
    }
    uploadMut.mutate(files);
  }, [mode, uploadMut]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropFiles,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".tiff", ".webp"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: mode === "batch",
    disabled: mode === "zip",
  });

  // Dropzone for ZIP
  const onDropZip = useCallback((files: File[]) => {
    if (files[0]) setZipFile(files[0]);
  }, [setZipFile]);

  const { getRootProps: getZipRootProps, getInputProps: getZipInputProps, isDragActive: isZipDrag } = useDropzone({
    onDrop: onDropZip,
    accept: { "application/zip": [".zip"], "application/x-zip-compressed": [".zip"] },
    multiple: false,
    disabled: mode !== "zip",
  });

  const toggleBatch = (id: string) =>
    setBatchDocIds(batchDocIds.includes(id) ? batchDocIds.filter(x => x !== id) : [...batchDocIds, id]);

  const canNext =
    (mode === "single" && !!singleDocId) ||
    (mode === "batch" && batchDocIds.length > 0) ||
    (mode === "zip" && !!zipFile);

  const MODES = [
    { id: "single" as UploadMode, icon: FileText, label: "Single File", desc: "Upload & extract one document" },
    { id: "batch" as UploadMode, icon: Boxes, label: "Batch Upload", desc: "Upload multiple PDFs at once" },
    { id: "zip" as UploadMode, icon: FolderArchive, label: "ZIP Folder", desc: "Upload a ZIP containing PDFs" },
  ];

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      <div className="grid grid-cols-3 gap-3">
        {MODES.map(opt => (
          <button key={opt.id} onClick={() => setMode(opt.id)}
            className="flex flex-col items-center gap-3 rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: mode === opt.id ? "linear-gradient(135deg,rgba(37,99,235,0.2),rgba(124,58,237,0.15))" : "rgba(255,255,255,0.03)",
              border: mode === opt.id ? "1px solid rgba(37,99,235,0.4)" : "1px solid rgba(255,255,255,0.07)",
              boxShadow: mode === opt.id ? "0 0 24px rgba(37,99,235,0.15)" : "none",
            }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: mode === opt.id ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "rgba(255,255,255,0.06)" }}>
              <opt.icon className="h-6 w-6 text-white" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-white">{opt.label}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{opt.desc}</p>
            </div>
            {mode === opt.id && <CheckCircle2 className="h-4 w-4" style={{ color: "#22c55e" }} />}
          </button>
        ))}
      </div>

      {/* ── ZIP mode ── */}
      {mode === "zip" && (
        <div className="space-y-4">
          <div {...getZipRootProps()} className="rounded-2xl p-10 text-center cursor-pointer transition-all"
            style={{
              border: isZipDrag ? "2px dashed #2563eb" : "2px dashed rgba(255,255,255,0.12)",
              backgroundColor: isZipDrag ? "rgba(37,99,235,0.08)" : "rgba(255,255,255,0.02)",
            }}>
            <input {...getZipInputProps()} />
            <FolderArchive className="mx-auto h-12 w-12 mb-3" style={{ color: isZipDrag ? "#60a5fa" : "rgba(255,255,255,0.3)" }} />
            <p className="text-base font-black text-white">
              {zipFile ? zipFile.name : isZipDrag ? "Drop ZIP here" : "Drop your ZIP file here"}
            </p>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              {zipFile ? `${(zipFile.size / 1024 / 1024).toFixed(1)} MB · Ready to extract` : "Must contain PDF, PNG, JPG, DOCX, or XLSX files"}
            </p>
            {zipFile && (
              <button onClick={e => { e.stopPropagation(); setZipFile(null); }}
                className="mt-3 flex items-center gap-1 mx-auto text-xs rounded-lg px-3 py-1.5 transition-colors hover:bg-white/10"
                style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                <X className="h-3 w-3" /> Remove
              </button>
            )}
          </div>
          {zipFile && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#22c55e" }} />
              <p className="text-sm font-bold" style={{ color: "#22c55e" }}>
                ZIP ready: {zipFile.name} — PDFs will be extracted and processed automatically
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Single / Batch mode ── */}
      {mode !== "zip" && (
        <div className="space-y-4">
          {/* Drop zone */}
          <div {...getRootProps()} className="rounded-2xl p-8 text-center cursor-pointer transition-all"
            style={{
              border: isDragActive ? "2px dashed #2563eb" : "2px dashed rgba(255,255,255,0.1)",
              backgroundColor: isDragActive ? "rgba(37,99,235,0.08)" : "rgba(255,255,255,0.02)",
            }}>
            <input {...getInputProps()} />
            {uploadMut.isPending
              ? <Loader2 className="mx-auto h-10 w-10 animate-spin mb-3 text-blue-400" />
              : <Upload className="mx-auto h-10 w-10 mb-3" style={{ color: isDragActive ? "#60a5fa" : "rgba(255,255,255,0.3)" }} />
            }
            <p className="text-base font-black text-white">
              {uploadMut.isPending ? "Uploading..." : isDragActive ? "Drop files here" : mode === "single" ? "Drop one PDF here" : "Drop multiple PDFs here"}
            </p>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              {mode === "single" ? "PDF · PNG · JPG · DOCX · XLSX" : "Multiple files supported · PDF · PNG · JPG · DOCX"}
            </p>
          </div>

          {/* Document list */}
          <div className="rounded-2xl p-5" style={CARD}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22d3ee" }}>
                  ● DOCUMENTS
                </p>
                <p className="text-sm font-black text-white mt-1">
                  {parsedDocs.length} ready to extract · {allDocs.length} total
                  {anyParsing && <span className="ml-2 text-xs animate-pulse" style={{ color: "#60a5fa" }}>⟳ Parsing...</span>}
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />)}
              </div>
            ) : allDocs.length === 0 ? (
              <div className="py-10 text-center">
                <FolderOpen className="mx-auto h-10 w-10 mb-3 opacity-20" style={{ color: "#60a5fa" }} />
                <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>No documents yet</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>Upload a file above — parsing starts automatically</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {mode === "single" && parsedDocs.length > 0 && !singleDocId && (
                  <p className="text-xs mb-2 text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
                    👆 Click a parsed document below to select it for extraction
                  </p>
                )}
                {allDocs.map((doc: { id: string; file_name: string; page_count: number; file_size: number; status: string }) => {
                  const isParsed = doc.status === "parsed";
                  const isParsing = doc.status === "parsing" || doc.status === "uploaded";
                  const isSelected = mode === "single" ? singleDocId === doc.id : batchDocIds.includes(doc.id);
                  return (
                    <div key={doc.id}
                      onClick={() => {
                        if (mode === "single" && isParsed) setSingleDocId(doc.id);
                        else if (mode === "batch" && isParsed) toggleBatch(doc.id);
                      }}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-150"
                      style={{
                        backgroundColor: isSelected
                          ? "rgba(37,99,235,0.18)"
                          : isParsed ? "rgba(37,99,235,0.05)" : "rgba(255,255,255,0.02)",
                        border: isSelected
                          ? "1px solid rgba(37,99,235,0.55)"
                          : isParsed ? "1px solid rgba(37,99,235,0.15)" : "1px solid rgba(255,255,255,0.06)",
                        opacity: isParsed ? 1 : 0.55,
                        cursor: isParsed ? "pointer" : "default",
                        boxShadow: isSelected ? "0 0 12px rgba(37,99,235,0.2)" : "none",
                      }}>
                      {/* File icon */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: isSelected ? "rgba(37,99,235,0.35)" : isParsed ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.06)" }}>
                        <FileText className="h-4 w-4" style={{ color: isParsed ? "#60a5fa" : "rgba(255,255,255,0.4)" }} />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {isParsed && !isSelected && mode === "single" && (
                            <span className="text-[10px] font-bold" style={{ color: "rgba(96,165,250,0.6)" }}>Click to select</span>
                          )}
                          {isParsed && <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{doc.page_count}p · {(doc.file_size / 1024).toFixed(0)} KB</span>}
                          {isParsing && <span className="text-xs animate-pulse" style={{ color: "#60a5fa" }}>⟳ Parsing...</span>}
                          {doc.status === "error" && <span className="text-xs" style={{ color: "#ef4444" }}>✗ Parse failed</span>}
                        </div>
                      </div>
                      {/* Status / selection indicator */}
                      {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#22c55e" }} />}
                      {!isSelected && isParsed && <div className="h-4 w-4 shrink-0 rounded-full" style={{ border: "2px solid rgba(255,255,255,0.15)" }} />}
                      {isParsing && <div className="h-4 w-4 shrink-0 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />}
                      {/* Eye icon — view parsed content */}
                      {isParsed && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate({ to: "/documents", search: { view: doc.id } as never }); }}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all hover:bg-white/10 hover:scale-110"
                          style={{ color: "rgba(255,255,255,0.4)" }}
                          title="View parsed content"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auto-selection summary */}
      {canNext && mode !== "zip" && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#22c55e" }} />
          <p className="text-sm font-bold" style={{ color: "#22c55e" }}>
            {mode === "single"
              ? `Ready: ${parsedDocs.find((d: { id: string; file_name: string }) => d.id === singleDocId)?.file_name}`
              : `${batchDocIds.length} document${batchDocIds.length > 1 ? "s" : ""} will be extracted`}
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={onNext} disabled={!canNext}
          className="flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-black text-white transition-all disabled:opacity-40 hover:-translate-y-0.5"
          style={{ background: canNext ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "rgba(255,255,255,0.06)" }}>
          Next: Schema <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

//  Step 2: Schema 
function Step2Schema({ schemaId, setSchemaId, onNext, onBack }: {
  schemaId: string; setSchemaId: (id: string) => void; onNext: () => void; onBack: () => void;
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"select" | "upload" | "create" | "ai">("select");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newFields, setNewFields] = useState([{ name: "", type: "string", required: false }]);
  const [aiDocId, setAiDocId] = useState("");
  const [aiKey, setAiKey] = useState(() => { try { return localStorage.getItem("aqt_openai_key") ?? ""; } catch { return ""; } });
  const [aiModel, setAiModel] = useState("gpt-4o-mini");
  const [aiDomain, setAiDomain] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  const { data, isLoading, refetch } = useQuery({ queryKey: ["schemas"], queryFn: () => api.get("/schemas").then(r => r.data.schemas ?? []) });
  const { data: docsData } = useQuery({ queryKey: ["documents"], queryFn: () => api.get("/documents").then(r => r.data.documents ?? []) });
  const schemas = data ?? [];
  const parsedDocs = (docsData ?? []).filter((d: { status: string }) => d.status === "parsed");

  const uploadMut = useMutation({
    mutationFn: (file: File) => { const fd = new FormData(); fd.append("file", file); return api.post("/schemas/upload", fd); },
    onSuccess: (res) => { toast.success(`Schema uploaded: ${res.data.name ?? "done"}`); refetch(); setTab("select"); },
    onError: () => toast.error("Upload failed"),
  });

  const createMut = useMutation({
    mutationFn: () => api.post("/schemas", { name: newName, description: newDesc, domain: newDomain, fields: newFields }),
    onSuccess: (res) => {
      toast.success("Schema created"); refetch();
      setSchemaId(res.data.id ?? ""); setTab("select");
      setNewName(""); setNewDesc(""); setNewDomain(""); setNewFields([{ name: "", type: "string", required: false }]);
    },
    onError: () => toast.error("Failed to create schema"),
  });

  const generateAI = async () => {
    if (!aiDocId) return toast.error("Select a document");
    if (!aiKey) return toast.error("Enter OpenAI API key");
    setAiGenerating(true);
    try {
      const res = await api.post("/intelligence/auto-schema", { document_id: aiDocId, api_key: aiKey, model: aiModel, domain_hint: aiDomain, max_fields: 30, save: true });
      toast.success(`Schema generated: ${res.data.field_count} fields`);
      refetch(); setTab("select");
    } catch { toast.error("Schema generation failed"); }
    finally { setAiGenerating(false); }
  };

  const TABS = [
    { id: "select" as const, label: "Select", icon: "📋" },
    { id: "upload" as const, label: "Upload JSON", icon: "📤" },
    { id: "create" as const, label: "Create", icon: "✏️" },
    { id: "ai" as const, label: "AI Generate", icon: "🤖" },
  ];

  const FIELD_TYPES = ["string", "number", "integer", "boolean", "date", "currency", "email", "phone", "url", "list", "object"];

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              background: tab === t.id ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "rgba(255,255,255,0.04)",
              color: tab === t.id ? "#fff" : "rgba(255,255,255,0.5)",
              border: tab === t.id ? "none" : "1px solid rgba(255,255,255,0.08)",
            }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── SELECT tab ── */}
      {tab === "select" && (
        <div className="rounded-2xl p-5" style={CARD}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#22d3ee" }}>● SELECT SCHEMA</p>
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />)}</div>
          ) : schemas.length === 0 ? (
            <div className="py-10 text-center">
              <Layers3 className="mx-auto h-10 w-10 mb-3 opacity-20" style={{ color: "#60a5fa" }} />
              <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>No schemas yet</p>
              <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>Use the tabs above to upload, create, or AI-generate a schema</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {schemas.map((s: { id: string; name: string; field_count: number; domain: string }) => {
                const sel = schemaId === s.id;
                return (
                  <button key={s.id} onClick={() => setSchemaId(s.id)}
                    className="w-full flex items-center gap-4 rounded-xl px-4 py-3.5 text-left transition-all hover:-translate-y-0.5"
                    style={{ backgroundColor: sel ? "rgba(37,99,235,0.12)" : "rgba(255,255,255,0.02)", border: sel ? "1px solid rgba(37,99,235,0.35)" : "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: sel ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "rgba(255,255,255,0.06)" }}>
                      <Layers3 className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{s.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ backgroundColor: "rgba(37,99,235,0.15)", color: "#60a5fa" }}>{s.field_count} fields</span>
                        {s.domain && <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{s.domain}</span>}
                      </div>
                    </div>
                    {sel && <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#22c55e" }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── UPLOAD tab ── */}
      {tab === "upload" && (
        <div className="rounded-2xl p-5 space-y-4" style={CARD}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22d3ee" }}>● UPLOAD JSON SCHEMA</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>Upload any JSON schema file — the system adapts it automatically to the internal format.</p>
          <label className="flex flex-col items-center gap-3 rounded-2xl p-8 cursor-pointer transition-all hover:bg-white/[0.03]"
            style={{ border: "2px dashed rgba(255,255,255,0.12)" }}>
            <Upload className="h-10 w-10" style={{ color: "rgba(255,255,255,0.3)" }} />
            <p className="text-sm font-bold text-white">Click to select JSON file</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Supports any JSON schema format</p>
            <input type="file" accept=".json" className="hidden"
              onChange={e => { if (e.target.files?.[0]) uploadMut.mutate(e.target.files[0]); }} />
          </label>
          {uploadMut.isPending && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "#60a5fa" }}>
              <Loader2 className="h-4 w-4 animate-spin" />Uploading and adapting schema...
            </div>
          )}
        </div>
      )}

      {/* ── CREATE tab ── */}
      {tab === "create" && (
        <div className="rounded-2xl p-5 space-y-4" style={CARD}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22d3ee" }}>● CREATE SCHEMA</p>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Schema name *"
            className="w-full h-10 rounded-lg px-3 text-sm" style={INPUT} />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)"
            className="w-full h-10 rounded-lg px-3 text-sm" style={INPUT} />
          <input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="Domain (e.g. HVAC, Foodservice)"
            className="w-full h-10 rounded-lg px-3 text-sm" style={INPUT} />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Fields</p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {newFields.map((f, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={f.name} onChange={e => setNewFields(fs => fs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    placeholder="field_name" className="flex-1 h-9 rounded-lg px-3 text-xs" style={INPUT} />
                  <select value={f.type} onChange={e => setNewFields(fs => fs.map((x, j) => j === i ? { ...x, type: e.target.value } : x))}
                    className="h-9 rounded-lg px-2 text-xs" style={INPUT}>
                    {FIELD_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-xs shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>
                    <input type="checkbox" checked={f.required} onChange={e => setNewFields(fs => fs.map((x, j) => j === i ? { ...x, required: e.target.checked } : x))} />
                    Req
                  </label>
                  <button onClick={() => setNewFields(fs => fs.filter((_, j) => j !== i))}
                    className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-red-500/20 transition-colors shrink-0"
                    style={{ color: "#ef4444" }}>×</button>
                </div>
              ))}
            </div>
            <button onClick={() => setNewFields(fs => [...fs, { name: "", type: "string", required: false }])}
              className="mt-2 text-xs font-bold hover:text-white transition-colors" style={{ color: "#60a5fa" }}>
              + Add Field
            </button>
          </div>
          <button onClick={() => createMut.mutate()} disabled={!newName || createMut.isPending}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-black text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
            {createMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Creating...</> : "Save Schema"}
          </button>
        </div>
      )}

      {/* ── AI GENERATE tab ── */}
      {tab === "ai" && (
        <div className="rounded-2xl p-5 space-y-4" style={CARD}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22d3ee" }}>● AI SCHEMA GENERATOR</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>GPT-4o analyzes your document and builds the perfect extraction schema automatically.</p>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Document</label>
            <select value={aiDocId} onChange={e => setAiDocId(e.target.value)} className="w-full h-10 rounded-lg px-3 text-sm" style={INPUT}>
              <option value="">Select a parsed document...</option>
              {parsedDocs.map((d: { id: string; file_name: string }) => <option key={d.id} value={d.id}>{d.file_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>OpenAI API Key</label>
            <input type="password" value={aiKey} onChange={e => { setAiKey(e.target.value); try { localStorage.setItem("aqt_openai_key", e.target.value); } catch { } }}
              placeholder="sk-..." className="w-full h-10 rounded-lg px-3 text-sm font-mono" style={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Model</label>
              <select value={aiModel} onChange={e => setAiModel(e.target.value)} className="w-full h-10 rounded-lg px-3 text-sm" style={INPUT}>
                <option value="gpt-4o-mini">gpt-4o-mini (Faster)</option>
                <option value="gpt-4o">gpt-4o (Best)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Domain Hint</label>
              <input value={aiDomain} onChange={e => setAiDomain(e.target.value)} placeholder="e.g. HVAC, Foodservice"
                className="w-full h-10 rounded-lg px-3 text-sm" style={INPUT} />
            </div>
          </div>
          <button onClick={generateAI} disabled={!aiDocId || !aiKey || aiGenerating}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-black text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
            {aiGenerating ? <><Loader2 className="h-4 w-4 animate-spin" />Generating schema...</> : <>🤖 Generate Schema with AI</>}
          </button>
        </div>
      )}

      {schemaId && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#22c55e" }} />
          <p className="text-sm font-bold" style={{ color: "#22c55e" }}>Schema: {schemas.find((s: { id: string; name: string }) => s.id === schemaId)?.name}</p>
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={onBack} className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all hover:bg-white/10"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <button onClick={onNext} disabled={!schemaId}
          className="flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-black text-white transition-all disabled:opacity-40 hover:-translate-y-0.5"
          style={{ background: schemaId ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "rgba(255,255,255,0.06)" }}>
          Next: Engine <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

//  Step 3: Engine 
function Step3Engine({ provider, setProvider, multiRecord, setMultiRecord, visionParse, setVisionParse, smartRetry, setSmartRetry, retryThreshold, setRetryThreshold, onNext, onBack }: {
  provider: ProviderValues; setProvider: (v: ProviderValues) => void;
  multiRecord: boolean; setMultiRecord: (v: boolean) => void;
  visionParse: boolean; setVisionParse: (v: boolean) => void;
  smartRetry: boolean; setSmartRetry: (v: boolean) => void;
  retryThreshold: number; setRetryThreshold: (v: number) => void;
  onNext: () => void; onBack: () => void;
}) {
  const visionSupported = ["landingai", "openai", "chatgpt", "anthropic", "gemini"].includes(provider.provider);

  const Toggle = ({ val, set, label, desc, warn }: { val: boolean; set: (v: boolean) => void; label: string; desc: string; warn?: string }) => (
    <label className="flex items-start justify-between rounded-xl px-4 py-3 cursor-pointer transition-colors hover:bg-white/[0.02]" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{desc}</p>
        {warn && val && <p className="text-xs mt-1 font-semibold" style={{ color: "#f59e0b" }}>⚠ {warn}</p>}
      </div>
      <div onClick={() => set(!val)} className="relative h-6 w-11 rounded-full transition-all cursor-pointer shrink-0 mt-0.5" style={{ backgroundColor: val ? "#2563eb" : "rgba(255,255,255,0.1)" }}>
        <div className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: val ? "calc(100% - 22px)" : "2px" }} />
      </div>
    </label>
  );
  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-5" style={CARD}>
        <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#22d3ee" }}> AI ENGINE</p>
        <ProviderConfig value={provider} onChange={setProvider} />
      </div>
      <div className="rounded-2xl p-5 space-y-3" style={CARD}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22d3ee" }}> OPTIONS</p>
        <Toggle val={multiRecord} set={setMultiRecord} label="Multi-record mode" desc="Extract all model variants from one PDF simultaneously" />

        {/* Vision Parse toggle — only show for vision-capable providers */}
        {visionSupported ? (
          <Toggle
            val={visionParse}
            set={setVisionParse}
            label="🤖 AI Parse"
            desc="Use AI vision to read dimensions from diagrams and images — extracts data that text parsers miss"
            warn="Uses additional API credits per page"
          />
        ) : (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ border: "1px solid rgba(255,255,255,0.06)", opacity: 0.4 }}>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">🤖 AI Parse</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Not available for {provider.provider} — use LandingAI, GPT-4o, Claude, or Gemini</p>
            </div>
          </div>
        )}

        <Toggle val={smartRetry} set={setSmartRetry} label="Smart Retry" desc="Re-extract low-confidence fields automatically" />
        {smartRetry && (
          <div className="px-4 pb-2">
            <p className="text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Retry threshold: {Math.round(retryThreshold * 100)}% confidence</p>
            <input type="range" min="0" max="1" step="0.05" value={retryThreshold} onChange={e => setRetryThreshold(Number(e.target.value))} className="w-full" />
          </div>
        )}
      </div>
      <div className="flex justify-between">
        <button onClick={onBack} className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all hover:bg-white/10" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}><ChevronLeft className="h-4 w-4" /> Back</button>
        <button onClick={onNext} className="flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-black text-white transition-all hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>Start Extraction <Zap className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

//  Step 4: Running 
function Step4Running({ mode, singleDocId, batchDocIds, zipFile, schemaId, provider, multiRecord, visionParse, onDone, onError }: {
  mode: UploadMode; singleDocId: string; batchDocIds: string[]; zipFile: File | null;
  schemaId: string; provider: ProviderValues; multiRecord: boolean; visionParse: boolean;
  onDone: (result: Record<string, unknown>, jobId: string) => void;
  onError: (msg: string) => void;
}) {
  const [batchStatus, setBatchStatus] = useState<{ status: string; total: number; completed: number; failed: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phases = ["Connecting to AI engine...", "Parsing document structure...", "Extracting field values...", "Scoring confidence...", "Finalizing results..."];

  useEffect(() => {
    const t1 = setInterval(() => setElapsed(e => e + 1), 1000);
    const t2 = setInterval(() => setPhase(p => Math.min(p + 1, phases.length - 1)), 8000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  const startPoll = (batchId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/batch/${batchId}`);
        setBatchStatus(res.data);
        if (["completed", "completed_with_errors"].includes(res.data.status)) {
          clearInterval(pollRef.current!);
          onDone({ batch_id: batchId, ...res.data }, batchId);
        } else if (res.data.status === "failed") {
          clearInterval(pollRef.current!);
          onError("Batch extraction failed");
        }
      } catch { clearInterval(pollRef.current!); }
    }, 3000);
  };

  useEffect(() => {
    if (mode === "single") {
      api.post("/extraction/run", { document_id: singleDocId, schema_id: schemaId, provider_config: provider, options: { multi_record: multiRecord, vision_parse: visionParse } })
        .then(res => onDone(res.data, res.data.job_id))
        .catch(err => onError(err.response?.data?.detail ?? "Extraction failed"));
    } else if (mode === "batch") {
      if (!batchDocIds || batchDocIds.length === 0) {
        onError("No documents selected for batch extraction");
        return;
      }
      api.post("/batch/run-from-documents", {
        document_ids: batchDocIds,
        schema_id: schemaId,
        provider: provider.provider,
        api_key: provider.api_key,
        base_url: provider.base_url,
        model: provider.model,
        multi_record: multiRecord,
        vision_parse: visionParse,
      })
        .then(res => startPoll(res.data.batch_id))
        .catch(err => onError(err.response?.data?.detail ?? "Batch failed"));
    } else if (mode === "zip" && zipFile) {
      const fd = new FormData();
      fd.append("file", zipFile);
      fd.append("schema_id", schemaId);
      fd.append("provider", provider.provider);
      fd.append("api_key", provider.api_key || "");
      fd.append("base_url", provider.base_url || "");
      fd.append("model", provider.model || "");
      fd.append("multi_record", String(multiRecord));
      api.post("/batch/run-from-zip", fd)
        .then(res => startPoll(res.data.batch_id))
        .catch(err => onError(err.response?.data?.detail ?? "ZIP batch failed"));
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const progress = batchStatus ? Math.round((batchStatus.completed / batchStatus.total) * 100) : null;
  const isBatch = mode !== "single";

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-8">
      <div className="relative">
        <div className="h-24 w-24 rounded-full animate-spin" style={{ border: "3px solid rgba(37,99,235,0.15)", borderTopColor: "#2563eb" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Zap className="h-8 w-8" style={{ color: "#60a5fa" }} />
        </div>
        <div className="absolute -inset-3 rounded-full animate-ping opacity-10" style={{ backgroundColor: "#2563eb" }} />
      </div>
      <div>
        <h2 className="text-2xl font-black text-white mb-2">{isBatch ? "Processing Batch" : "Extracting Data"}</h2>
        <p className="text-sm animate-pulse" style={{ color: "#60a5fa" }}>{phases[phase]}</p>
        <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.25)" }}>{elapsed}s elapsed</p>
      </div>
      {batchStatus && (
        <div className="w-full max-w-md space-y-3">
          <div className="flex justify-between text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            <span>{batchStatus.completed} / {batchStatus.total} documents</span>
            <span className="font-black text-white">{progress}%</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "linear-gradient(90deg,#2563eb,#7c3aed)" }} />
          </div>
          {batchStatus.failed > 0 && <p className="text-xs" style={{ color: "#ef4444" }}>{batchStatus.failed} failed</p>}
        </div>
      )}
      {!isBatch && (
        <div className="flex flex-wrap justify-center gap-3 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
          <span>Landing AI: ~20s</span><span></span><span>GPT-4o: ~30s</span><span></span><span>Claude: ~35s</span>
        </div>
      )}
    </div>
  );
}

// ── Batch Results View ────────────────────────────────────────────────────────
function BatchResultsView({ batchId, schemaName }: { batchId: string; schemaName?: string }) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobDetail, setJobDetail] = useState<Record<string, unknown> | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const { data: batchData } = useQuery({
    queryKey: ["batch-status", batchId],
    queryFn: () => api.get(`/batch/${batchId}`).then(r => r.data),
    refetchInterval: (q) => {
      const d = q.state.data as { status?: string } | undefined;
      return d?.status === "running" ? 3000 : false;
    },
  });

  const jobIds: string[] = batchData?.job_ids ?? [];

  const { data: jobsData } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => api.get("/jobs").then(r => r.data.jobs ?? []),
  });

  const batchJobs = (jobsData ?? []).filter((j: { job_id: string; batch_id?: string }) => j.batch_id === batchId);

  const loadJob = async (jobId: string) => {
    setSelectedJobId(jobId);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/jobs/${jobId}`);
      setJobDetail(res.data);
    } catch { toast.error("Failed to load result"); }
    setLoadingDetail(false);
  };

  const result = jobDetail?.result as Record<string, unknown> | undefined;
  type QT = { score?: number; breakdown?: { coverage?: number; avg_confidence?: number }; missing_critical?: string[]; suggestions?: string[] };
  const quality = (result as { quality?: QT } | undefined)?.quality;
  const records = (result as { records?: unknown[] } | undefined)?.records as Array<{ result: Record<string, unknown>; confidence: Record<string, number>; schema_fields?: string[] }> | undefined;
  const singleResult = (result as { result?: Record<string, unknown> } | undefined)?.result;
  const confidence = (result as { confidence?: Record<string, number> } | undefined)?.confidence ?? {};
  const schemaFields = (result as { schema_fields?: string[] } | undefined)?.schema_fields ?? [];
  const failureLog = (result as { failure_log?: Array<{ type: string; reason?: string }> } | undefined)?.failure_log ?? [];

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      {/* Left: job list */}
      <div className="rounded-2xl p-4 space-y-2" style={CARD}>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#22d3ee" }}>
          ● {batchJobs.length} DOCUMENTS
        </p>
        {batchJobs.length === 0 ? (
          <div className="py-6 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" style={{ color: "#3b82f6" }} />
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Loading results...</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {batchJobs.map((job: { job_id: string; schema_name: string; status: string; result?: { quality?: { score?: number } } }) => {
              const score = job.result?.quality?.score ?? 0;
              const isSelected = selectedJobId === job.job_id;
              const gradeColors: Record<string, string> = { A: "#22c55e", B: "#60a5fa", C: "#f59e0b", D: "#f97316", F: "#ef4444" };
              const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 45 ? "D" : "F";
              return (
                <button key={job.job_id}
                  onClick={() => loadJob(job.job_id)}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-white/[0.04]"
                  style={{
                    backgroundColor: isSelected ? "rgba(37,99,235,0.12)" : "rgba(255,255,255,0.02)",
                    border: isSelected ? "1px solid rgba(37,99,235,0.3)" : "1px solid rgba(255,255,255,0.06)",
                  }}>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: job.status === "completed" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)" }}>
                    {job.status === "completed"
                      ? <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#22c55e" }} />
                      : <AlertCircle className="h-3.5 w-3.5" style={{ color: "#ef4444" }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{job.schema_name || "Document"}</p>
                    <p className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>{job.job_id.slice(0, 10)}…</p>
                  </div>
                  {score > 0 && (
                    <span className="text-xs font-black shrink-0" style={{ color: gradeColors[grade] }}>{grade}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: result detail */}
      <div className="rounded-2xl p-5 min-h-[300px]" style={CARD}>
        {!selectedJobId && (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <Boxes className="h-12 w-12 mb-3 opacity-20" style={{ color: "#60a5fa" }} />
            <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>Select a document</p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>Click any document on the left to view its extracted data</p>
          </div>
        )}
        {loadingDetail && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#3b82f6" }} />
          </div>
        )}
        {jobDetail && !loadingDetail && (
          <>
            <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <p className="text-sm font-black text-white">{String(jobDetail.schema_name ?? "Result")}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs" style={{ color: "#60a5fa" }}>{String(jobDetail.job_id ?? "").slice(0, 14)}…</span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{String(jobDetail.provider ?? "")}</span>
                  {quality?.score !== undefined && (
                    <span className="text-xs font-black" style={{ color: quality.score >= 75 ? "#22c55e" : "#f59e0b" }}>
                      {quality.score}/100
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={async () => { const r = await api.get(`/export/${selectedJobId}/excel`, { responseType: "blob" }); downloadBlob(r.data, `result_${selectedJobId!.slice(0, 8)}.xlsx`); }}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-black text-white"
                  style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                  <Download className="h-3 w-3" />Excel
                </button>
                <button onClick={async () => { const r = await api.get(`/export/${selectedJobId}/csv`, { responseType: "blob" }); downloadBlob(r.data, `result_${selectedJobId!.slice(0, 8)}.csv`); }}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                  CSV
                </button>
              </div>
            </div>
            <ResultView
              result={singleResult} confidence={confidence} records={records}
              schemaFields={schemaFields} score={quality?.score ?? 0} failureLog={failureLog}
              provider={String(jobDetail.provider ?? "")} schemaName={schemaName}
              jobId={selectedJobId ?? undefined}
              coverage={quality?.breakdown?.coverage ? Math.round((quality.breakdown.coverage / 40) * 100) : undefined}
              avgConfidence={quality?.breakdown?.avg_confidence ? Math.round((quality.breakdown.avg_confidence / 35) * 100) : undefined}
              missingFields={quality?.missing_critical ?? []} suggestions={quality?.suggestions ?? []}
            />
          </>
        )}
      </div>
    </div>
  );
}

//  Step 5: Results — split-pane with PDF highlight
function Step5Results({ result, jobId, mode, schemaId, provider, singleDocId, onRestart }: {
  result: Record<string, unknown>; jobId: string; mode: UploadMode;
  schemaId: string; provider: ProviderValues; singleDocId?: string; onRestart: () => void;
}) {
  const { data: schemasData } = useQuery({ queryKey: ["schemas"], queryFn: () => api.get("/schemas").then(r => r.data.schemas ?? []) });
  const schemas = schemasData ?? [];
  const schemaName = schemas.find((s: { id: string; name: string }) => s.id === schemaId)?.name;
  const isBatch = mode !== "single";
  const batchId = isBatch ? (result.batch_id as string) : undefined;

  // Fetch full job detail (has sources, evidence, document_id)
  const { data: jobDetail } = useQuery({
    queryKey: ["job-detail-extract", jobId],
    queryFn: () => api.get(`/jobs/${jobId}`).then(r => r.data),
    enabled: !!jobId && !isBatch,
    staleTime: 60_000,
  });

  // Use singleDocId immediately — no need to wait for jobDetail for the document ID
  const documentId: string | undefined = singleDocId ?? jobDetail?.document_id;
  const sources: Record<string, string> = jobDetail?.sources ?? {};
  const evidence: Record<string, string> = jobDetail?.evidence ?? {};

  // Get file_path from the already-cached documents list (avoids extra fetch)
  const { data: docsListData } = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.get("/documents").then(r => r.data.documents ?? []),
    staleTime: 60_000,
    enabled: !isBatch,
  });
  const docFromList = (docsListData ?? []).find((d: { id: string }) => d.id === documentId);

  // Fetch parsed document data for grounding boxes
  const { data: parsedData } = useQuery({
    queryKey: ["doc-parsed-result", documentId],
    queryFn: () => api.get(`/documents/${documentId}/parsed`).then(r => r.data),
    enabled: !!documentId && !isBatch,
    staleTime: 300_000,
  });

  const chunks: Array<{ id: string; type: string; markdown: string; grounding?: { page: number; box?: { left: number; top: number; right: number; bottom: number } } }> =
    (parsedData as { chunks?: typeof chunks })?.chunks ?? [];
  const splits: Array<{ pages: number[]; chunks: string[] }> = (parsedData as { splits?: typeof splits })?.splits ?? [];
  const pageCount: number = (parsedData as { metadata?: { page_count?: number } })?.metadata?.page_count
    ?? docFromList?.page_count ?? 1;

  // Build chunk→page map (same logic as documents.tsx)
  const chunkPageMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of chunks) { if (c.grounding?.page !== undefined) map[c.id] = c.grounding.page + 1; }
    for (const s of splits) { const pg = (s.pages?.[0] ?? 0) + 1; for (const cid of s.chunks ?? []) { if (!map[cid]) map[cid] = pg; } }
    const unique = new Set(Object.values(map));
    if (unique.size === 1 && pageCount > 1 && chunks.length > 0) {
      const cpp = Math.ceil(chunks.length / pageCount);
      chunks.forEach((c, i) => { map[c.id] = Math.min(Math.floor(i / cpp) + 1, pageCount); });
    }
    return map;
  }, [chunks, splits, pageCount]);

  // PDF viewer state
  const [pdfPage, setPdfPage] = useState(1);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<HighlightBox[]>([]);

  // Build file URL from the document list entry (file_path is like "./uploads/uuid.pdf")
  const BACKEND = (import.meta as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE?.replace(/\/api\/v1\/?$/, "") ?? "http://127.0.0.1:8000";
  const fileBasename = docFromList?.file_path
    ? (docFromList.file_path as string).replace(/\\/g, "/").split("/").pop()
    : null;
  const fileUrl = fileBasename ? `${BACKEND}/uploads/${fileBasename}` : null;
  const isPdf = fileUrl && /\.pdf$/i.test(fileUrl);

  // When a field is clicked → find matching chunk → highlight + jump page
  const handleFieldClick = useCallback((fieldName: string, src: string, evid: string) => {
    setActiveField(fieldName);

    // If parsed data not loaded yet, still show the field as active
    if (!chunks.length) {
      toast(`📍 Locating "${fieldName}" in document…`, { duration: 2000 });
      return;
    }

    let bestChunk: typeof chunks[0] | null = null;
    const evidLower = evid.toLowerCase();

    // Strategy 1: match by evidence text (from heuristic extractor)
    if (evidLower.length > 5 && !evidLower.startsWith("landingai") && !evidLower.startsWith("ai (")) {
      const keys = [evidLower.slice(0, 120), evidLower.slice(0, 60), evidLower.slice(0, 30)].filter(k => k.trim().length > 5);
      outer1: for (const key of keys) {
        for (const chunk of chunks) {
          const plain = chunk.markdown.replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, " ").toLowerCase();
          if (plain.includes(key.trim())) { bestChunk = chunk; break outer1; }
        }
      }
    }

    // Strategy 2: search for the field value itself in chunks
    if (!bestChunk) {
      // Get the actual extracted value — check both single result and multi-record
      const fieldVal = (() => {
        const r = singleResult;
        const rec = records?.[0]?.result;
        const v = r?.[fieldName] ?? rec?.[fieldName];
        return v != null ? String(v).toLowerCase().trim() : "";
      })();

      if (fieldVal.length > 2) {
        for (const chunk of chunks) {
          const plain = chunk.markdown.replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, " ").toLowerCase();
          if (plain.includes(fieldVal)) { bestChunk = chunk; break; }
        }
        if (!bestChunk && fieldVal.length > 5) {
          const partial = fieldVal.slice(0, 20);
          for (const chunk of chunks) {
            const plain = chunk.markdown.replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, " ").toLowerCase();
            if (plain.includes(partial)) { bestChunk = chunk; break; }
          }
        }
      }
    }

    // Strategy 3: fallback by source type — prefer chunks WITH a bounding box
    if (!bestChunk) {
      const typed = src === "table"
        ? chunks.filter(c => c.type === "table")
        : chunks.filter(c => c.type === "text" || c.type === "title");
      bestChunk = typed.find(c => c.grounding?.box) ?? typed[0] ?? chunks.find(c => c.grounding?.box) ?? chunks[0] ?? null;
    }

    if (bestChunk) {
      const page = chunkPageMap[bestChunk.id] ?? 1;
      setPdfPage(page);
      if (bestChunk.grounding?.box) {
        const box = bestChunk.grounding.box;
        setHighlights([{
          left: box.left,
          top: box.top,
          right: box.right,
          bottom: box.bottom,
          label: `Source of "${fieldName}"`,
          color: bestChunk.type === "table" ? "green" : "yellow",
        }]);
        toast.success(`📍 Highlighted "${fieldName}" on page ${page}`, { duration: 2000 });
      } else {
        // No bounding box — highlight a wide band at the estimated vertical position
        // Use chunk index to estimate vertical position on the page
        const chunkIdx = chunks.indexOf(bestChunk);
        const chunksOnPage = chunks.filter(c => (chunkPageMap[c.id] ?? 1) === (chunkPageMap[bestChunk!.id] ?? 1));
        const posInPage = chunksOnPage.indexOf(bestChunk);
        const totalOnPage = Math.max(chunksOnPage.length, 1);
        const estimatedTop = posInPage / totalOnPage;
        const estimatedBottom = (posInPage + 1) / totalOnPage;
        setHighlights([{
          left: 0.02,
          top: Math.max(0, estimatedTop - 0.02),
          right: 0.98,
          bottom: Math.min(1, estimatedBottom + 0.02),
          label: `Source of "${fieldName}" (estimated)`,
          color: bestChunk.type === "table" ? "green" : "yellow",
        }]);
        toast(`📍 Navigated to page ${page} for "${fieldName}"`, { duration: 2000 });
      }
    } else {
      toast(`Could not locate "${fieldName}" in document`, { duration: 2000 });
    }
  }, [chunks, chunkPageMap, singleResult, records]);

  const handleExport = async (type: "excel" | "csv" | "json") => {
    try {
      if (isBatch && batchId) {
        const res = await api.get(`/batch/${batchId}/${type === "json" ? "excel" : type}`, { responseType: "blob" });
        downloadBlob(res.data, `batch_${batchId.slice(0, 8)}.${type === "excel" ? "xlsx" : "csv"}`);
      } else {
        const res = await api.get(`/export/${jobId}/${type}`, { responseType: "blob" });
        downloadBlob(res.data, `result_${jobId.slice(0, 8)}.${type === "excel" ? "xlsx" : type}`);
      }
    } catch { toast.error("Export failed"); }
  };

  const quality = (result as { quality?: { score?: number; breakdown?: { coverage?: number; avg_confidence?: number }; missing_critical?: string[]; suggestions?: string[] } })?.quality;
  const records = (result as { records?: unknown[] })?.records as Array<{ result: Record<string, unknown>; confidence: Record<string, number>; schema_fields?: string[] }> | undefined;
  const singleResult = (result as { result?: Record<string, unknown> })?.result;
  const confidence = (result as { confidence?: Record<string, number> })?.confidence ?? {};
  const schemaFields = (result as { schema_fields?: string[] })?.schema_fields ?? [];
  const failureLog = (result as { failure_log?: Array<{ type: string; reason?: string }> })?.failure_log ?? [];

  // Header bar (shared for both single and batch)
  const headerBar = (
    <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-3 shrink-0"
      style={{ backgroundColor: "#060b14", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
          <CheckCircle2 className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-black text-white">{isBatch ? "Batch Complete" : "Extraction Complete"}</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            {schemaName} · {provider.provider}{quality?.score !== undefined ? ` · Score: ${quality.score}/100` : ""}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => handleExport("excel")} className="flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-black text-white" style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}><Download className="h-3.5 w-3.5" />Excel</button>
        <button onClick={() => handleExport("csv")} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>CSV</button>
        {!isBatch && <button onClick={() => handleExport("json")} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>JSON</button>}
        <button onClick={onRestart} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}><RotateCcw className="h-3.5 w-3.5" /> New</button>
      </div>
    </div>
  );

  if (isBatch) {
    return (
      <div className="space-y-4">
        {headerBar}
        <BatchResultsView batchId={batchId!} schemaName={schemaName} />
      </div>
    );
  }

  // ── Single extraction: split-pane layout ──────────────────────────────────
  return (
    <div className="fixed inset-0 z-[50] flex flex-col" style={{ backgroundColor: "#060b18" }}>
      {headerBar}

      <div className="flex flex-1 overflow-hidden">
        {/* Left: PDF viewer with highlight */}
        <div className="flex flex-col w-1/2 border-r overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          {/* Active field indicator */}
          {activeField && (
            <div className="flex items-center gap-2 px-4 py-1.5 shrink-0" style={{ backgroundColor: "rgba(37,99,235,0.12)", borderBottom: "1px solid rgba(37,99,235,0.25)" }}>
              <MapPin className="h-3 w-3" style={{ color: "#60a5fa" }} />
              <span className="text-xs font-bold" style={{ color: "#93c5fd" }}>
                Source of "{activeField}"
                {highlights.length > 0 ? <span className="ml-2 text-yellow-400">● highlighted</span> : <span className="ml-2 opacity-50">— no bounding box</span>}
              </span>
              <button onClick={() => { setActiveField(null); setHighlights([]); }} className="ml-auto text-xs hover:text-white" style={{ color: "rgba(255,255,255,0.3)" }}>✕</button>
            </div>
          )}
          {isPdf && fileUrl ? (
            <PdfErrorBoundary>
              <PdfViewer
                fileUrl={fileUrl}
                pageNumber={pdfPage}
                totalPages={pageCount}
                onPageChange={setPdfPage}
                highlights={highlights}
              />
            </PdfErrorBoundary>
          ) : fileUrl ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
              <FileText className="h-16 w-16 opacity-20" style={{ color: "#60a5fa" }} />
              <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>Non-PDF document — preview not available</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#3b82f6" }} />
              <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>Loading document…</p>
            </div>
          )}
        </div>

        {/* Right: Extracted results */}
        <div className="flex flex-col w-1/2 overflow-hidden">
          {/* Hint banner */}
          <div className="flex items-center gap-2 px-4 py-2 shrink-0" style={{ backgroundColor: "rgba(37,99,235,0.06)", borderBottom: "1px solid rgba(37,99,235,0.15)" }}>
            <MapPin className="h-3 w-3 shrink-0" style={{ color: "#60a5fa" }} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Click any field value to highlight its source in the PDF</span>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <ResultView
              result={singleResult}
              confidence={confidence}
              sources={sources}
              evidence={evidence}
              documentId={documentId}
              records={records}
              schemaFields={schemaFields}
              score={quality?.score ?? 0}
              failureLog={failureLog}
              duration={(result as { duration_seconds?: number }).duration_seconds}
              provider={provider.provider}
              schemaName={schemaName}
              jobId={jobId}
              coverage={quality?.breakdown?.coverage ? Math.round((quality.breakdown.coverage / 40) * 100) : undefined}
              avgConfidence={quality?.breakdown?.avg_confidence ? Math.round((quality.breakdown.avg_confidence / 35) * 100) : undefined}
              missingFields={quality?.missing_critical ?? []}
              suggestions={quality?.suggestions ?? []}
              onFieldClick={handleFieldClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

//  Error state 
function ErrorState({ message, onRetry, onBack }: { message: string; onRetry: () => void; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
        <AlertCircle className="h-9 w-9" style={{ color: "#ef4444" }} />
      </div>
      <div>
        <h2 className="text-xl font-black text-white mb-2">Extraction Failed</h2>
        <p className="text-sm max-w-md" style={{ color: "rgba(255,255,255,0.4)" }}>{message}</p>
      </div>
      <div className="flex gap-3">
        <button onClick={onBack} className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}><ChevronLeft className="h-4 w-4" /> Change Engine</button>
        <button onClick={onRetry} className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white transition-all hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}><RotateCcw className="h-4 w-4" /> Retry</button>
      </div>
    </div>
  );
}

//  Main Wizard 
function ExtractionWizard() {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<UploadMode>("single");
  const [singleDocId, setSingleDocId] = useState("");
  const [batchDocIds, setBatchDocIds] = useState<string[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [schemaId, setSchemaId] = useState("");

  // Keep batchDocIds in sync with all parsed docs at the wizard level
  const { data: allDocsData } = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.get("/documents").then(r => r.data.documents ?? []),
    refetchInterval: 3000,
  });
  const allParsedDocs = (allDocsData ?? []).filter((d: { status: string }) => d.status === "parsed");

  useEffect(() => {
    const parsedIds = allParsedDocs.map((d: { id: string }) => d.id);
    if (mode === "batch" && parsedIds.length > 0) {
      setBatchDocIds(parsedIds);
    }
    // Single mode: user must manually click to select — no auto-selection
    if (mode === "single") {
      setSingleDocId(""); // clear on mode switch so user picks fresh
    }
  }, [mode]);
  const [provider, setProvider] = useState<ProviderValues>({ provider: "landingai", api_key: storedKey("landingai"), model: "dpt-2-latest", base_url: "" });
  const [multiRecord, setMultiRecord] = useState(false);
  const [visionParse, setVisionParse] = useState(false);
  const [smartRetry, setSmartRetry] = useState(false);
  const [retryThreshold, setRetryThreshold] = useState(0.5);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [jobId, setJobId] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [runKey, setRunKey] = useState(0);

  const restart = () => { setStep(1); setMode("single"); setSingleDocId(""); setBatchDocIds([]); setZipFile(null); setSchemaId(""); setResult(null); setJobId(""); setErrorMsg(null); };
  const handleDone = (res: Record<string, unknown>, jid: string) => {
    setResult(res); setJobId(jid); setStep(5);
    const isBatch = mode !== "single";
    const quality = (res as { quality?: { score?: number } })?.quality;
    const score = quality?.score;
    pushNotification(
      "success",
      isBatch ? "Batch Extraction Complete" : "Extraction Complete",
      isBatch
        ? `All documents processed. Download Excel to see results.`
        : score !== undefined ? `Quality score: ${score}/100 · ${score >= 75 ? "Grade A/B — ready to use" : "Review recommended"}` : "Results ready"
    );
  };
  const handleError = (msg: string) => {
    setErrorMsg(msg);
    toast.error(msg);
    pushNotification("error", "Extraction Failed", msg.slice(0, 100));
  };

  return (
    <AppShell title="Extraction" subtitle="Upload documents, choose a schema and AI engine, then extract structured data." sectionLabel="EXTRACTION PIPELINE">
      <div className="max-w-3xl mx-auto">
        <StepBar current={step} />
        <div className="rounded-2xl p-6" style={CARD}>
          {step === 1 && <Step1Upload mode={mode} setMode={setMode} singleDocId={singleDocId} setSingleDocId={setSingleDocId} batchDocIds={batchDocIds} setBatchDocIds={setBatchDocIds} zipFile={zipFile} setZipFile={setZipFile} onNext={() => setStep(2)} />}
          {step === 2 && <Step2Schema schemaId={schemaId} setSchemaId={setSchemaId} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && <Step3Engine provider={provider} setProvider={setProvider} multiRecord={multiRecord} setMultiRecord={setMultiRecord} visionParse={visionParse} setVisionParse={setVisionParse} smartRetry={smartRetry} setSmartRetry={setSmartRetry} retryThreshold={retryThreshold} setRetryThreshold={setRetryThreshold} onNext={() => { setErrorMsg(null); setStep(4); }} onBack={() => setStep(2)} />}
          {step === 4 && !errorMsg && <Step4Running key={runKey} mode={mode} singleDocId={singleDocId} batchDocIds={batchDocIds} zipFile={zipFile} schemaId={schemaId} provider={provider} multiRecord={multiRecord} visionParse={visionParse} onDone={handleDone} onError={handleError} />}
          {step === 4 && errorMsg && <ErrorState message={errorMsg} onRetry={() => { setErrorMsg(null); setRunKey(k => k + 1); }} onBack={() => { setErrorMsg(null); setStep(3); }} />}
          {step === 5 && result && <Step5Results result={result} jobId={jobId} mode={mode} schemaId={schemaId} provider={provider} singleDocId={singleDocId} onRestart={restart} />}
        </div>
      </div>
    </AppShell>
  );
}
