import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Bot, CheckCircle2, ChevronRight, Cpu, Database,
  FileText, Layers3, Shield, Sparkles, Zap, BarChart3, Globe,
  Clock, TrendingUp, Play, X, ChevronLeft, Upload, Settings2,
  Download, CheckCircle, AlertCircle, Loader2
} from "lucide-react";
import { engineBadges, isAuthenticated } from "@/lib/aqt";
import { FloatingNav } from "@/components/aqt/app-shell";

export const Route = createFileRoute("/")({ component: Index });

// ── Demo Modal ────────────────────────────────────────────────────────────────

const DEMO_STEPS = [
  {
    id: 1,
    title: "Upload Your PDF",
    subtitle: "Drop any equipment spec sheet",
    description: "Simply drag and drop your industrial equipment PDF — spec sheets, catalogs, data sheets. The system accepts single files or hundreds at once for batch processing.",
    color: "from-blue-500 to-cyan-500",
    icon: Upload,
  },
  {
    id: 2,
    title: "Define Your Schema",
    subtitle: "Tell AI what to extract",
    description: "Create a schema with the fields you need — model number, dimensions, electrical specs, weight. Or let GPT-4o auto-generate the perfect schema by analyzing your document.",
    color: "from-violet-500 to-purple-500",
    icon: Settings2,
  },
  {
    id: 3,
    title: "AI Extracts Data",
    subtitle: "Multiple engines, maximum accuracy",
    description: "Choose from 9+ AI engines — Landing AI ADE, GPT-4o, Claude, Gemini, Groq, and more. The system extracts all model variants simultaneously with confidence scoring.",
    color: "from-amber-500 to-orange-500",
    icon: Bot,
  },
  {
    id: 4,
    title: "Review & Export",
    subtitle: "Quality scored, ready to use",
    description: "Every extraction gets an A–F quality grade. Review field-by-field confidence scores, run Smart Retry on low-confidence fields, then export to Excel or CSV.",
    color: "from-emerald-500 to-green-500",
    icon: Download,
  },
];

function DemoStep1() {
  const [dropped, setDropped] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setDropped(true), 800);
    const t2 = setTimeout(() => setParsing(true), 1600);
    const t3 = setTimeout(() => { setParsing(false); setDone(true); }, 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`w-full max-w-sm rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-500 ${dropped ? "border-blue-500 bg-blue-500/10" : "border-white/20 bg-white/5"}`}>
        <FileText className={`mx-auto h-12 w-12 mb-3 transition-all duration-500 ${dropped ? "text-blue-400 scale-110" : "text-white/30"}`} />
        <p className={`font-bold transition-colors duration-300 ${dropped ? "text-white" : "text-white/40"}`}>
          {done ? "✓ Parsed successfully" : dropped ? "garland-ecg-griddle.pdf" : "Drop PDF here"}
        </p>
        {parsing && <p className="text-sm text-blue-400 mt-1 animate-pulse">Parsing document...</p>}
        {done && <p className="text-sm text-green-400 mt-1">2 pages · 4 tables · 12 KV pairs</p>}
      </div>
      {done && (
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm animate-in fade-in duration-500">
          {[["2", "Pages"], ["4", "Tables"], ["12", "KV Pairs"]].map(([n, l]) => (
            <div key={l} className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
              <p className="text-2xl font-black text-blue-400">{n}</p>
              <p className="text-xs text-white/50">{l}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DemoStep2() {
  const fields = ["manufacturer", "model_number", "heat_type", "width_in", "height_in", "shipping_weight_lbs", "nominal_output_kw", "power_supply"];
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setVisible(v => v < fields.length ? v + 1 : v), 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-sm space-y-2">
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-bold text-violet-300 mb-3">
        🧠 Auto-generating schema from document...
      </div>
      {fields.slice(0, visible).map((f, i) => (
        <div key={f} className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-3 py-2 animate-in slide-in-from-left duration-300">
          <span className="font-mono text-sm text-white/80">{f}</span>
          <span className="text-xs rounded bg-violet-500/20 text-violet-300 px-2 py-0.5">
            {["string", "string", "string", "number", "number", "number", "number", "string"][i]}
          </span>
        </div>
      ))}
      {visible >= fields.length && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-400 animate-in fade-in">
          ✓ Schema ready — {fields.length} fields
        </div>
      )}
    </div>
  );
}

function DemoStep3() {
  const [phase, setPhase] = useState(0);
  const fields = [
    { name: "manufacturer", value: "Garland Commercial", conf: 90 },
    { name: "model_number", value: "ECG-48R", conf: 90 },
    { name: "heat_type", value: "Electric", conf: 85 },
    { name: "width_in", value: "48.0", conf: 90 },
    { name: "height_in", value: "13.75", conf: 88 },
    { name: "shipping_weight_lbs", value: "500", conf: 90 },
    { name: "nominal_output_kw", value: "17.2", conf: 88 },
    { name: "power_supply", value: "208/60/3", conf: 90 },
  ];

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="w-full max-w-sm space-y-2">
      {phase === 0 && (
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="h-10 w-10 text-amber-400 animate-spin" />
          <p className="text-white/60 text-sm">Connecting to Landing AI ADE...</p>
        </div>
      )}
      {phase >= 1 && (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-300 mb-3">
            <Loader2 className={`h-4 w-4 ${phase < 2 ? "animate-spin" : "hidden"}`} />
            {phase < 2 ? "Extracting with Landing AI ADE..." : "✓ Extraction complete · 22.5s"}
          </div>
          {fields.slice(0, phase >= 2 ? fields.length : 3).map((f) => (
            <div key={f.name} className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-3 py-2 animate-in slide-in-from-right duration-300">
              <span className="font-mono text-xs text-white/50">{f.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{f.value}</span>
                <span className="text-xs rounded bg-green-500/20 text-green-400 px-1.5 py-0.5 font-bold">{f.conf}%</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function DemoStep4() {
  const [score] = useState(91);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="w-full max-w-sm space-y-4">
      {/* Quality score */}
      <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-white">Quality Score</span>
          <span className="text-2xl font-black text-green-400">{score}/100 · A</span>
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-1000" style={{ width: `${width}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-center">
          <div><p className="text-green-400 font-bold">80%</p><p className="text-white/40">Coverage</p></div>
          <div><p className="text-green-400 font-bold">88%</p><p className="text-white/40">Confidence</p></div>
          <div><p className="text-green-400 font-bold">12/15</p><p className="text-white/40">Source Quality</p></div>
        </div>
      </div>
      {/* Export buttons */}
      <div className="grid grid-cols-2 gap-3">
        {[["📊 Excel", "green"], ["📄 CSV", "blue"]].map(([label, color]) => (
          <div key={label} className={`rounded-xl border border-${color}-500/30 bg-${color}-500/10 p-3 text-center cursor-pointer hover:bg-${color}-500/20 transition-colors`}>
            <p className="font-bold text-white text-sm">{label}</p>
            <p className="text-xs text-white/40 mt-0.5">Download</p>
          </div>
        ))}
      </div>
      {/* Multi-record note */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-300">
        💡 Multi-record mode extracted <strong>5 models</strong> (ECG-24R through ECG-72R) in one pass
      </div>
    </div>
  );
}

const STEP_COMPONENTS = [DemoStep1, DemoStep2, DemoStep3, DemoStep4];

function DemoModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [key, setKey] = useState(0);

  const goTo = (i: number) => { setStep(i); setKey(k => k + 1); };
  const next = () => step < 3 && goTo(step + 1);
  const prev = () => step > 0 && goTo(step - 1);

  const StepComponent = STEP_COMPONENTS[step];
  const current = DEMO_STEPS[step];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#060b18]">
      {/* Full-screen background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />
      </div>

      {/* Top bar */}
      <div className="relative flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-8 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-black text-white">AQT Data Intelligence</span>
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-0.5 text-xs font-bold text-blue-400">Interactive Demo</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white transition-all"
        >
          <X className="h-4 w-4" /> Exit Demo
        </button>
      </div>

      {/* Progress steps */}
      <div className="relative border-b border-white/10 bg-white/[0.02] px-8 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          {DEMO_STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              className={`flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${i === step ? `bg-gradient-to-r ${current.color} text-white shadow-lg` : i < step ? "bg-white/10 text-white/60" : "bg-white/5 text-white/30"}`}
            >
              <s.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:block">{s.title}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
          ))}
        </div>
        {/* Progress bar */}
        <div className="mx-auto mt-3 max-w-4xl h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${current.color} transition-all duration-500`}
            style={{ width: `${((step + 1) / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Main content — full height */}
      <div className="relative flex-1 overflow-auto">
        <div className="mx-auto grid h-full max-w-6xl gap-0 md:grid-cols-2">
          {/* Left — text */}
          <div className="flex flex-col justify-center border-r border-white/10 p-10 xl:p-16">
            <div className={`mb-4 inline-flex w-fit items-center gap-2 rounded-xl bg-gradient-to-r ${current.color} px-4 py-2`}>
              <current.icon className="h-5 w-5 text-white" />
              <span className="text-sm font-black text-white">Step {step + 1} of 4</span>
            </div>
            <h2 className="text-4xl font-black text-white xl:text-5xl">{current.title}</h2>
            <p className="mt-2 text-xl font-semibold text-white/50">{current.subtitle}</p>
            <p className="mt-5 text-lg leading-relaxed text-white/60">{current.description}</p>

            <div className="mt-8 space-y-4">
              {[
                ["Supports PDF, PNG, JPG formats", "Auto-parses on upload", "Batch upload hundreds at once"],
                ["Manual field builder", "GPT-4o auto-generation", "Upload any JSON schema format"],
                ["9+ AI engines available", "Multi-record extraction", "Parallel engine comparison"],
                ["A–F quality grading", "Smart Retry for low confidence", "Excel & CSV export"],
              ][step].map((bullet) => (
                <div key={bullet} className="flex items-center gap-3 text-base text-white/60">
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${current.color}`}>
                    <CheckCircle className="h-3.5 w-3.5 text-white" />
                  </div>
                  {bullet}
                </div>
              ))}
            </div>
          </div>

          {/* Right — animated visual */}
          <div className="flex items-center justify-center p-10 xl:p-16 bg-gradient-to-br from-white/[0.02] to-transparent">
            <div key={key} className="w-full max-w-md animate-in fade-in slide-in-from-bottom-6 duration-500">
              <StepComponent />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="relative border-t border-white/10 bg-white/[0.03] px-8 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <button
            onClick={prev}
            disabled={step === 0}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-bold text-white/60 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>

          <div className="flex items-center gap-2">
            {DEMO_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all duration-300 ${i === step ? "w-8 bg-blue-500" : "w-2 bg-white/20 hover:bg-white/40"}`}
              />
            ))}
          </div>

          {step < 3 ? (
            <button
              onClick={next}
              className={`flex items-center gap-2 rounded-xl bg-gradient-to-r ${current.color} px-8 py-3 text-sm font-bold text-white shadow-lg transition-all hover:opacity-90 hover:-translate-y-0.5`}
            >
              Next Step <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Link
              to="/register"
              onClick={onClose}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-8 py-3 text-sm font-bold text-white shadow-lg hover:opacity-90 transition-all"
            >
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
function Index() {
  const [scrolled, setScrolled] = useState(false);
  const [count, setCount] = useState({ engines: 0, fields: 0, accuracy: 0 });
  const [showDemo, setShowDemo] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const loggedIn = isAuthenticated();

  // Ping backend health every 30s
  useEffect(() => {
    const BASE = (import.meta as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE
      ?? "https://ai-data-intelligence-1.onrender.com/api/v1";
    const healthUrl = BASE.replace(/\/api\/v1\/?$/, "") + "/health";
    const check = async () => {
      try {
        // Use no-cors so CORS headers don't block the ping.
        // A successful fetch (even opaque) means the server is reachable.
        await fetch(healthUrl, {
          method: "GET",
          mode: "no-cors",
          signal: AbortSignal.timeout(10000),
        });
        setApiOnline(true); // if fetch didn't throw, server is up
      } catch {
        setApiOnline(false);
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Animate counters when stats section is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const duration = 1500;
          const targets = { engines: 9, fields: 30, accuracy: 95 };
          const start = Date.now();
          const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            setCount({
              engines: Math.round(ease * targets.engines),
              fields: Math.round(ease * targets.fields),
              accuracy: Math.round(ease * targets.accuracy),
            });
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const steps = [
    { icon: FileText, title: "Upload", desc: "Drop any equipment spec sheet PDF — single files or hundreds at once", color: "from-blue-500 to-blue-600" },
    { icon: Layers3, title: "Define Schema", desc: "Define extraction fields or let AI auto-generate a schema for you", color: "from-violet-500 to-violet-600" },
    { icon: Zap, title: "Extract", desc: "Choose your AI engine — Landing AI, GPT-4o, Claude, Gemini, or more", color: "from-amber-500 to-orange-500" },
    { icon: Database, title: "Export", desc: "Download clean structured data as Excel or CSV — ready for your database", color: "from-emerald-500 to-green-600" },
  ];

  const features = [
    { icon: Bot, title: "Multi-Engine AI", desc: "Run Landing AI ADE, GPT-4o, Claude, Gemini, Groq, Grok, and more. Compare results side-by-side.", gradient: "from-blue-500/10 to-violet-500/10", border: "border-blue-500/20" },
    { icon: Layers3, title: "Batch Processing", desc: "Process hundreds of PDFs simultaneously. Upload once, extract all, download a single combined Excel.", gradient: "from-emerald-500/10 to-teal-500/10", border: "border-emerald-500/20" },
    { icon: BarChart3, title: "Engine Comparison", desc: "Run the same document through multiple AI engines in parallel. See a field-by-field accuracy matrix.", gradient: "from-amber-500/10 to-orange-500/10", border: "border-amber-500/20" },
    { icon: CheckCircle2, title: "Quality Scoring", desc: "Every extraction gets an automatic A–F quality grade with breakdown, missing field alerts, and suggestions.", gradient: "from-rose-500/10 to-pink-500/10", border: "border-rose-500/20" },
    { icon: Zap, title: "Smart Retry", desc: "Low confidence fields are automatically re-extracted with targeted prompts, dramatically improving accuracy.", gradient: "from-violet-500/10 to-purple-500/10", border: "border-violet-500/20" },
    { icon: Cpu, title: "Auto Schema Generator", desc: "Upload a document and let GPT-4o automatically generate the perfect extraction schema — no manual work.", gradient: "from-cyan-500/10 to-blue-500/10", border: "border-cyan-500/20" },
  ];

  return (
    <div className="min-h-screen bg-[#060b18] text-white overflow-x-hidden">
      {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}

      {/* ── Navbar ── */}
      <nav className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#060b18]/95 border-b border-white/10 backdrop-blur-xl shadow-lg" : "bg-transparent"}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight">AQT <span className="text-blue-400">Data Intelligence</span></span>
          </div>
          <div className="hidden items-center gap-8 md:flex text-sm font-medium text-white/70">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#engines" className="hover:text-white transition-colors">Engines</a>
          </div>
          <div className="flex items-center gap-3">
            {/* API status indicator — dot only */}
            <span className="relative flex h-2.5 w-2.5" title={apiOnline === null ? "Checking API…" : apiOnline ? "API Online" : "API Offline"}>
              {apiOnline === null ? (
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400 opacity-60" />
              ) : apiOnline ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
                </>
              ) : (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </>
              )}
            </span>
            {loggedIn ? (
              <>
                <Link to="/dashboard" className="text-sm font-semibold text-white/80 hover:text-white transition-colors px-4 py-2">Dashboard</Link>
                <Link to="/dashboard" className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/25">
                  Go to App <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold text-white/80 hover:text-white transition-colors px-4 py-2">Sign In</Link>
                <Link to="/register" className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/25">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-violet-600/15 blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[100px]" />
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 pt-32 pb-24 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400">
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            AI-Powered Document Extraction
          </div>

          <h1 className="text-6xl font-black leading-[1.02] tracking-tight sm:text-7xl xl:text-8xl">
            <span className="text-white">AQT</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Data Intelligence
            </span>
          </h1>

          <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 backdrop-blur-sm">
            <Zap className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-black tracking-widest text-white/90 uppercase">Metadata Extractor</span>
          </div>

          <p className="mt-7 text-xl leading-relaxed text-white/60 max-w-2xl mx-auto">
            Extract structured product attribute data from any industrial equipment spec sheet using AI — automatically, accurately, at scale.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to={loggedIn ? "/dashboard" : "/register"}
              className="group flex items-center gap-2 rounded-2xl bg-blue-600 px-10 py-4 text-base font-bold text-white shadow-2xl shadow-blue-600/30 transition-all hover:bg-blue-500 hover:shadow-blue-500/40 hover:-translate-y-0.5"
            >
              {loggedIn ? "Go to Dashboard" : "Start Extracting Free"}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <button
              onClick={() => setShowDemo(true)}
              className="group flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-10 py-4 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/30 hover:-translate-y-0.5"
            >
              <Play className="h-5 w-5 text-blue-400 group-hover:scale-110 transition-transform" />
              View Demo
            </button>
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap justify-center items-center gap-6 text-sm text-white/40">
            <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-green-400" />BYOK — keys never stored</span>
            <span className="flex items-center gap-1.5"><Globe className="h-4 w-4 text-blue-400" />9+ AI engines</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-amber-400" />20-60s per document</span>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section ref={statsRef} className="border-y border-white/10 bg-white/[0.02] py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
            {[
              { value: `${count.engines}+`, label: "AI Engines", icon: Bot, color: "text-blue-400" },
              { value: `${count.fields}+`, label: "Fields per Schema", icon: Layers3, color: "text-violet-400" },
              { value: `${count.accuracy}%`, label: "Avg Accuracy", icon: TrendingUp, color: "text-green-400" },
              { value: "Any", label: "PDF Format", icon: FileText, color: "text-amber-400" },
            ].map((stat) => (
              <div key={stat.label} className="group">
                <stat.icon className={`mx-auto h-8 w-8 ${stat.color} mb-3 transition-transform group-hover:scale-110`} />
                <p className={`text-4xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="mt-1 text-sm font-medium text-white/50">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-400 mb-3">Simple Process</p>
            <h2 className="text-4xl font-black text-white sm:text-5xl">How Metadata Extractor Works</h2>
            <p className="mt-4 text-lg text-white/50">From raw PDF to structured data in seconds</p>
          </div>
          <div className="relative grid gap-6 lg:grid-cols-4">
            {/* Connector line */}
            <div className="absolute top-16 left-[12.5%] right-[12.5%] hidden h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent lg:block" />
            {steps.map((step, i) => (
              <div key={step.title} className="group relative rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/8 hover:-translate-y-1">
                <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} shadow-lg`}>
                  <step.icon className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white border border-white/20">{i + 1}</div>
                <h3 className="text-lg font-black text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-widest text-violet-400 mb-3">Capabilities</p>
            <h2 className="text-4xl font-black text-white sm:text-5xl">Everything You Need</h2>
            <p className="mt-4 text-lg text-white/50">Live extraction monitors, confidence heatmaps, quality visuals, and robotic workflows.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className={`group rounded-2xl border ${f.border} bg-gradient-to-br ${f.gradient} p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl`}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-black text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Engines ── */}
      <section id="engines" className="py-24">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-cyan-400 mb-3">Integrations</p>
          <h2 className="text-4xl font-black text-white sm:text-5xl">Powered by Leading AI Engines</h2>
          <p className="mt-4 text-lg text-white/50 mb-12">Switch engines, compare outputs, and route jobs by confidence.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {engineBadges.map((badge) => (
              <span key={badge} className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80 backdrop-blur-sm transition-all hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-white">
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-violet-600/20 to-blue-600/20" />
          <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-5xl font-black text-white sm:text-6xl">Ready to extract your product data?</h2>
          <p className="mt-6 text-xl text-white/60">Join teams using AQT Data Intelligence to automate their product data workflows.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to={loggedIn ? "/dashboard" : "/register"}
              className="group flex items-center gap-2 rounded-2xl bg-blue-600 px-10 py-5 text-lg font-black text-white shadow-2xl shadow-blue-600/30 transition-all hover:bg-blue-500 hover:-translate-y-1"
            >
              {loggedIn ? "Go to Dashboard" : "Start Extracting Free"}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto max-w-7xl px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-black text-white">AQT Data Intelligence</span>
            <span className="text-white/40 text-sm">· Metadata Extractor v2.0</span>
          </div>
          <p className="text-sm text-white/40">© 2026 AQT Data Intelligence. All rights reserved.</p>
        </div>
      </footer>
      <FloatingNav />
    </div>
  );
}
