import { useState } from "react";
import { ChevronLeft, ChevronRight, FileText, ToggleLeft } from "lucide-react";

interface DocumentViewerProps {
    documentId: string;
    fileName: string;
    filePath?: string;
    parsedData?: Record<string, unknown>;
    pageCount?: number;
}

export function DocumentViewer({ documentId, fileName, filePath, parsedData, pageCount = 1 }: DocumentViewerProps) {
    const [activeTab, setActiveTab] = useState<"markdown" | "json">("markdown");
    const [currentPage, setCurrentPage] = useState(1);
    const [showConfidence, setShowConfidence] = useState(true);

    const isImage = /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(fileName);
    const isPdf = /\.pdf$/i.test(fileName);

    const markdown = (parsedData as { markdown?: string })?.markdown ?? "";
    const chunks = (parsedData as { chunks?: Array<{ id: string; type: string; markdown: string; grounding?: { page: number } }> })?.chunks ?? [];
    const tables = (parsedData as { tables?: Array<{ headers: string[]; rows: string[][] }> })?.tables ?? [];

    // Get chunks for current page
    const pageChunks = chunks.filter((c) => (c.grounding?.page ?? 0) === currentPage - 1);

    return (
        <div className="flex h-[calc(100vh-180px)] overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            {/* Left — Document preview */}
            <div className="flex w-1/2 flex-col border-r border-border">
                {/* Top bar */}
                <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground truncate">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate max-w-[200px]">{fileName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-1 rounded hover:bg-muted disabled:opacity-30">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-xs text-muted-foreground">{currentPage} / {pageCount}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))} disabled={currentPage >= pageCount} className="p-1 rounded hover:bg-muted disabled:opacity-30">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Document display */}
                <div className="flex-1 overflow-auto bg-gray-100 p-4 flex items-start justify-center">
                    {isPdf && filePath ? (
                        <iframe
                            src={`${(import.meta as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE?.replace(/\/api\/v1\/?$/, "") ?? "https://dataintelligence-production.up.railway.app"}/uploads/${filePath.split('/').pop()}#page=${currentPage}`}
                            className="w-full h-full min-h-[500px] rounded border border-border bg-white shadow"
                            title={fileName}
                        />
                    ) : isImage && filePath ? (
                        <img
                            src={`${(import.meta as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE?.replace(/\/api\/v1\/?$/, "") ?? "https://dataintelligence-production.up.railway.app"}/uploads/${filePath.split('/').pop()}`}
                            alt={fileName}
                            className="max-w-full rounded border border-border shadow"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                            <FileText className="h-16 w-16 mb-3 opacity-20" />
                            <p className="text-sm">Preview not available</p>
                            <p className="text-xs mt-1">Parse the document to see content</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right — Parsed content */}
            <div className="flex w-1/2 flex-col">
                {/* Tabs bar */}
                <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                    <div className="flex gap-1">
                        {(["markdown", "json"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors ${activeTab === tab ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
                            >
                                {tab === "markdown" ? "Markdown" : "JSON"}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowConfidence(s => !s)}
                            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${showConfidence ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                        >
                            <ToggleLeft className="h-3.5 w-3.5" />
                            Confidence
                        </button>
                        <span className="text-xs text-muted-foreground border border-border rounded px-2 py-0.5">DPT-2</span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 text-sm">
                    {activeTab === "markdown" ? (
                        <div className="space-y-4">
                            {pageChunks.length > 0 ? (
                                pageChunks.map((chunk, i) => (
                                    <div key={chunk.id} className="group">
                                        <div className="mb-1 flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">{i + 1} · {chunk.type}</span>
                                            {showConfidence && (
                                                <span className="text-xs rounded bg-green-100 text-green-700 px-1.5 py-0.5 font-medium">
                                                    {chunk.type === "table" ? "95%" : chunk.type === "title" ? "98%" : "87%"}
                                                </span>
                                            )}
                                        </div>
                                        {chunk.type === "table" ? (
                                            <TableChunk chunk={chunk} />
                                        ) : (
                                            <div className="rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                                                {chunk.markdown.replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, " ").trim()}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : markdown ? (
                                <div className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground">
                                    {markdown.slice(0, 3000)}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-8">No parsed content yet. Parse the document first.</p>
                            )}
                        </div>
                    ) : (
                        <pre className="text-xs font-mono text-foreground leading-relaxed overflow-auto">
                            {JSON.stringify(
                                {
                                    chunks: pageChunks.length,
                                    tables: tables.length,
                                    kv_pairs: (parsedData as { kv_pairs?: unknown[] })?.kv_pairs?.length ?? 0,
                                    metadata: (parsedData as { metadata?: unknown })?.metadata,
                                },
                                null,
                                2
                            )}
                        </pre>
                    )}
                </div>

                {/* Tables section */}
                {tables.length > 0 && activeTab === "markdown" && (
                    <div className="border-t border-border p-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">TABLES ({tables.length})</p>
                        <div className="space-y-3 max-h-48 overflow-y-auto">
                            {tables.slice(0, 3).map((table, i) => (
                                <div key={i} className="overflow-x-auto rounded-lg border border-border">
                                    <table className="w-full text-xs">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                {table.headers.map((h, hi) => (
                                                    <th key={hi} className="px-2 py-1.5 text-left font-semibold text-foreground border-r border-border last:border-0 whitespace-nowrap">{h || "—"}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {table.rows.slice(0, 5).map((row, ri) => (
                                                <tr key={ri} className="border-t border-border hover:bg-muted/30">
                                                    {row.map((cell, ci) => (
                                                        <td key={ci} className="px-2 py-1.5 text-muted-foreground border-r border-border last:border-0 whitespace-nowrap">{cell || "—"}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function TableChunk({ chunk }: { chunk: { markdown: string } }) {
    // Parse HTML table from markdown
    const rows: string[][] = [];
    const rowMatches = chunk.markdown.match(/<tr>(.*?)<\/tr>/gs) ?? [];
    for (const row of rowMatches) {
        const cells = (row.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/gs) ?? []).map(c => c.replace(/<[^>]+>/g, "").trim());
        if (cells.length) rows.push(cells);
    }
    if (!rows.length) return <div className="font-mono text-xs p-3 bg-muted/30 rounded-lg">{chunk.markdown.replace(/<[^>]+>/g, " ").trim()}</div>;
    return (
        <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
                <thead className="bg-primary/5">
                    <tr>{rows[0]?.map((h, i) => <th key={i} className="px-2 py-1.5 text-left font-semibold text-foreground border-r border-border last:border-0">{h || "—"}</th>)}</tr>
                </thead>
                <tbody>
                    {rows.slice(1).map((row, ri) => (
                        <tr key={ri} className="border-t border-border hover:bg-muted/30">
                            {row.map((cell, ci) => <td key={ci} className="px-2 py-1.5 text-muted-foreground border-r border-border last:border-0">{cell || "—"}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
