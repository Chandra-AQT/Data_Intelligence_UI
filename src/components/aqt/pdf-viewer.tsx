/**
 * pdf-viewer.tsx — Canvas PDF viewer with highlight overlay.
 * Uses react-pdf. Highlights are normalized 0-1 bounding boxes.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Loader2, FileText, ZoomIn, ZoomOut } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
}

export function PdfViewer({ fileUrl, pageNumber, totalPages, onPageChange, highlights = [] }: PdfViewerProps) {
    const scrollRef = useRef<HTMLDivElement>(null);   // scrollable container
    const wrapRef = useRef<HTMLDivElement>(null);   // page + overlay wrapper
    const [containerW, setContainerW] = useState(600);
    const [canvasW, setCanvasW] = useState(0);
    const [canvasH, setCanvasH] = useState(0);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Measure container width
    useEffect(() => {
        const measure = () => {
            if (scrollRef.current) setContainerW(Math.max(200, scrollRef.current.clientWidth - 16));
        };
        measure();
        const ro = new ResizeObserver(measure);
        if (scrollRef.current) ro.observe(scrollRef.current);
        return () => ro.disconnect();
    }, []);

    // Reset loading when page/scale/file changes
    useEffect(() => { setLoading(true); }, [pageNumber, scale, fileUrl]);

    const targetW = Math.floor(containerW * scale);

    // After render: measure actual canvas pixel size
    const onRender = useCallback(() => {
        setLoading(false);
        requestAnimationFrame(() => {
            const canvas = wrapRef.current?.querySelector("canvas");
            if (canvas) {
                setCanvasW(canvas.offsetWidth || canvas.width);
                setCanvasH(canvas.offsetHeight || canvas.height);
            }
        });
    }, []);

    // Auto-scroll to highlight center after render
    useEffect(() => {
        if (loading || canvasH === 0 || highlights.length === 0 || !scrollRef.current) return;
        const h = highlights[0];
        // Normalize if pixel coords
        const nt = h.top > 1 ? h.top / canvasH : h.top;
        const nb = h.bottom > 1 ? h.bottom / canvasH : h.bottom;
        const midPx = ((nt + nb) / 2) * canvasH;
        const target = 8 + midPx - scrollRef.current.clientHeight / 2;
        scrollRef.current.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
    }, [loading, canvasH, highlights]);

    const colors = {
        yellow: { bg: "rgba(253,224,71,0.4)", border: "2px solid rgba(234,179,8,1)" },
        blue: { bg: "rgba(59,130,246,0.3)", border: "2px solid rgba(59,130,246,1)" },
        green: { bg: "rgba(34,197,94,0.3)", border: "2px solid rgba(34,197,94,1)" },
    };

    return (
        <div className="flex flex-col h-full">
            {/* ── Toolbar ── */}
            <div className="flex items-center justify-between px-3 py-1.5 shrink-0"
                style={{ backgroundColor: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

                {/* Page nav */}
                <div className="flex items-center gap-1">
                    <button onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
                        disabled={pageNumber <= 1}
                        className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors">
                        <ChevronLeft className="h-4 w-4 text-white" />
                    </button>
                    <span className="text-xs font-bold px-1 min-w-[60px] text-center"
                        style={{ color: "rgba(255,255,255,0.5)" }}>
                        {pageNumber} / {totalPages}
                    </span>
                    <button onClick={() => onPageChange(Math.min(totalPages, pageNumber + 1))}
                        disabled={pageNumber >= totalPages}
                        className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors">
                        <ChevronRight className="h-4 w-4 text-white" />
                    </button>
                </div>

                {/* Zoom */}
                <div className="flex items-center gap-1">
                    <button onClick={() => setScale(s => Math.max(0.5, +(s - 0.2).toFixed(1)))}
                        className="p-1 rounded hover:bg-white/10 transition-colors" title="Zoom out">
                        <ZoomOut className="h-3.5 w-3.5 text-white opacity-60" />
                    </button>
                    <span className="text-xs font-bold w-10 text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {Math.round(scale * 100)}%
                    </span>
                    <button onClick={() => setScale(s => Math.min(2.5, +(s + 0.2).toFixed(1)))}
                        className="p-1 rounded hover:bg-white/10 transition-colors" title="Zoom in">
                        <ZoomIn className="h-3.5 w-3.5 text-white opacity-60" />
                    </button>
                </div>

                <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs underline" style={{ color: "#60a5fa" }}>
                    Open ↗
                </a>
            </div>

            {/* ── Scrollable PDF area ── */}
            <div ref={scrollRef} className="flex-1 overflow-auto"
                style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
                <div className="flex justify-center p-2">
                    <div ref={wrapRef} className="relative inline-block">

                        {/* Loading spinner */}
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center z-10"
                                style={{ minWidth: targetW, minHeight: 400 }}>
                                <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#3b82f6" }} />
                            </div>
                        )}

                        {/* PDF canvas */}
                        {!error ? (
                            <Document
                                file={fileUrl}
                                onLoadError={() => { setError(true); setLoading(false); }}
                                loading={null}
                            >
                                <Page
                                    pageNumber={pageNumber}
                                    width={targetW}
                                    onRenderSuccess={onRender}
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

                        {/* Highlight overlay */}
                        {!loading && canvasW > 0 && canvasH > 0 && highlights.length > 0 && (
                            <div className="absolute inset-0 pointer-events-none"
                                style={{ width: canvasW, height: canvasH }}>
                                {highlights.map((h, idx) => {
                                    // Normalize pixel coords → 0-1 if needed
                                    let l = h.left, t = h.top, r = h.right, b = h.bottom;
                                    if (r > 1 || b > 1) {
                                        l = l / canvasW; t = t / canvasH;
                                        r = r / canvasW; b = b / canvasH;
                                    }
                                    if (r <= l || b <= t) return null;
                                    const c = colors[h.color ?? "yellow"];
                                    return (
                                        <div key={idx} className="absolute rounded-sm"
                                            style={{
                                                left: l * canvasW,
                                                top: t * canvasH,
                                                width: Math.max((r - l) * canvasW, 20),
                                                height: Math.max((b - t) * canvasH, 14),
                                                backgroundColor: c.bg,
                                                border: c.border,
                                                boxShadow: "0 0 14px rgba(253,224,71,0.8)",
                                                animation: "hl-pulse 1s ease-in-out 4",
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
                @keyframes hl-pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }
            `}</style>
        </div>
    );
}
