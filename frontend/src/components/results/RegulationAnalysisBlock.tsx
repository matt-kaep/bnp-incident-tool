import { useState } from "react";
import type { RegulationAnalysis } from "../../lib/api";
import { parseAnalysis, type CitationRef } from "../../lib/citationParser";
import PdfPreviewModal from "./PdfPreviewModal";

interface Props {
  regulation: string;
  analysis: RegulationAnalysis | null;
  isLoading: boolean;
  error: string | null;
}

const REG_TITLES: Record<string, string> = {
  DORA: "Analyse DORA",
  RGPD: "Analyse RGPD",
  LOPMI: "Analyse LOPMI",
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export default function RegulationAnalysisBlock({ regulation, analysis, isLoading, error }: Props) {
  const [pdfModal, setPdfModal] = useState<{
    open: boolean;
    url: string;
    page: number;
    quote: string;
    label: string;
  }>({ open: false, url: "", page: 1, quote: "", label: "" });

  const title = REG_TITLES[regulation] ?? `Analyse ${regulation}`;

  if (!isLoading && !analysis && !error) return null;

  const openCitation = (ref: CitationRef) => {
    setPdfModal({
      open: true,
      url: `${API_BASE}/docs/${encodeURIComponent(ref.filename)}`,
      page: ref.page,
      quote: ref.quote,
      label: ref.label,
    });
  };

  const segments = analysis ? parseAnalysis(analysis.analysis) : [];

  return (
    <>
      <div className="bg-white rounded-lg border p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-3">{title}</h3>

        {isLoading && (
          <div className="flex items-center gap-3 text-sm text-gray-500 py-4">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Analyse en cours — enrichissement avec les textes réglementaires...
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
        )}

        {analysis && !isLoading && (
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {segments.map((seg, i) =>
              seg.type === "text" ? (
                <span key={i}>{seg.content}</span>
              ) : (
                <button
                  key={i}
                  onClick={() => openCitation(seg)}
                  className="inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded border border-blue-200 transition-colors cursor-pointer align-baseline"
                  title={`"${seg.quote}"`}
                >
                  <span className="text-[10px]">&#128196;</span>
                  {seg.label}
                </button>
              )
            )}
          </div>
        )}
      </div>

      <PdfPreviewModal
        isOpen={pdfModal.open}
        onClose={() => setPdfModal((s) => ({ ...s, open: false }))}
        pdfUrl={pdfModal.url}
        targetPage={pdfModal.page}
        highlightText={pdfModal.quote}
        label={pdfModal.label}
      />
    </>
  );
}
