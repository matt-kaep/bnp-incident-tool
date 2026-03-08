import { useState } from "react";
import type { ClassificationData, InitialForm, ActionItem, RegulationClassification } from "../../lib/api";
import { sessionRefine } from "../../lib/api";
import Countdown from "./Countdown";
import RegulationBlock from "./RegulationBlock";

interface Props {
  result: ClassificationData;
  initialForm: InitialForm;
  onReset: () => void;
}

const LEVEL_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  majeur: { label: "MAJEUR", bg: "bg-red-600", text: "text-white" },
  significatif: { label: "SIGNIFICATIF", bg: "bg-orange-500", text: "text-white" },
  mineur: { label: "MINEUR", bg: "bg-blue-600", text: "text-white" },
  non_qualifie: { label: "NON QUALIFIÉ", bg: "bg-gray-400", text: "text-white" },
  non_applicable: { label: "NON APPLICABLE", bg: "bg-gray-300", text: "text-gray-700" },
};

export default function ResultsDashboard({ result, initialForm, onReset }: Props) {
  const [narrative, setNarrative] = useState(result.narrative);
  const [refining, setRefining] = useState(false);

  const globalConfig =
    LEVEL_CONFIG[result.classification.global_level] ?? LEVEL_CONFIG.non_qualifie;

  const handleRefine = async () => {
    setRefining(true);
    try {
      const res = await sessionRefine(
        JSON.stringify(result.classification),
        initialForm.description
      );
      setNarrative(res.narrative);
    } catch {
      // fail silently
    } finally {
      setRefining(false);
    }
  };

  // Grouper les actions par réglementation
  const regulationKeys = ["dora", "rgpd", "lopmi"] as const;

  const actionsForReg = (reg: string): ActionItem[] =>
    result.actions.filter((a) => a.regulation === reg.toUpperCase());

  const classForReg = (reg: string): RegulationClassification =>
    result.classification[reg as keyof typeof result.classification] as RegulationClassification;

  return (
    <div className="space-y-6">
      {/* Bandeau gravité */}
      <div className={`${globalConfig.bg} rounded-lg p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${globalConfig.text} opacity-75`}>
              Niveau de gravité global
            </p>
            <p className={`text-2xl font-bold ${globalConfig.text} mt-1`}>
              {globalConfig.label}
            </p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {regulationKeys.map((reg) => {
                const r = classForReg(reg);
                return r?.applicable ? (
                  <span
                    key={reg}
                    className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-medium uppercase"
                  >
                    {reg}
                  </span>
                ) : null;
              })}
            </div>
          </div>
          {result.first_deadline_hours && (
            <Countdown
              detectionDatetime={initialForm.detection_datetime}
              firstDeadlineHours={result.first_deadline_hours}
            />
          )}
        </div>
      </div>

      {/* Données manquantes */}
      {result.unknown_impacts && result.unknown_impacts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-semibold text-orange-800 text-sm mb-2">
            Informations manquantes — impact sur la qualification
          </h3>
          <ul className="space-y-2">
            {result.unknown_impacts.map((ui, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium text-orange-900">{ui.field} :</span>{" "}
                <span className="text-orange-700">{ui.impact}</span>
                {ui.action_required && (
                  <div className="text-orange-600 text-xs mt-0.5">
                    Action : {ui.action_required}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Blocs par réglementation */}
      {regulationKeys.map((reg) => {
        const r = classForReg(reg);
        if (!r?.applicable) return null;
        return (
          <RegulationBlock
            key={reg}
            regulation={reg.toUpperCase()}
            result={r}
            actions={actionsForReg(reg)}
          />
        );
      })}

      {/* Narrative LLM */}
      <div className="bg-white rounded-lg border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Analyse juridique</h3>
          <button
            onClick={handleRefine}
            disabled={refining}
            className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-3 py-1 disabled:opacity-50 transition-colors"
          >
            {refining ? "Enrichissement..." : "Plus de précision avec les textes de loi"}
          </button>
        </div>
        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {narrative}
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        className="w-full py-2.5 px-6 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
      >
        Nouvel incident
      </button>
    </div>
  );
}
