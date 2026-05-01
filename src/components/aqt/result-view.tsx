import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ConfidenceBadge } from "./badges";
import { QualityPanel } from "./quality-panel";

interface ResultViewProps {
    result?: Record<string, unknown>;
    confidence?: Record<string, number>;
    sources?: Record<string, string>;
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
}

export function ResultView({
    result,
    confidence = {},
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
}: ResultViewProps) {
    const [activeTab, setActiveTab] = useState(0);

    const isMultiRecord = records && records.length > 0;
    const fields = schemaFields.length > 0 ? schemaFields : Object.keys(result ?? {});

    return (
        <div className="space-y-4">
            {/* Header info */}
            {(schemaName || duration !== undefined || provider) && (
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {schemaName && <span className="font-bold text-foreground">{schemaName}</span>}
                    {duration !== undefined && <span>{duration}s</span>}
                    {provider && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{provider}</span>}
                    {jobId && <span className="font-mono text-xs">{jobId.slice(0, 12)}...</span>}
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
                    <div className="flex overflow-x-auto border-b border-border">
                        {records.map((rec, i) => {
                            const label =
                                (rec.result?.ModelNumber as string) ||
                                (rec.result?.model_number as string) ||
                                `Record ${i + 1}`;
                            return (
                                <button
                                    key={i}
                                    onClick={() => setActiveTab(i)}
                                    className={`shrink-0 border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${activeTab === i
                                            ? "border-primary text-primary"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                        }`}
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
                    />
                </div>
            )}

            {/* Single record */}
            {!isMultiRecord && result && (
                <FieldGrid result={result} confidence={confidence} fields={fields} />
            )}

            {/* Failure log */}
            {failureLog.length > 0 && (
                <div className="rounded-xl border border-warning/25 bg-warning/10 p-3">
                    <p className="text-sm font-bold text-warning">Warnings</p>
                    {failureLog.map((f, i) => (
                        <p key={i} className="mt-1 text-xs text-warning/80">{f.reason || f.type}</p>
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
}: {
    result: Record<string, unknown>;
    confidence: Record<string, number>;
    fields: string[];
}) {
    return (
        <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {fields.map((fname) => {
                const val = result[fname];
                const conf = confidence[fname] ?? 0;
                const isArray = Array.isArray(val);
                const isNull = val === null || val === undefined;

                return (
                    <div
                        key={fname}
                        className={`flex items-start justify-between rounded-lg px-2 py-1.5 hover:bg-muted/60 ${isArray ? "sm:col-span-2" : ""}`}
                    >
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-muted-foreground">{fname}</p>
                            <div className="text-sm text-foreground">
                                {isNull ? (
                                    <span className="text-muted-foreground/40">—</span>
                                ) : isArray ? (
                                    <NestedArray value={val as unknown[]} fieldName={fname} />
                                ) : typeof val === "object" ? (
                                    <span className="font-mono text-xs">{JSON.stringify(val)}</span>
                                ) : (
                                    String(val)
                                )}
                            </div>
                        </div>
                        {!isArray && <ConfidenceBadge value={isNull ? null : conf} />}
                    </div>
                );
            })}
        </div>
    );
}

function NestedArray({ value, fieldName }: { value: unknown[]; fieldName: string }) {
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    if (!value || value.length === 0) return <span className="text-muted-foreground/40">—</span>;

    const isObjects = typeof value[0] === "object" && value[0] !== null;

    if (!isObjects) {
        return (
            <div className="flex flex-wrap gap-1">
                {value.map((v, i) => (
                    <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-xs">{String(v)}</span>
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
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {records.length} {fieldName} record{records.length !== 1 ? "s" : ""}
            </button>

            {expanded && (
                <div className="mt-2 overflow-hidden rounded-lg border border-border">
                    {records.length > 1 && (
                        <div className="flex overflow-x-auto border-b border-border bg-muted/40">
                            {records.map((rec, i) => {
                                const label = (rec.ModelNumber as string) || (rec.model_number as string) || `#${i + 1}`;
                                return (
                                    <button
                                        key={i}
                                        onClick={() => setActiveTab(i)}
                                        className={`shrink-0 border-b-2 px-3 py-1.5 text-xs font-semibold transition-colors ${activeTab === i ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                                            }`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <div className="grid max-h-56 grid-cols-2 gap-x-4 gap-y-1.5 overflow-y-auto p-3">
                        {keys.map((key) => {
                            const v = records[activeTab]?.[key];
                            return (
                                <div key={key}>
                                    <p className="text-xs text-muted-foreground">{key}</p>
                                    <p className="text-xs font-medium text-foreground">
                                        {v === null || v === undefined ? <span className="text-muted-foreground/40">—</span> : String(v)}
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
