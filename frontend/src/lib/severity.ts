export const LEVEL_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  majeur: { label: "MAJEUR", bg: "bg-red-600", text: "text-white" },
  significatif: { label: "SIGNIFICATIF", bg: "bg-orange-500", text: "text-white" },
  mineur: { label: "MINEUR", bg: "bg-blue-600", text: "text-white" },
  non_qualifie: { label: "NON QUALIFIÉ", bg: "bg-gray-400", text: "text-white" },
  non_applicable: { label: "NON APPLICABLE", bg: "bg-gray-300", text: "text-gray-700" },
};

export const LEVEL_COLORS: Record<string, string> = {
  majeur: "bg-red-100 text-red-800",
  significatif: "bg-orange-100 text-orange-800",
  mineur: "bg-blue-100 text-blue-800",
  non_applicable: "bg-gray-100 text-gray-600",
};
