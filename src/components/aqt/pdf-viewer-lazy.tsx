/**
 * pdf-viewer-lazy.tsx
 * Lazy wrapper for PdfViewer — code-splits react-pdf out of the main bundle.
 * Use this instead of importing PdfViewer directly.
 */
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { HighlightBox } from "./pdf-viewer";

const PdfViewerInner = lazy(() =>
    import("./pdf-viewer").then(m => ({ default: m.PdfViewer }))
);

interface PdfViewerLazyProps {
    fileUrl: string;
    pageNumber: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    highlights?: HighlightBox[];
    onPageSize?: (width: number, height: number) => void;
}

export function PdfViewerLazy(props: PdfViewerLazyProps) {
    return (
        <Suspense
            fallback={
                <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#3b82f6" }} />
                </div>
            }
        >
            <PdfViewerInner {...props} />
        </Suspense>
    );
}

export type { HighlightBox };
