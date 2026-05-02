import { AlertTriangle, Lightbulb, RotateCcw } from "lucide-react";
import { GradeBadge } from "./badges";

export function QualityPanel({
  score = 78,
  showRetry = true,
  coverage,
  avgConfidence,
  sourceQuality,
  missingFields = [],
  suggestions = [],
  onSmartRetry,
}: {
  score?: number;
  showRetry?: boolean;
  coverage?: number;
  avgConfidence?: number;
  sourceQuality?: number;
  missingFields?: string[];
  suggestions?: string[];
  onSmartRetry?: () => void;
}) {
  const barColor = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="rounded-xl p-4"
      style={{ backgroundColor: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.2)" }}>
      {/* Score row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold text-white">Quality Score: {score}/100</p>
          <GradeBadge score={score} />
        </div>
        {showRetry && score < 75 && onSmartRetry && (
          <button
            onClick={onSmartRetry}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white transition-all hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Smart Retry
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 overflow-hidden rounded-full"
        style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: barColor }} />
      </div>

      {/* Stats */}
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3"
        style={{ color: "rgba(255,255,255,0.45)" }}>
        <span>Coverage: {coverage ?? 80}%</span>
        <span>Confidence: {avgConfidence ?? 81}%</span>
        <span>Source Quality: {sourceQuality ?? 12}/15</span>
      </div>

      {/* Missing fields */}
      {missingFields.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {missingFields.slice(0, 3).map((f) => (
            <span key={f} className="inline-flex items-center gap-1 rounded-lg px-2 py-1"
              style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
              <AlertTriangle className="h-3.5 w-3.5" />Missing: {f}
            </span>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {suggestions.slice(0, 2).map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-lg px-2 py-1"
              style={{ backgroundColor: "rgba(37,99,235,0.12)", color: "#60a5fa" }}>
              <Lightbulb className="h-3.5 w-3.5" />{s.slice(0, 60)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
