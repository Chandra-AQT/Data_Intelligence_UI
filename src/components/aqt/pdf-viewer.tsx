/**
 * pdf-viewer.tsx
 * Canvas-based PDF viewer using react-pdf with highlight overlay support.
 * Highlights are drawn as absolutely-positioned divs over the rendered page,
 * using normalized bounding box coordinates (0–1) from the parser's grounding data.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, Loader2, FileText, ZoomIn, ZoomOut } from "lucide-react";

// Use the bundled worker from pdfjs-dist
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
).toString();

export interface HighlightBox {
    /** Normalized coords 0–1 */
    left: number;
    top: number;
    right: number;
    bottom: number;
    /** Label shown in tooltip */
    label?: string;
    color?: "yellow" | "blue" | "green";
}

interface PdfViewerProps {
    fileUrl: string;
    pageNumber: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    highlights?: HighlightBox[];
    /** Called when the rendered page dimensions change */
    onPageSize?: (width: number, height: number) => void;
}

export function PdfViewer({
    fileUrl,
    pageNumber,
    totalPages,
    onPageChange,
    highlights = [],
    onPageSize,
}: PdfViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(600);
    const [pageHeight, setPageHeight] = useState(0);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Measure container width on mount and resize
    useEffect(() => {
        const measure = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.clientWidth - 8);
            }
        };
        measure();
        const ro = new ResizeObserver(measure);
        if (containerRef.current) ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    const renderedWidth = containerWidth * scale;

    const handlePageLoadSuccess = useCallback(
        ({ width, height }: { width: number; height: number }) => {
            setLoading(false);
            // react-pdf gives natural page size; actual rendered size = width * (containerWidth / width) * scale
            const rendered = containerWidth * scale;
            const renderedH = (height / width) * rendered;
            setPageHeight(renderedH);
            onPageSize?.(rendered, renderedH);
        },
        [containerWidth, scale, onPageSize]
    );

    const colorMap = {
        yellow: { bg: "rgba(253,224,71,0.35)", border: "2px solid rgba(234,179,8,0.9)" },
        blue: { bg: "rgba(59,130,246,0.25)", border: "2px solid rgba(59,130,246,0.9)" },
        green: { bg: "rgba(34,197,94,0.25)", border: "2px solid rgba(34,197,94,0.9)" },
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div
                className="flex items-center justify-between px-3 py-1.5 shrink-0"
                style={{ backgroundColor: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
                {/* Page nav */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
                        disabled={pageNumber <= 1}
                        className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4 text-white" />
                    </button>
                    <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>
                        {pageNumber} / {totalPages}
                    </span>
                    <button
                        onClick={() => onPageChange(Math.min(totalPages, pageNumber + 1))}
                        disabled={pageNumber >= totalPages}
                        className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight className="h-4 w-4 text-white" />
                    </button>
                </div>

                {/* Zoom */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setScale(s => Math.max(0.5, +(s - 0.2).toFixed(1)))}
                        className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                        title="Zoom out"
                    >
                        <ZoomOut className="h-3.5 w-3.5 text-white opacity-60" />
                    </button>
                    <span className="text-xs font-bold w-10 text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {Math.round(scale * 100)}%
                    </span>
                    <button
                        onClick={() => setScale(s => Math.min(2.5, +(s + 0.2).toFixed(1)))}
                        className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                        title="Zoom in"
                    >
                        <ZoomIn className="h-3.5 w-3.5 text-white opacity-60" />
                    </button>
                </div>

                {/* Open in tab */}
                <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline"
                    style={{ color: "#60a5fa" }}
                >
                    Open ↗
                </a>
            </div>

            {/* PDF canvas + overlay */}
            <div ref={containerRef} className="flex-1 overflow-auto" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
                <div className="flex items-start justify-center p-3">
                    <div className="relative" style={{ width: renderedWidth, minHeight: pageHeight || 500 }}>
                        {/* Loading spinner */}
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#3b82f6" }} />
                            </div>
                        )}

                        {/* react-pdf Document + Page */}
                        {!error ? (
                            <Document
                                file={fileUrl}
                                onLoadError={() => { setError(true); setLoading(false); }}
                                loading={null}
                            >
                                <Page
                                    pageNumber={pageNumber}
                                    width={renderedWidth}
                                    onLoadSuccess={handlePageLoadSuccess}
                                    onRenderSuccess={() => setLoading(false)}
                                    renderTextLayer={true}
                                    renderAnnotationLayer={false}
                                />
                            </Document>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
                                <FileText className="h-12 w-12 opacity-20" style={{ color: "#60a5fa" }} />
                                <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>
                                    PDF preview unavailable
                                </p>
                                <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white"
                                    style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}
                                >
                                    Open PDF ↗
                                </a>
                            </div>
                        )}

                        {/* Highlight overlay — rendered on top of the PDF canvas */}
                        {!loading && pageHeight > 0 && highlights.length > 0 && (
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{ width: renderedWidth, height: pageHeight }}
                            >
                                {highlights.map((h, idx) => {
                                    const x = h.left * renderedWidth;
                                    const y = h.top * pageHeight;
                                    const w = (h.right - h.left) * renderedWidth;
                                    const ht = (h.bottom - h.top) * pageHeight;
                                    const c = colorMap[h.color ?? "yellow"];
                                    return (
                                        <div
                                            key={idx}
                                            className="absolute rounded-sm"
                                            style={{
                                                left: x,
                                                top: y,
                                                width: Math.max(w, 20),
                                                height: Math.max(ht, 12),
                                                backgroundColor: c.bg,
                                                border: c.border,
                                                boxShadow: "0 0 8px rgba(253,224,71,0.5)",
                                                animation: "pulse-highlight 1.5s ease-in-out 3",
                                                zIndex: 20,
                                            }}
                                            title={h.label}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Pulse animation keyframes injected once */}
            <style>{`
        @keyframes pulse-highlight {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
        </div>
    );
}
