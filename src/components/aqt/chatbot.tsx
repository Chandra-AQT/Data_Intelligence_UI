import { useEffect, useRef, useState } from "react";
import { Bot, File, Image, Loader2, Paperclip, Send, Settings, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, storedKey, saveStoredKey } from "@/lib/aqt";

interface Message {
  role: "user" | "bot";
  text: string;
  error?: boolean;
  attachments?: Attachment[];
}

interface Attachment {
  type: "image" | "document";
  name: string;
  mime_type: string;
  data: string;
  preview?: string; // object URL for images
}

const PROMPTS = [
  "Why are some fields null?",
  "How can I improve extraction accuracy?",
  "What does confidence score mean?",
  "Help me build a schema for HVAC equipment",
];

const PROVIDER_OPTIONS = [
  { key: "openai", label: "OpenAI / ChatGPT", defaultModel: "gpt-4o" },
  { key: "gemini", label: "Google Gemini", defaultModel: "gemini-1.5-flash" },
  { key: "anthropic", label: "Anthropic Claude", defaultModel: "claude-3-5-haiku-20241022" },
  { key: "groq", label: "Groq", defaultModel: "llama-3.1-8b-instant" },
  { key: "perplexity", label: "Perplexity AI", defaultModel: "llama-3.1-sonar-large-128k-online" },
  { key: "emergence", label: "Emergence AI", defaultModel: "em-llm-001" },
];

export function Chatbot({ jobId, documentId, schemaId }: { jobId?: string; documentId?: string; schemaId?: string }) {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState(() => storedKey("openai"));
  const [model, setModel] = useState("gpt-4o");
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Hi! I'm your AI assistant. I can help you understand extraction results, build schemas, and answer questions.\n\n**You can also attach images or documents** — just click the 📎 button or drag files here." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [unread, setUnread] = useState(0);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);
  useEffect(() => { if (open) setUnread(0); }, [open]);

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    setApiKey(storedKey(newProvider));
    const opt = PROVIDER_OPTIONS.find((p) => p.key === newProvider);
    if (opt) setModel(opt.defaultModel);
  };

  const currentProviderLabel = PROVIDER_OPTIONS.find((p) => p.key === provider)?.label ?? "AI";
  const currentProviderDefaultModel = PROVIDER_OPTIONS.find((p) => p.key === provider)?.defaultModel ?? "";

  // Upload file to backend
  const uploadFile = async (file: File) => {
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE_URL}/chat/upload`, {
        method: "POST",
        body: fd,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("aqt_access_token") ?? ""}`,
        },
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();

      const att: Attachment = {
        type: data.type,
        name: data.name,
        mime_type: data.mime_type,
        data: data.data,
        preview: data.type === "image" ? URL.createObjectURL(file) : undefined,
      };
      setPendingAttachments((prev) => [...prev, att]);
    } catch (err) {
      console.error("File upload error:", err);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  };

  const removeAttachment = (i: number) => {
    setPendingAttachments((prev) => {
      const att = prev[i];
      if (att.preview) URL.revokeObjectURL(att.preview);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  // Drag & drop into chat panel
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const send = async (text = input) => {
    const msg = text.trim();
    if (!msg && pendingAttachments.length === 0) return;
    if (!apiKey) { setShowSettings(true); return; }

    const attachmentsToSend = [...pendingAttachments];
    setInput("");
    setPendingAttachments([]);
    setMessages((prev) => [...prev, { role: "user", text: msg || "(attached file)", attachments: attachmentsToSend }]);
    setLoading(true);
    setStreaming("");

    try {
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("aqt_access_token") ?? ""}`,
        },
        body: JSON.stringify({
          message: msg || "Please analyze the attached file.",
          api_key: apiKey,
          model,
          provider,
          attachments: attachmentsToSend.map(({ preview: _p, ...rest }) => rest),
          history: messages.slice(-10).map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text })),
          job_id: jobId ?? null,
          document_id: documentId ?? null,
          schema_id: schemaId ?? null,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.content) { full += parsed.content; setStreaming(full); }
          } catch { /* ignore */ }
        }
      }

      setMessages((prev) => [...prev, { role: "bot", text: full }]);
      setStreaming("");
      if (!open) setUnread((u) => u + 1);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      const friendly = errMsg.includes("401") ? "Invalid API key. Check settings." : errMsg.includes("429") ? "Rate limit reached." : `Error: ${errMsg}`;
      setMessages((prev) => [...prev, { role: "bot", text: friendly, error: true }]);
      setStreaming("");
    } finally {
      setLoading(false);
    }
  };

  const hasContext = jobId || documentId || schemaId;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
        style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}
        aria-label="Open AI Assistant"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white">{unread}</span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <aside
          className={`fixed bottom-24 right-5 z-50 flex h-[min(580px,calc(100vh-8rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border shadow-cockpit transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-panel-border bg-card"}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-primary/10 backdrop-blur-sm rounded-2xl border-2 border-dashed border-primary">
              <Paperclip className="h-10 w-10 text-primary mb-2" />
              <p className="font-bold text-primary">Drop file to attach</p>
            </div>
          )}

          {/* Header */}
          <header className="flex items-center justify-between border-b border-border bg-sidebar px-4 py-3 text-sidebar-foreground">
            <div>
              <p className="font-bold text-primary-foreground">AI Assistant</p>
              <p className={`text-xs ${hasContext ? "text-success" : "text-muted-foreground"}`}>
                {hasContext ? "● Context loaded" : `Powered by ${currentProviderLabel}`}
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => setShowSettings((s) => !s)}><Settings className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setMessages([{ role: "bot", text: "Chat cleared. How can I help?" }])}><Trash2 className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
          </header>

          {/* Settings */}
          {showSettings && (
            <div className="grid gap-2 border-b border-border bg-muted p-3 text-xs">
              <select value={provider} onChange={(e) => handleProviderChange(e.target.value)} className="h-9 rounded-lg border border-input bg-card px-3">
                {PROVIDER_OPTIONS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
              <input type="password" placeholder={`${currentProviderLabel} API Key`} value={apiKey} onChange={(e) => { setApiKey(e.target.value); saveStoredKey(provider, e.target.value); }} className="h-9 rounded-lg border border-input bg-card px-3" />
              <input type="text" placeholder={`Model (default: ${currentProviderDefaultModel})`} value={model} onChange={(e) => setModel(e.target.value)} className="h-9 rounded-lg border border-input bg-card px-3" />
              <p className="text-muted-foreground">📎 Attach images/docs in the chat input below</p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${msg.role === "user" ? "bg-primary" : "bg-muted"}`}>
                  {msg.role === "user" ? <span className="text-xs font-bold text-primary-foreground">U</span> : <Bot className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <div className="max-w-[82%] space-y-1.5">
                  {/* Attachments preview */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.attachments.map((att, ai) => (
                        <div key={ai} className="rounded-xl overflow-hidden border border-border bg-muted">
                          {att.type === "image" && att.preview ? (
                            <img src={att.preview} alt={att.name} className="h-24 w-24 object-cover" />
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-2">
                              <File className="h-4 w-4 text-primary shrink-0" />
                              <span className="text-xs font-medium truncate max-w-[120px]">{att.name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Message text */}
                  {msg.text && (
                    <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${msg.role === "user" ? "rounded-tr-sm bg-primary text-primary-foreground" :
                      msg.error ? "rounded-tl-sm border border-destructive/25 bg-destructive/10 text-destructive" :
                        "rounded-tl-sm bg-muted text-foreground"
                      }`}>
                      {msg.text}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming */}
            {streaming && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted"><Bot className="h-3.5 w-3.5 text-muted-foreground" /></div>
                <div className="max-w-[82%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
                  {streaming}<span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary" />
                </div>
              </div>
            )}

            {/* Loading dots */}
            {loading && !streaming && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted"><Bot className="h-3.5 w-3.5 text-muted-foreground" /></div>
                <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Suggested questions */}
            {messages.length === 1 && !loading && (
              <div className="grid gap-2">
                {PROMPTS.map((p) => (
                  <button key={p} onClick={() => send(p)} className="rounded-xl border border-border bg-card px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                    {p}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Pending attachments preview */}
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border bg-muted/40 px-3 py-2">
              {pendingAttachments.map((att, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden border border-border bg-card">
                  {att.type === "image" && att.preview ? (
                    <img src={att.preview} alt={att.name} className="h-14 w-14 object-cover" />
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-2">
                      <File className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs font-medium max-w-[80px] truncate">{att.name}</span>
                    </div>
                  )}
                  <button onClick={() => removeAttachment(i)} className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white text-[10px]">×</button>
                </div>
              ))}
              {uploadingFile && (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-muted">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </div>
          )}

          {/* Input */}
          <footer className="border-t border-border p-3">
            {!apiKey && (
              <p className="mb-2 rounded-lg bg-warning/10 px-3 py-1.5 text-xs text-warning">
                ⚙ Add your {currentProviderLabel} API key in settings to start chatting
              </p>
            )}
            <div className="flex gap-2 items-end">
              {/* Attach button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-input bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                title="Attach image or document"
              >
                {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.txt,.md,.csv,.html"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={pendingAttachments.length > 0 ? "Ask about the attached file..." : "Ask anything or attach a file..."}
                rows={1}
                className="min-h-[38px] flex-1 resize-none rounded-xl border border-input bg-card px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button onClick={() => send()} disabled={loading || (!input.trim() && pendingAttachments.length === 0)} size="icon">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-1 text-center text-[11px] text-muted-foreground">
              Enter to send · Shift+Enter for newline · 📎 Attach images & docs
            </p>
          </footer>
        </aside>
      )}
    </>
  );
}
