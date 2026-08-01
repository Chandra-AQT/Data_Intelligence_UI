import { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot, Paperclip, Send, Settings, Trash2, X,
  Copy, Check, Loader2, File, AlertCircle, RefreshCw
} from "lucide-react";
import { API_BASE_URL, storedKey, saveStoredKey } from "@/lib/aqt";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Attachment {
  type: "image" | "document";
  name: string;
  mime_type: string;
  data: string;
  preview?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
  attachments?: Attachment[];
  timestamp: Date;
}

// ── Providers ─────────────────────────────────────────────────────────────────
const PROVIDERS = [
  { key: "openai", label: "OpenAI GPT-4o", model: "gpt-4o", hint: "sk-..." },
  { key: "anthropic", label: "Anthropic Claude", model: "claude-3-5-haiku-20241022", hint: "sk-ant-..." },
  { key: "gemini", label: "Google Gemini", model: "gemini-1.5-flash", hint: "AIza..." },
  { key: "groq", label: "Groq (Fast)", model: "llama-3.1-8b-instant", hint: "gsk_..." },
  { key: "perplexity", label: "Perplexity AI", model: "llama-3.1-sonar-large-128k-online", hint: "pplx-..." },
  { key: "emergence", label: "Emergence AI", model: "em-llm-001", hint: "em-..." },
];

// ── Platform knowledge base ───────────────────────────────────────────────────
const KB: Array<{ kw: string[]; ans: string }> = [
  {
    kw: ["what is", "about", "platform", "aqt", "overview", "Metadata Extractor"],
    ans: `## AQT Data Intelligence — Metadata Extractor\n\nAn AI-powered document extraction platform that reads industrial equipment spec sheets and converts them into clean, structured spreadsheet data automatically.\n\n**How it works:**\n1. Upload a PDF/image/Word/Excel file\n2. Define a schema (what fields to extract)\n3. Choose an AI engine\n4. Get structured data with confidence scores\n5. Export to Excel/CSV\n\n**Key benefit:** What takes a team 3 days now takes one person 30 minutes.`
  },
  {
    kw: ["navigation", "pages", "menu", "sidebar", "where", "find", "navigate"],
    ans: `## Platform Navigation\n\n| Page | What it does |\n|------|-------------|\n| 🏠 **Dashboard** | Overview, stats, recent activity |\n| ⚡ **Extraction** | Run AI extraction (single, batch, ZIP) |\n| 🗄️ **Results** | Browse all past extraction results |\n| 💼 **Jobs** | Monitor all extraction jobs |\n| 📋 **Schemas** | Create & manage field schemas |\n| 📁 **Files** | Upload & manage documents |\n| 🔬 **Compare** | Compare multiple AI engines |\n| 🧠 **AI Tools** | Auto-schema, quality scoring, smart retry |\n| ⚙️ **Settings** | Profile, password, API keys |\n\n**Tip:** Use the floating circle button on the right edge for quick navigation.`
  },
  {
    kw: ["extract", "extraction", "how to extract", "run extraction", "single"],
    ans: `## How to Extract Data\n\nThe Extraction page uses a **5-step wizard:**\n\n**Step 1 — Upload:** Choose Single File, Batch Upload, or ZIP Folder.\n\n**Step 2 — Schema:** Pick which schema defines the fields to extract.\n\n**Step 3 — Engine:** Choose your AI provider and enter your API key.\n\n**Step 4 — Extract:** Watch live progress with animated spinner.\n\n**Step 5 — Results:** View all extracted fields with confidence scores. Download Excel/CSV/JSON.\n\n> **Multi-record mode** — Extracts all model variants from one PDF simultaneously.`
  },
  {
    kw: ["batch", "multiple", "bulk", "zip", "zip file", "many pdfs"],
    ans: `## Batch & ZIP Extraction\n\n**Batch Upload:** Select multiple parsed documents → choose schema + engine → Run Batch → download one combined Excel.\n\n**ZIP Upload:** Upload a ZIP containing PDFs → system extracts all automatically → one combined Excel output.\n\n**Output:** One row per model, all field names as column headers, plus \`source_file\` column showing which PDF each model came from.\n\nAccess via: **Extraction page → "Batch (Multiple Docs)" tab**`
  },
  {
    kw: ["schema", "schemas", "fields", "field", "create schema", "what is a schema"],
    ans: `## Schemas\n\nSchemas define **what data to extract** from documents.\n\n**Field types:** string, number, integer, boolean, date, currency, email, phone, url, list, object\n\n**Creating a schema:**\n- Go to Schemas → New Schema → add fields with name, type, description\n- Mark critical fields as "required"\n\n**Auto-generate:** AI Tools → Auto Schema Generator → GPT-4o analyzes your document and builds the schema automatically.\n\n**Upload JSON:** Import any existing JSON schema file — the system adapts it automatically.`
  },
  {
    kw: ["quality", "score", "grade", "accuracy", "confidence", "a grade", "b grade"],
    ans: `## Quality Scoring\n\nEvery extraction gets an automatic **A–F grade:**\n\n| Grade | Score | Meaning |\n|-------|-------|---------|\n| **A** | 90-100 | Excellent — ready to use |\n| **B** | 75-89 | Good — minor gaps |\n| **C** | 60-74 | Fair — review recommended |\n| **D** | 45-59 | Poor — many missing fields |\n| **F** | 0-44 | Failed — unusable |\n\n**Score breakdown:** Coverage (40pts) + Avg Confidence (35pts) + Source Quality (15pts)\n\n**Confidence:** 🟢 ≥80% · 🟡 50-79% · 🔴 <50%`
  },
  {
    kw: ["smart retry", "retry", "improve", "low confidence", "re-extract"],
    ans: `## Smart Retry\n\nRe-extracts only the **low-confidence fields** using targeted AI prompts.\n\n1. Go to AI Tools → Smart Retry\n2. Select a completed job\n3. Choose an AI engine\n4. Set confidence threshold (e.g. 0.5 = retry fields below 50%)\n5. Click "Run Smart Retry"\n\n**Result:** Shows before/after comparison with old vs new values and confidence scores.`
  },
  {
    kw: ["compare", "engine comparison", "which engine", "best engine"],
    ans: `## Engine Comparison\n\nRun the same document through **multiple AI engines simultaneously.**\n\n1. Go to Engine Comparison page\n2. Select document + schema\n3. Click "Compare Engines"\n4. See field-by-field matrix: 🟢 All agree · 🟡 Differ · 🔴 Missing\n\n**Best engines:**\n- Industrial PDFs → **Landing AI ADE**\n- General documents → **OpenAI GPT-4o**\n- Cost-sensitive → **Groq**\n- Privacy-sensitive → **Ollama** (local)`
  },
  {
    kw: ["null", "missing", "empty", "why null", "field not extracted"],
    ans: `## Why Are Fields Null?\n\n**Common reasons:**\n1. Field not in document — the PDF simply doesn't contain that data\n2. Low confidence — AI found something but wasn't sure enough\n3. Wrong field description — schema description doesn't match document terminology\n4. Image-based table — data is in a scanned image OCR couldn't read\n5. Wrong engine — some engines are better at specific document types\n\n**How to fix:**\n- Add better descriptions to schema fields\n- Enable **Smart Retry** to re-extract low-confidence fields\n- Try **Landing AI ADE** for industrial equipment PDFs\n- Use **Compare Engines** to find which engine works best`
  },
  {
    kw: ["api key", "key", "where to add", "how to add key", "settings", "openai key"],
    ans: `## API Keys\n\nKeys are stored **locally in your browser only** — never sent to our servers (BYOK).\n\n**Where to add:** Click ⚙ gear icon in this chatbot → enter key → "Apply & Start Chatting"\n\n**Where to get keys:**\n| Provider | URL |\n|----------|-----|\n| OpenAI | platform.openai.com/api-keys |\n| Anthropic | console.anthropic.com/settings/keys |\n| Google Gemini | aistudio.google.com/app/apikey |\n| Groq | console.groq.com/keys |\n| Perplexity | perplexity.ai/settings/api |`
  },
  {
    kw: ["export", "download", "excel", "csv", "json"],
    ans: `## Export Options\n\n**Single extraction:** Excel (.xlsx), CSV (.csv), JSON (.json)\n\n**Batch extraction:** Combined Excel or CSV — one row per model, all fields as columns.\n\n**Excel format:**\n- Sheet 1: Results (all fields, color-coded rows)\n- Sheet 2: Confidence scores (green/yellow/red per field)\n\n> Each model variant gets its own row — not a JSON blob in one cell.`
  },
  {
    kw: ["getting started", "first time", "new user", "begin", "workflow", "how to start"],
    ans: `## Getting Started — 5 Steps\n\n1. **Upload** → Files page → drag & drop your PDF → wait for "Parsed" status\n2. **Schema** → Schemas → New Schema → add fields (or use Auto-Generate)\n3. **Extract** → Extraction → select document + schema + engine → Run\n4. **Review** → Check quality grade → review confidence scores\n5. **Export** → Click Excel or CSV → download clean structured data\n\n> **Tip:** For best accuracy on industrial equipment PDFs, use **Landing AI ADE**.`
  },
  {
    kw: ["chatbot", "ai assistant", "what can you do", "help", "capabilities"],
    ans: `## I'm the AQT AI Assistant!\n\n**No API key needed for:**\n- How to use any feature or page\n- What buttons do\n- Navigation help\n- Troubleshooting extraction issues\n\n**With an API key, I can also:**\n- Analyze your extraction results\n- Help build schemas for specific equipment\n- Explain why specific fields are null\n- Answer any general questions\n\n**To add an API key:** Click the ⚙ gear icon above.`
  },
];

function getLocalAnswer(q: string): string | null {
  const lower = q.toLowerCase();
  let best = 0, answer = "";
  for (const entry of KB) {
    const score = entry.kw.filter(k => lower.includes(k)).length;
    if (score > best) { best = score; answer = entry.ans; }
  }
  return best >= 1 ? answer : null;
}

// ── Markdown message renderer ─────────────────────────────────────────────────
function MarkdownMessage({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const copyAll = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative">
      <div className="prose prose-invert prose-sm max-w-none"
        style={{
          color: "#e2e8f0",
          lineHeight: "1.7",
        }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="text-lg font-black text-white mt-4 mb-2 first:mt-0">{children}</h1>,
            h2: ({ children }) => <h2 className="text-base font-black text-white mt-3 mb-2 first:mt-0">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-bold text-white/90 mt-2 mb-1">{children}</h3>,
            p: ({ children }) => <p className="mb-2 last:mb-0 text-sm leading-relaxed" style={{ color: "#cbd5e1" }}>{children}</p>,
            ul: ({ children }) => <ul className="mb-2 space-y-1 pl-4">{children}</ul>,
            ol: ({ children }) => <ol className="mb-2 space-y-1 pl-4 list-decimal">{children}</ol>,
            li: ({ children }) => <li className="text-sm" style={{ color: "#cbd5e1" }}>{children}</li>,
            strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
            em: ({ children }) => <em className="italic" style={{ color: "#94a3b8" }}>{children}</em>,
            code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) =>
              inline ? (
                <code className="rounded px-1.5 py-0.5 text-xs font-mono"
                  style={{ backgroundColor: "rgba(37,99,235,0.2)", color: "#93c5fd" }}>
                  {children}
                </code>
              ) : (
                <CodeBlock>{String(children)}</CodeBlock>
              ),
            pre: ({ children }) => <>{children}</>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 pl-3 my-2 italic text-sm"
                style={{ borderColor: "#3b82f6", color: "#94a3b8" }}>
                {children}
              </blockquote>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-3 rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                <table className="w-full text-xs">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead style={{ backgroundColor: "rgba(37,99,235,0.15)" }}>{children}</thead>,
            th: ({ children }) => <th className="px-3 py-2 text-left font-bold text-white">{children}</th>,
            td: ({ children }) => <td className="px-3 py-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", color: "#cbd5e1" }}>{children}</td>,
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer"
                className="underline hover:no-underline" style={{ color: "#60a5fa" }}>
                {children}
              </a>
            ),
            hr: () => <hr className="my-3" style={{ borderColor: "rgba(255,255,255,0.1)" }} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
      {/* Copy button */}
      <button onClick={copyAll}
        className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all"
        style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
        title="Copy">
        {copied ? <Check className="h-3.5 w-3.5" style={{ color: "#22c55e" }} /> : <Copy className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.5)" }} />}
      </button>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  const code = children.replace(/\n$/, "");

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-xl overflow-hidden" style={{ backgroundColor: "#0d1117", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>code</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-[10px] font-bold transition-colors"
          style={{ color: copied ? "#22c55e" : "rgba(255,255,255,0.4)" }}>
          {copied ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs font-mono leading-relaxed" style={{ color: "#e2e8f0" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ── Settings panel ────────────────────────────────────────────────────────────
function SettingsPanel({ provider: ip, apiKey: ik, model: im, onApply, onClose }: {
  provider: string; apiKey: string; model: string;
  onApply: (p: string, k: string, m: string) => void;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState(ip);
  const [apiKey, setApiKey] = useState(ik || storedKey(ip));
  const [model, setModel] = useState(im);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const prov = PROVIDERS.find(p => p.key === provider)!;

  const switchProvider = (p: string) => {
    setProvider(p);
    setApiKey(storedKey(p));
    setModel(PROVIDERS.find(x => x.key === p)?.model ?? "");
    setStatus("idle"); setErrMsg("");
  };

  const apply = async () => {
    if (!apiKey.trim()) { setStatus("error"); setErrMsg("API key is required"); return; }
    setTesting(true); setStatus("idle"); setErrMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("aqt_access_token") ?? ""}` },
        body: JSON.stringify({ message: "Say hi", api_key: apiKey.trim(), model: model || prov.model, provider, attachments: [], history: [], job_id: null, document_id: null, schema_id: null }),
      });
      if (!res.ok) { const b = await res.text().catch(() => ""); throw new Error(b || `HTTP ${res.status}`); }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let got = false;
      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6);
          if (d === "[DONE]") break outer;
          try {
            const p = JSON.parse(d);
            if (p.error) throw new Error(p.error);
            if (p.content) { got = true; break outer; }
          } catch (e) { if (e instanceof Error && e.message !== "Unexpected end of JSON input") throw e; }
        }
      }
      reader.cancel().catch(() => { });
      if (!got) throw new Error("No response — verify your API key");
      setStatus("ok");
      setTimeout(() => onApply(provider, apiKey.trim(), model || prov.model), 600);
    } catch (err) {
      const m = err instanceof Error ? err.message : "Failed";
      setStatus("error");
      setErrMsg(m.includes("401") || m.includes("Unauthorized") || m.includes("invalid") ? "Invalid API key — check and retry"
        : m.includes("429") ? "Rate limit — wait a moment"
          : m.includes("No response") ? "No response — verify your key"
            : m.slice(0, 90));
    } finally { setTesting(false); }
  };

  const I = { backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc" } as const;

  return (
    <div className="px-4 py-4 space-y-3 shrink-0 overflow-y-auto" style={{ backgroundColor: "#080f1e", borderBottom: "1px solid rgba(255,255,255,0.1)", maxHeight: "300px" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest" style={{ color: "#22d3ee" }}>⚙ Configure AI Engine</p>
        <button onClick={onClose} className="text-xs hover:text-white transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>✕ Cancel</button>
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Provider</label>
        <select value={provider} onChange={e => switchProvider(e.target.value)} className="w-full h-9 rounded-lg px-3 text-sm" style={I}>
          {PROVIDERS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>API Key</label>
        <input type="password" value={apiKey} onChange={e => { setApiKey(e.target.value); setStatus("idle"); }}
          placeholder={prov.hint} className="w-full h-9 rounded-lg px-3 text-sm font-mono"
          style={{ ...I, border: status === "error" ? "1px solid rgba(239,68,68,0.5)" : status === "ok" ? "1px solid rgba(34,197,94,0.5)" : I.border }} />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Model</label>
        <input type="text" value={model} onChange={e => setModel(e.target.value)}
          placeholder={`Default: ${prov.model}`} className="w-full h-9 rounded-lg px-3 text-sm" style={I} />
      </div>
      {status === "error" && <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}><AlertCircle className="h-3.5 w-3.5 shrink-0" />{errMsg}</div>}
      {status === "ok" && <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold" style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}><Check className="h-3.5 w-3.5" />Connected! Starting chat...</div>}
      <button onClick={apply} disabled={testing || !apiKey.trim() || status === "ok"}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-black text-white transition-all disabled:opacity-50"
        style={{ background: status === "ok" ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
        {testing ? <><Loader2 className="h-4 w-4 animate-spin" />Testing...</> : status === "ok" ? <>✓ Connected</> : <>Apply & Start Chatting</>}
      </button>
    </div>
  );
}

// ── Main Chatbot ──────────────────────────────────────────────────────────────
export function Chatbot({ jobId, documentId, schemaId }: { jobId?: string; documentId?: string; schemaId?: string }) {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState(() => storedKey("openai"));
  const [model, setModel] = useState("gpt-4o");
  const [messages, setMessages] = useState<Message[]>([{
    id: "welcome",
    role: "assistant",
    content: "Hi! I'm your **AI Assistant** 👋\n\nI can answer **any question** — just like ChatGPT or Gemini!\n\n**Ask me anything:**\n- How does GPT-4 work?\n- Explain machine learning\n- Write me a Python script\n- How do I extract data from a PDF?\n- What is a schema?\n\nFor AI-powered answers, click ⚙ to add your API key.",
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);
  useEffect(() => { if (open) { setUnread(0); inputRef.current?.focus(); const k = storedKey(provider); if (k && k !== apiKey) setApiKey(k); } }, [open]);

  const addMsg = (msg: Omit<Message, "id" | "timestamp">) =>
    setMessages(prev => [...prev, { ...msg, id: Date.now().toString(), timestamp: new Date() }]);

  const uploadFile = async (file: File) => {
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE_URL}/chat/upload`, { method: "POST", body: fd, headers: { Authorization: `Bearer ${localStorage.getItem("aqt_access_token") ?? ""}` } });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();
      setPendingAttachments(prev => [...prev, { type: data.type, name: data.name, mime_type: data.mime_type, data: data.data, preview: data.type === "image" ? URL.createObjectURL(file) : undefined }]);
    } catch (e) { console.error(e); } finally { setUploadingFile(false); }
  };

  const send = async (text = input) => {
    const msg = text.trim();
    if (!msg && pendingAttachments.length === 0) return;
    const atts = [...pendingAttachments];
    setInput(""); setPendingAttachments([]);
    addMsg({ role: "user", content: msg || "(attached file)", attachments: atts });

    // Local knowledge — no API key needed
    if (msg && atts.length === 0) {
      const local = getLocalAnswer(msg);
      if (local) {
        setTimeout(() => { addMsg({ role: "assistant", content: local }); if (!open) setUnread(u => u + 1); }, 200);
        return;
      }
    }

    const key = apiKey || storedKey(provider);
    if (!key) {
      addMsg({ role: "assistant", content: "I can answer platform questions without an API key! Try:\n- \"What pages are available?\"\n- \"How do I extract data?\"\n- \"What is a schema?\"\n\nFor AI-powered answers to **any question**, click ⚙ to add your API key." });
      return;
    }

    setLoading(true); setStreaming("");
    try {
      const res = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("aqt_access_token") ?? ""}` },
        body: JSON.stringify({
          message: msg || "Please analyze the attached file.",
          api_key: key, model, provider,
          attachments: atts.map(({ preview: _p, ...r }) => r),
          history: messages.slice(-12).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
          job_id: jobId ?? null, document_id: documentId ?? null, schema_id: schemaId ?? null,
        }),
      });
      if (!res.ok) { const b = await res.text().catch(() => ""); throw new Error(b || `HTTP ${res.status}`); }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let full = "";
      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6);
          if (d === "[DONE]") break outer;
          try {
            const p = JSON.parse(d);
            if (p.error) throw new Error(p.error);
            if (p.content) { full += p.content; setStreaming(full); }
          } catch (e) { if (e instanceof Error && e.message !== "Unexpected end of JSON input") throw e; }
        }
      }
      if (!full) full = "No response received. Please check your API key.";
      addMsg({ role: "assistant", content: full });
      setStreaming(""); if (!open) setUnread(u => u + 1);
    } catch (err) {
      const m = err instanceof Error ? err.message : "Unknown error";
      addMsg({ role: "assistant", content: m.includes("401") || m.includes("Unauthorized") ? "**Invalid API key.** Click ⚙ to update your key." : m.includes("429") ? "**Rate limit reached.** Wait a moment and try again." : `**Error:** ${m}`, error: true });
      setStreaming("");
    } finally { setLoading(false); }
  };

  const SUGGESTIONS = ["What pages are available?", "How do I extract data?", "Why are fields null?", "How does batch extraction work?"];

  return (
    <>
      {/* Floating trigger */}
      <button onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-2xl transition-all duration-300 hover:scale-110"
        style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)", boxShadow: "0 0 24px rgba(37,99,235,0.45), 0 8px 24px rgba(0,0,0,0.4)" }}>
        {open ? <X className="h-6 w-6" /> : (
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8">
            {/* Robot head */}
            <rect x="8" y="10" width="20" height="16" rx="4" fill="white" fillOpacity="0.95" />
            {/* Eyes */}
            <circle cx="13.5" cy="17" r="2.5" fill="#2563eb" />
            <circle cx="22.5" cy="17" r="2.5" fill="#2563eb" />
            {/* Eye shine */}
            <circle cx="14.3" cy="16.2" r="0.8" fill="white" />
            <circle cx="23.3" cy="16.2" r="0.8" fill="white" />
            {/* Mouth */}
            <rect x="13" y="21" width="10" height="2" rx="1" fill="#2563eb" fillOpacity="0.7" />
            {/* Antenna */}
            <line x1="18" y1="10" x2="18" y2="6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="18" cy="5" r="1.5" fill="white" />
            {/* Ears */}
            <rect x="5" y="14" width="3" height="5" rx="1.5" fill="white" fillOpacity="0.8" />
            <rect x="28" y="14" width="3" height="5" rx="1.5" fill="white" fillOpacity="0.8" />
          </svg>
        )}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white" style={{ backgroundColor: "#ef4444" }}>{unread}</span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className={`fixed bottom-24 right-5 z-50 flex flex-col rounded-2xl overflow-hidden transition-all ${isDragging ? "ring-2 ring-blue-500" : ""}`}
          style={{
            width: "min(440px, calc(100vw - 2rem))",
            height: "min(620px, calc(100vh - 8rem))",
            backgroundColor: "#0d1526",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
          }}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); Array.from(e.dataTransfer.files).forEach(uploadFile); }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ backgroundColor: "#060b14", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                  <rect x="8" y="10" width="20" height="16" rx="4" fill="white" fillOpacity="0.95" />
                  <circle cx="13.5" cy="17" r="2.5" fill="#2563eb" />
                  <circle cx="22.5" cy="17" r="2.5" fill="#2563eb" />
                  <circle cx="14.3" cy="16.2" r="0.8" fill="white" />
                  <circle cx="23.3" cy="16.2" r="0.8" fill="white" />
                  <rect x="13" y="21" width="10" height="2" rx="1" fill="#2563eb" fillOpacity="0.7" />
                  <line x1="18" y1="10" x2="18" y2="6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="18" cy="5" r="1.5" fill="white" />
                  <rect x="5" y="14" width="3" height="5" rx="1.5" fill="white" fillOpacity="0.8" />
                  <rect x="28" y="14" width="3" height="5" rx="1.5" fill="white" fillOpacity="0.8" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-black text-white">AI Assistant</p>
                <p className="text-[10px]" style={{ color: apiKey ? "#22c55e" : "rgba(255,255,255,0.35)" }}>
                  {apiKey ? `● ${PROVIDERS.find(p => p.key === provider)?.label ?? provider}` : "Platform guide mode"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowSettings(s => !s)} className="p-2 rounded-xl hover:bg-white/10 transition-colors" title="Settings">
                <Settings className="h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />
              </button>
              <button onClick={() => setMessages([{ id: "w", role: "assistant", content: "Chat cleared. How can I help?", timestamp: new Date() }])} className="p-2 rounded-xl hover:bg-white/10 transition-colors" title="Clear chat">
                <Trash2 className="h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />
              </button>
              <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                <X className="h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />
              </button>
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <SettingsPanel provider={provider} apiKey={apiKey} model={model}
              onApply={(p, k, m) => { setProvider(p); setApiKey(k); setModel(m); saveStoredKey(p, k); setShowSettings(false); }}
              onClose={() => setShowSettings(false)} />
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5" style={{ backgroundColor: "#0d1526" }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full`}
                  style={{ background: msg.role === "user" ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "rgba(255,255,255,0.08)" }}>
                  {msg.role === "user"
                    ? <span className="text-xs font-black text-white">U</span>
                    : (
                      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                        <rect x="8" y="10" width="20" height="16" rx="4" fill="#60a5fa" />
                        <circle cx="13.5" cy="17" r="2" fill="white" />
                        <circle cx="22.5" cy="17" r="2" fill="white" />
                        <rect x="13" y="21" width="10" height="1.5" rx="0.75" fill="white" fillOpacity="0.7" />
                        <line x1="18" y1="10" x2="18" y2="7" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="18" cy="6" r="1.2" fill="#60a5fa" />
                        <rect x="5.5" y="14" width="2.5" height="4" rx="1.25" fill="#60a5fa" />
                        <rect x="28" y="14" width="2.5" height="4" rx="1.25" fill="#60a5fa" />
                      </svg>
                    )
                  }
                </div>
                {/* Bubble */}
                <div className={`max-w-[82%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {msg.attachments.map((att, i) => (
                        <div key={i} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                          {att.type === "image" && att.preview
                            ? <img src={att.preview} alt={att.name} className="h-24 w-24 object-cover" />
                            : <div className="flex items-center gap-2 px-3 py-2"><File className="h-4 w-4" style={{ color: "#60a5fa" }} /><span className="text-xs font-medium text-white truncate max-w-[100px]">{att.name}</span></div>
                          }
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Content */}
                  {msg.content && (
                    <div className={`rounded-2xl px-4 py-3 ${msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                      style={{
                        background: msg.role === "user" ? "linear-gradient(135deg,#2563eb,#7c3aed)" : msg.error ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.06)",
                        border: msg.error ? "1px solid rgba(239,68,68,0.2)" : "none",
                      }}>
                      {msg.role === "user"
                        ? <p className="text-sm text-white leading-relaxed">{msg.content}</p>
                        : <MarkdownMessage content={msg.content} />
                      }
                    </div>
                  )}
                  {/* Timestamp */}
                  <span className="text-[10px] px-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}

            {/* Streaming */}
            {streaming && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                  <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-pulse">
                    <rect x="8" y="10" width="20" height="16" rx="4" fill="#60a5fa" />
                    <circle cx="13.5" cy="17" r="2" fill="white" />
                    <circle cx="22.5" cy="17" r="2" fill="white" />
                    <rect x="13" y="21" width="10" height="1.5" rx="0.75" fill="white" fillOpacity="0.7" />
                    <line x1="18" y1="10" x2="18" y2="7" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="18" cy="6" r="1.2" fill="#60a5fa" />
                    <rect x="5.5" y="14" width="2.5" height="4" rx="1.25" fill="#60a5fa" />
                    <rect x="28" y="14" width="2.5" height="4" rx="1.25" fill="#60a5fa" />
                  </svg>
                </div>
                <div className="max-w-[82%] rounded-2xl rounded-tl-sm px-4 py-3" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                  <MarkdownMessage content={streaming} />
                  <span className="inline-block h-4 w-0.5 ml-0.5 animate-pulse rounded-sm" style={{ backgroundColor: "#3b82f6" }} />
                </div>
              </div>
            )}

            {/* Loading dots */}
            {loading && !streaming && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                  <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                    <rect x="8" y="10" width="20" height="16" rx="4" fill="#60a5fa" />
                    <circle cx="13.5" cy="17" r="2" fill="white" />
                    <circle cx="22.5" cy="17" r="2" fill="white" />
                    <rect x="13" y="21" width="10" height="1.5" rx="0.75" fill="white" fillOpacity="0.7" />
                    <line x1="18" y1="10" x2="18" y2="7" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="18" cy="6" r="1.2" fill="#60a5fa" />
                    <rect x="5.5" y="14" width="2.5" height="4" rx="1.25" fill="#60a5fa" />
                    <rect x="28" y="14" width="2.5" height="4" rx="1.25" fill="#60a5fa" />
                  </svg>
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                  <div className="flex gap-1.5 items-center h-5">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="h-2 w-2 rounded-full animate-bounce" style={{ backgroundColor: "#3b82f6", animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Suggestions */}
            {messages.length === 1 && !loading && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-all hover:-translate-y-0.5 hover:bg-white/[0.08]"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Pending attachments */}
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 py-2 shrink-0" style={{ backgroundColor: "#080f1e", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              {pendingAttachments.map((att, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.06)" }}>
                  {att.type === "image" && att.preview
                    ? <img src={att.preview} alt={att.name} className="h-14 w-14 object-cover" />
                    : <div className="flex items-center gap-1.5 px-2 py-2"><File className="h-4 w-4 shrink-0" style={{ color: "#60a5fa" }} /><span className="text-xs font-medium text-white truncate max-w-[80px]">{att.name}</span></div>
                  }
                  <button onClick={() => { const a = pendingAttachments[i]; if (a.preview) URL.revokeObjectURL(a.preview); setPendingAttachments(p => p.filter((_, j) => j !== i)); }}
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-white text-[10px]" style={{ backgroundColor: "#ef4444" }}>×</button>
                </div>
              ))}
              {uploadingFile && <div className="flex h-14 w-14 items-center justify-center rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.1)" }}><Loader2 className="h-5 w-5 animate-spin" style={{ color: "#3b82f6" }} /></div>}
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 shrink-0" style={{ backgroundColor: "#060b14", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex gap-2 items-end rounded-2xl px-3 py-2" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-white/10 disabled:opacity-40"
                style={{ color: "rgba(255,255,255,0.4)" }} title="Attach file">
                {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </button>
              <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.txt,.md,.csv" className="hidden" onChange={e => { Array.from(e.target.files ?? []).forEach(uploadFile); e.target.value = ""; }} />
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={pendingAttachments.length > 0 ? "Ask about the attached file..." : "Ask anything..."}
                rows={1} className="flex-1 resize-none bg-transparent text-sm outline-none"
                style={{ color: "#f8fafc", minHeight: "32px", maxHeight: "120px" }} />
              <button onClick={() => send()} disabled={loading || (!input.trim() && pendingAttachments.length === 0)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white transition-all disabled:opacity-40 hover:scale-110"
                style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
              Enter to send · Shift+Enter for newline · 📎 Attach files
            </p>
          </div>
        </div>
      )}
    </>
  );
}

