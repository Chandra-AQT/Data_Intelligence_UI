import { AlertTriangle, Lightbulb, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  return (
    <div className="rounded-xl border border-panel-border bg-primary/5 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold text-foreground">Quality Score: {score}/100</p>
          <GradeBadge score={score} />
        </div>
        {showRetry && score < 75 && (
          <Button size="sm" onClick={onSmartRetry}>
            <RotateCcw className="h-4 w-4" />Smart Retry
          </Button>
        )}
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
        <div className="h-full animate-meter rounded-full bg-primary" style={{ width: `${score}%` }} />
      </div>
      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <span>Coverage: {coverage ?? 80}%</span>
        <span>Confidence: {avgConfidence ?? 81}%</span>
        <span>Source Quality: {sourceQuality ?? 12}/15</span>
      </div>
      {missingFields.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {missingFields.slice(0, 3).map((f) => (
            <span key={f} className="inline-flex items-center gap-1 rounded-lg bg-warning/15 px-2 py-1 text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />Missing: {f}
            </span>
          ))}
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {suggestions.slice(0, 2).map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2 py-1 text-primary">
              <Lightbulb className="h-3.5 w-3.5" />{s.slice(0, 60)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
