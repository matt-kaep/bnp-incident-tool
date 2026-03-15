import { useState, useCallback, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  targetPage: number;
  highlightText: string;
  label: string;
}

export default function PdfPreviewModal({
  isOpen,
  onClose,
  pdfUrl,
  targetPage,
  highlightText,
  label,
}: Props) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(targetPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPage(targetPage);
  }, [targetPage]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback(() => {
    setError("Impossible de charger le document PDF.");
    setLoading(false);
  }, []);

  // Highlight matching text in the text layer after render
  const onPageRenderSuccess = useCallback(() => {
    if (!highlightText || !containerRef.current) return;

    // Wait for text layer to be populated
    requestAnimationFrame(() => {
      const textLayer = containerRef.current?.querySelector(".react-pdf__Page__textContent");
      if (!textLayer) return;

      const spans = textLayer.querySelectorAll("span");
      const searchLower = highlightText.toLowerCase();

      // Build full text and find match position
      let fullText = "";
      const spanRanges: { start: number; end: number; span: Element }[] = [];

      spans.forEach((span) => {
        const start = fullText.length;
        fullText += span.textContent ?? "";
        spanRanges.push({ start, end: fullText.length, span });
      });

      const matchIdx = fullText.toLowerCase().indexOf(searchLower);
      if (matchIdx === -1) return;

      const matchEnd = matchIdx + searchLower.length;

      // Highlight spans that overlap with the match
      for (const { start, end, span } of spanRanges) {
        if (start < matchEnd && end > matchIdx) {
          (span as HTMLElement).style.backgroundColor = "rgba(250, 204, 21, 0.4)";
          (span as HTMLElement).style.borderRadius = "2px";

          // Scroll first highlighted span into view
          if (start <= matchIdx) {
            span.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }
    });
  }, [highlightText]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-900">{label}</span>
            {numPages > 0 && (
              <span className="text-xs text-gray-500">
                Page {currentPage} / {numPages}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Page navigation */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-2 py-1 text-xs rounded border hover:bg-gray-100 disabled:opacity-30"
            >
              &larr;
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages}
              className="px-2 py-1 text-xs rounded border hover:bg-gray-100 disabled:opacity-30"
            >
              &rarr;
            </button>
            {/* Close */}
            <button
              onClick={onClose}
              className="ml-2 px-2 py-1 text-gray-500 hover:text-gray-800 text-lg font-bold"
            >
              &times;
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div ref={containerRef} className="flex-1 overflow-auto bg-gray-100 flex justify-center p-4">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          ) : (
            <>
              {loading && (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading=""
              >
                <Page
                  pageNumber={currentPage}
                  width={Math.min(800, window.innerWidth * 0.8)}
                  onRenderSuccess={onPageRenderSuccess}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
            </>
          )}
        </div>

        {/* Highlighted quote footer */}
        {highlightText && (
          <div className="px-5 py-2 border-t bg-yellow-50 text-xs text-gray-600">
            <span className="font-medium">Citation :</span> &ldquo;{highlightText}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}
