/**
 * pdf-viewer.tsx
 * Canvas-based PDF viewer using react-pdf with highlight overlay support.
 * Auto-scrolls to the highlighted region after render.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Loader2, FileText, ZoomIn, ZoomOut } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface HighlightBox {
    left: number;
    top: number;
    right: number;
    bottom: number;
    label?: string;
    color?: "yellow" | "blue" | "green";
}

interface PdfViewerProps {
    fileUrl: string;
    pageNumber: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    highlights?: HighlightBox[];
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
    const containerRef = useRef<HTMLDivElement>(null);   // scrollable container
    const canvasWrapRef = useRef<HTMLDivElement>(null);  // wraps the rendered page
    const [containerWidth, setContainerWidth] = useState(600);
    const [renderedWidth, setRenderedWidth] = useState(0);
    const [renderedHeight, setRenderedHeight] = useState(0);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Reset loading on page/scale change
    useEffect(() => { setLoading(true); setRenderedHeight(0); }, [pageNumber, scale, fileUrl]);

    // Measure container width
    useEffect(() => {
        const measure = () => {
            if (containerRef.current) {
                const w = containerRef.current.clientWidth - 16;
                setContainerWidth(w > 100 ? w : 600);
            }
        };
        measure();
        const ro = new ResizeObserver(measure);
        if (containerRef.current) ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    const targetWidth = Math.floor(containerWidth * scale);

    // After the page renders, measure the actual canvas size from the DOM
    const handleRenderSuccess = useCallback(() => {
        setLoading(false);
        // Give the DOM a tick to paint, then measure the actual canvas
        requestAnimationFrame(() => {
            if (canvasWrapRef.current) {
                const canvas = canvasWrapRef.current.querySelector("canvas");
                if (canvas) {
                    const w = canvas.offsetWidth || canvas.width;
                    const h = canvas.offsetHeight || canvas.height;
                    setRenderedWidth(w);
                    setRenderedHeight(h);
                    onPageSize?.(w, h);
                }
            }
        });
    }, [onPageSize]);

    // Auto-scroll to highlight after render
    useEffect(() => {
        if (loading || renderedHeight === 0 || highlights.length === 0) return;
        if (!containerRef.current) return;
        const h = highlights[0];
        const midPx = ((h.top + h.bottom) / 2) * renderedHeight;
        const scrollTarget = 8 + midPx - containerRef.current.clientHeight / 2;
        containerRef.current.scrollTo({ top: Math.max(0, scrollTarget), behavior: "smooth" });
    }, [loading, renderedHeight, highlights]);

    const colorMap = {
        yellow: { bg: "rgba(253,224,71,0.4)", border: "2px solid rgba(234,179,8,1)" },
        blue: { bg: "rgba(59,130,246,0.3)", border: "2px solid rgba(59,130,246,1)" },
        green: { bg: "rgba(34,197,94,0.3)", border: "2px solid rgba(34,197,94,1)" },
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-1.5 shrink-0"
                style={{ backgroundColor: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2">
                    <button onClick={() => onPageChange(Math.max(1, pageNumber - 1))} disabled={pageNumber <= 1}
                        className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors">
                        <ChevronLeft className="h-4 w-4 text-white" />
                    </button>
                    <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>
                        {pageNumber} / {totalPages}
                    </span>
                    <button onClick={() => onPageChange(Math.min(totalPages, pageNumber + 1))} disabled={pageNumber >= totalPages}
                        className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors">
                        <ChevronRight className="h-4 w-4 text-white" />
                    </button>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setScale(s => Math.max(0.5, +(s - 0.2).toFixed(1)))}
                        className="p-1 rounded-lg hover:bg-white/10 transition-colors" title="Zoom out">
                        <ZoomOut className="h-3.5 w-3.5 text-white opacity-60" />
                    </button>
                    <span className="text-xs font-bold w-10 text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {Math.round(scale * 100)}%
                    </span>
                    <button onClick={() => setScale(s => Math.min(2.5, +(s + 0.2).toFixed(1)))}
                        className="p-1 rounded-lg hover:bg-white/10 transition-colors" title="Zoom in">
                        <ZoomIn className="h-3.5 w-3.5 text-white opacity-60" />
                    </button>
                </div>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs underline" style={{ color: "#60a5fa" }}>
                    Open ↗
                </a>
            </div>

            {/* Scrollable PDF area */}
            <div ref={containerRef} className="flex-1 overflow-auto"
                style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
                <div className="flex items-start justify-center p-2">
                    {/* Page wrapper — position:relative so overlay is anchored to it */}
                    <div ref={canvasWrapRef} className="relative inline-block">
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center z-10"
                                style={{ minWidth: targetWidth, minHeight: 400 }}>
                                <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#3b82f6" }} />
                            </div>
                        )}

                        {!error ? (
                            <Document
                                file={fileUrl}
                                onLoadError={() => { setError(true); setLoading(false); }}
                                loading={null}
                            >
                                <Page
                                    pageNumber={pageNumber}
                                    width={targetWidth}
                                    onRenderSuccess={handleRenderSuccess}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                />
                            </Document>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-3 p-8"
                                style={{ minWidth: 300 }}>
                                <FileText className="h-12 w-12 opacity-20" style={{ color: "#60a5fa" }} />
                                <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>
                                    PDF preview unavailable
                                </p>
                                <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                                    className="rounded-xl px-4 py-2 text-sm font-bold text-white"
                                    style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                                    Open PDF ↗
                                </a>
                            </div>
                        )}

                        {/* Highlight overlay — sized to match the actual rendered canvas */}
                        {!loading && renderedWidth > 0 && renderedHeight > 0 && highlights.length > 0 && (
                            <div className="absolute inset-0 pointer-events-none"
                                style={{ width: renderedWidth, height: renderedHeight }}>
                                {highlights.map((h, idx) => {
                                    const x = h.left * renderedWidth;
                                    const y = h.top * renderedHeight;
                                    const w = (h.right - h.left) * renderedWidth;
                                    const ht = (h.bottom - h.top) * renderedHeight;
                                    const c = colorMap[h.color ?? "yellow"];
                                    return (
                                        <div key={idx} className="absolute rounded-sm"
                                            style={{
                                                left: x,
                                                top: y,
                                                width: Math.max(w, 20),
                                                height: Math.max(ht, 14),
                                                backgroundColor: c.bg,
                                                border: c.border,
                                                boxShadow: "0 0 12px rgba(253,224,71,0.7)",
                                                animation: "pulse-hl 1s ease-in-out 4",
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

            <style>{`
                @keyframes pulse-hl {
                    0%,100% { opacity:1; }
                    50%     { opacity:0.25; }
                }
            `}</style>
        </div>
    );
}
