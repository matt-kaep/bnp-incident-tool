import { useState } from "react";
import type { ActionItem, RegulationClassification } from "../../lib/api";

interface Props {
  regulation: string;
  result: RegulationClassification;
  actions: ActionItem[];
}

const LEVEL_COLORS: Record<string, string> = {
  majeur: "bg-red-50 border-red-200",
  significatif: "bg-amber-50 border-amber-200",
  mineur: "bg-blue-50 border-blue-200",
  non_applicable: "bg-gray-50 border-gray-200",
};

const LEVEL_BADGE_COLORS: Record<string, string> = {
  majeur: "bg-red-100 text-red-800",
  significatif: "bg-amber-100 text-amber-800",
  mineur: "bg-blue-100 text-blue-800",
  non_applicable: "bg-gray-100 text-gray-700",
};

const LEVEL_LABELS: Record<string, string> = {
  majeur: "Majeur",
  significatif: "Significatif",
  mineur: "Mineur",
  non_applicable: "Non applicable",
};

const REG_TITLES: Record<string, string> = {
  DORA: "DORA — Digital Operational Resilience Act",
  RGPD: "RGPD — Règlement Général sur la Protection des Données",
  LOPMI: "LOPMI — Loi d'Orientation et de Programmation du Ministère de l'Intérieur",
};

export default function RegulationBlock({ regulation, result, actions }: Props) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  if (!result.applicable) return null;

  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const colorClass = LEVEL_COLORS[result.level] ?? LEVEL_COLORS.non_applicable;
  const badgeClass = LEVEL_BADGE_COLORS[result.level] ?? LEVEL_BADGE_COLORS.non_applicable;
  const levelLabel = LEVEL_LABELS[result.level] ?? result.level;
  const title = REG_TITLES[regulation] ?? regulation;

  return (
    <div className={`rounded-lg border p-5 ${colorClass}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>
          {levelLabel}
        </span>
      </div>

      {result.reasoning && (
        <p className="text-xs text-gray-600 mb-4 leading-relaxed">{result.reasoning}</p>
      )}

      {actions.length > 0 && (
        <div className="space-y-3">
          {actions.map((action, i) => (
            <div key={i} className="flex items-start gap-3">
              <input
                type="checkbox"
                id={`action-${regulation}-${i}`}
                checked={checked.has(i)}
                onChange={() => toggle(i)}
                className="mt-0.5 cursor-pointer"
              />
              <div className="flex-1">
                <label
                  htmlFor={`action-${regulation}-${i}`}
                  className={`text-sm cursor-pointer ${
                    checked.has(i) ? "line-through text-gray-400" : "text-gray-800"
                  }`}
                >
                  {action.action}
                </label>
              </div>
              <span className="text-xs border rounded px-2 py-0.5 text-gray-600 shrink-0">
                {action.deadline_label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
