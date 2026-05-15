import { useState } from "react";
import { ChevronDown, ChevronUp, MapPin, ExternalLink } from "lucide-react";
import { ConfidenceBadge } from "./badges";
import { QualityPanel } from "./quality-panel";

interface ResultViewProps {
    result?: Record<string, unknown>;
    confidence?: Record<string, number>;
    sources?: Record<string, string>;
    evidence?: Record<string, string>;
    documentId?: string;
    records?: Array<{ result: Record<string, unknown>; confidence: Record<string, number>; schema_fields?: string[] }>;
    schemaFields?: string[];
    score?: number;
    failureLog?: Array<{ type: string; reason?: string }>;
    duration?: number;
    provider?: string;
    schemaName?: string;
    jobId?: string;
    coverage?: number;
    avgConfidence?: number;
    missingFields?: string[];
    suggestions?: string[];
    onSmartRetry?: () => void;
    onFieldClick?: (fieldName: string, source: string, evidence: string) => void;
}

export function ResultView({
    result,
    confidence = {},
    sources = {},
    evidence = {},
    documentId,
    records,
    schemaFields = [],
    score = 0,
    failureLog = [],
    duration,
    provider,
    schemaName,
    jobId,
    coverage,
    avgConfidence,
    missingFields = [],
    suggestions = [],
    onSmartRetry,
    onFieldClick,
}: ResultViewProps) {
    const [activeTab, setActiveTab] = useState(0);

    const isMultiRecord = records && records.length > 0;
    const fields = schemaFields.length > 0 ? schemaFields : Object.keys(result ?? {});

    return (
        <div className="space-y-4">
            {/* Header info */}
            {(schemaName || duration !== undefined || provider) && (
                <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {schemaName && <span className="font-bold text-white">{schemaName}</span>}
                    {duration !== undefined && <span>{duration}s</span>}
                    {provider && (
                        <span className="rounded-full px-2 py-0.5 text-xs font-bold"
                            style={{ backgroundColor: "rgba(37,99,235,0.15)", color: "#60a5fa" }}>
                            {provider}
                        </span>
                    )}
                    {jobId && <span className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{jobId.slice(0, 12)}...</span>}
                </div>
            )}

            {/* Source navigation hint */}
            {documentId && (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ backgroundColor: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.18)" }}>
                    <MapPin className="h-3 w-3 shrink-0" style={{ color: "#60a5fa" }} />
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                        Click any field to jump to its source location in the document
                    </span>
                </div>
            )}

            {/* Quality panel */}
            <QualityPanel
                score={score}
                coverage={coverage}
                avgConfidence={avgConfidence}
                missingFields={missingFields}
                suggestions={suggestions}
                onSmartRetry={onSmartRetry}
            />

            {/* Multi-record tabs */}
            {isMultiRecord && (
                <div>
                    <div className="flex overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        {records.map((rec, i) => {
                            const label =
                                (rec.result?.ModelNumber as string) ||
                                (rec.result?.model_number as string) ||
                                `Record ${i + 1}`;
                            return (
                                <button
                                    key={i}
                                    onClick={() => setActiveTab(i)}
                                    className="shrink-0 px-4 py-2 text-sm font-semibold transition-colors"
                                    style={{
                                        borderBottom: activeTab === i ? "2px solid #3b82f6" : "2px solid transparent",
                                        color: activeTab === i ? "#60a5fa" : "rgba(255,255,255,0.4)",
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                    <FieldGrid
                        result={records[activeTab]?.result ?? {}}
                        confidence={records[activeTab]?.confidence ?? {}}
                        fields={records[activeTab]?.schema_fields ?? fields}
                        sources={sources}
                        evidence={evidence}
                        onFieldClick={onFieldClick}
                    />
                </div>
            )}

            {/* Single record */}
            {!isMultiRecord && result && (
                <FieldGrid
                    result={result}
                    confidence={confidence}
                    fields={fields}
                    sources={sources}
                    evidence={evidence}
                    onFieldClick={onFieldClick}
                />
            )}

            {/* Failure log */}
            {failureLog.length > 0 && (
                <div className="rounded-xl p-3"
                    style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
                    <p className="text-sm font-bold" style={{ color: "#f59e0b" }}>Warnings</p>
                    {failureLog.map((f, i) => (
                        <p key={i} className="mt-1 text-xs" style={{ color: "rgba(245,158,11,0.8)" }}>{f.reason || f.type}</p>
                    ))}
                </div>
            )}
        </div>
    );
}

function FieldGrid({
    result,
    confidence,
    fields,
    sources = {},
    evidence = {},
    onFieldClick,
}: {
    result: Record<string, unknown>;
    confidence: Record<string, number>;
    fields: string[];
    sources?: Record<string, string>;
    evidence?: Record<string, string>;
    onFieldClick?: (fieldName: string, source: string, evidence: string) => void;
}) {
    return (
        <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {fields.map((fname) => {
                const val = result[fname];
                const conf = confidence[fname] ?? 0;
                const isArray = Array.isArray(val);
                const isNull = val === null || val === undefined;
                const src = sources[fname] ?? "";
                const evid = evidence[fname] ?? "";
                const hasSource = !!src && src !== "fallback";
                // Always allow clicking when onFieldClick is provided — even if sources haven't loaded yet
                const isClickable = !!onFieldClick;
                const isAiSource = src.startsWith("ai:") || src === "landingai_ade";
                const sourceLabel = isAiSource ? "AI" : src === "table" ? "Table" : src === "kv" ? "KV" : src === "chunk" ? "Chunk" : src === "text" ? "Text" : src === "landingai_ade" ? "AI" : src || (onFieldClick ? "·" : "");

                return (
                    <div
                        key={fname}
                        className={`flex items-start justify-between rounded-lg px-3 py-2 transition-colors ${isArray ? "sm:col-span-2" : ""} ${isClickable ? "cursor-pointer" : ""}`}
                        style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = isClickable ? "rgba(37,99,235,0.08)" : "rgba(255,255,255,0.06)")}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)")}
                        onClick={() => isClickable && onFieldClick && onFieldClick(fname, src, evid)}
                        title={isClickable ? `Click to highlight "${fname}" in PDF` : undefined}
                    >
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>{fname}</p>
                                {(hasSource || isClickable) && sourceLabel && (
                                    <span className="flex items-center gap-0.5 text-[10px] font-bold rounded px-1 py-0.5"
                                        style={{
                                            backgroundColor: isAiSource ? "rgba(124,58,237,0.15)" : "rgba(37,99,235,0.12)",
                                            color: isAiSource ? "#a78bfa" : "#60a5fa",
                                        }}>
                                        {isClickable && <MapPin className="h-2 w-2" />}
                                        {sourceLabel}
                                    </span>
                                )}
                            </div>
                            <div className="text-sm text-white mt-0.5">
                                {isNull ? (
                                    <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>
                                ) : isArray ? (
                                    <NestedArray value={val as unknown[]} fieldName={fname} />
                                ) : typeof val === "object" ? (
                                    <span className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>{JSON.stringify(val)}</span>
                                ) : (
                                    <span style={{ color: "rgba(255,255,255,0.9)" }}>{String(val)}</span>
                                )}
                            </div>
                            {evid && hasSource && isClickable && (
                                <p className="text-[10px] mt-1 truncate" style={{ color: "rgba(255,255,255,0.25)" }}>
                                    {evid.slice(0, 100)}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                            {!isArray && <ConfidenceBadge value={isNull ? null : conf} />}
                            {isClickable && (
                                <ExternalLink className="h-3 w-3 opacity-40 hover:opacity-100 transition-opacity" style={{ color: "#60a5fa" }} />
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function NestedArray({ value, fieldName }: { value: unknown[]; fieldName: string }) {
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    if (!value || value.length === 0) return <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>;

    const isObjects = typeof value[0] === "object" && value[0] !== null;

    if (!isObjects) {
        return (
            <div className="flex flex-wrap gap-1">
                {value.map((v, i) => (
                    <span key={i} className="rounded px-1.5 py-0.5 text-xs"
                        style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>
                        {String(v)}
                    </span>
                ))}
            </div>
        );
    }

    const records = value as Record<string, unknown>[];
    const keys = Object.keys(records[0] ?? {});

    return (
        <div className="mt-1">
            <button
                onClick={() => setExpanded((e) => !e)}
                className="flex items-center gap-1 text-xs font-semibold hover:underline"
                style={{ color: "#60a5fa" }}
            >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {records.length} {fieldName} record{records.length !== 1 ? "s" : ""}
            </button>

            {expanded && (
                <div className="mt-2 overflow-hidden rounded-lg"
                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                    {records.length > 1 && (
                        <div className="flex overflow-x-auto"
                            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                            {records.map((rec, i) => {
                                const label = (rec.ModelNumber as string) || (rec.model_number as string) || `#${i + 1}`;
                                return (
                                    <button
                                        key={i}
                                        onClick={() => setActiveTab(i)}
                                        className="shrink-0 px-3 py-1.5 text-xs font-semibold transition-colors"
                                        style={{
                                            borderBottom: activeTab === i ? "2px solid #3b82f6" : "2px solid transparent",
                                            color: activeTab === i ? "#60a5fa" : "rgba(255,255,255,0.4)",
                                        }}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <div className="grid max-h-56 grid-cols-2 gap-x-4 gap-y-1.5 overflow-y-auto p-3"
                        style={{ backgroundColor: "rgba(13,21,38,0.8)" }}>
                        {keys.map((key) => {
                            const v = records[activeTab]?.[key];
                            return (
                                <div key={key}>
                                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{key}</p>
                                    <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
                                        {v === null || v === undefined
                                            ? <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>
                                            : String(v)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
