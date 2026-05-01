import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { confidenceTone, gradeFor } from "@/lib/aqt";

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "completed" || status === "parsed"
      ? "bg-green-500/15 text-green-400 border-green-500/20"
      : status === "failed" || status === "error"
        ? "bg-red-500/15 text-red-400 border-red-500/20"
        : status === "running" || status === "parsing"
          ? "bg-blue-500/15 text-blue-400 border-blue-500/20"
          : "bg-white/5 text-white/40 border-white/10";

  const Icon =
    status === "running" || status === "parsing"
      ? Loader2
      : status === "completed" || status === "parsed"
        ? CheckCircle2
        : status === "failed" || status === "error"
          ? XCircle
          : Clock3;

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize", tone)}>
      <Icon className={cn("h-3 w-3", (status === "running" || status === "parsing") && "animate-spin")} />
      {status}
    </span>
  );
}

export function ConfidenceBadge({ value }: { value?: number | null }) {
  const tone = confidenceTone(value);
  return (
    <span className={cn(
      "rounded-full px-2 py-0.5 text-xs font-bold",
      tone === "high" && "bg-green-500/15 text-green-400",
      tone === "mid" && "bg-yellow-500/15 text-yellow-400",
      tone === "low" && "bg-red-500/15 text-red-400",
    )}>
      {value ? `${Math.round(value * 100)}%` : "—"}
    </span>
  );
}

export function GradeBadge({ score }: { score: number }) {
  const grade = gradeFor(score);
  const tone =
    grade === "A" ? "bg-green-500/15 text-green-400 border-green-500/20" :
      grade === "B" ? "bg-blue-500/15 text-blue-400 border-blue-500/20" :
        grade === "C" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" :
          "bg-red-500/15 text-red-400 border-red-500/20";

  return (
    <span className={cn("rounded-lg border px-2.5 py-1 text-xs font-black", tone)}>
      {grade}
    </span>
  );
}
