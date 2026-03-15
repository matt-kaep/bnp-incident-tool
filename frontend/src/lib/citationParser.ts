export interface CitationRef {
  type: "citation";
  filename: string;
  page: number;
  quote: string;
  label: string; // e.g. "DORA p.12"
}

export interface TextSegment {
  type: "text";
  content: string;
}

export type AnalysisSegment = TextSegment | CitationRef;

const REF_REGEX = /\[REF:([^:]+):(\d+):"([^"]+)"\]/g;

const FILE_LABELS: Record<string, string> = {
  "DORA-CELEX_32022R2554_EN_TXT.pdf": "DORA",
  "RGPD-CELEX_32016R0679_EN_TXT.pdf": "RGPD",
  "LOPMI.pdf": "LOPMI",
};

function getLabel(filename: string, page: number): string {
  const short = FILE_LABELS[filename] ?? filename.replace(/\.pdf$/i, "");
  return `${short} p.${page}`;
}

export function parseAnalysis(text: string): AnalysisSegment[] {
  const segments: AnalysisSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(REF_REGEX)) {
    const matchIndex = match.index!;

    // Add text before this match
    if (matchIndex > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, matchIndex) });
    }

    const [, filename, pageStr, quote] = match;
    const page = parseInt(pageStr, 10);
    segments.push({
      type: "citation",
      filename,
      page,
      quote,
      label: getLabel(filename, page),
    });

    lastIndex = matchIndex + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  // If no citations found, return as single text segment
  if (segments.length === 0) {
    segments.push({ type: "text", content: text });
  }

  return segments;
}
