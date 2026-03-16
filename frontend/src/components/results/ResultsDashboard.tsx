import { useState } from "react";
import type {
  ClassificationData,
  InitialForm,
  ActionItem,
  RegulationClassification,
  SimilarIncident,
} from "../../lib/api";
import { deleteIncident } from "../../lib/api";
import type { AnalysesState } from "../../hooks/useSession";
import { LEVEL_CONFIG } from "../../lib/severity";
import Countdown from "./Countdown";
import RegulationBlock from "./RegulationBlock";
import RegulationAnalysisBlock from "./RegulationAnalysisBlock";
import SimilarIncidents from "./SimilarIncidents";

interface Props {
  result: ClassificationData;
  initialForm: InitialForm;
  onReset: () => void;
  analyses: AnalysesState;
  incidentId: string | null;
  similarIncidents: SimilarIncident[];
  onViewIncident?: (id: string) => void;
}

export default function ResultsDashboard({
  result,
  initialForm,
  onReset,
  analyses,
  incidentId,
  similarIncidents,
  onViewIncident,
}: Props) {
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const globalConfig =
    LEVEL_CONFIG[result.classification.global_level] ?? LEVEL_CONFIG.non_qualifie;

  const regulationKeys = ["dora", "rgpd", "lopmi"] as const;

  const actionsForReg = (reg: string): ActionItem[] =>
    result.actions.filter((a) => a.regulation === reg.toUpperCase());

  const classForReg = (reg: string): RegulationClassification =>
    result.classification[reg as keyof typeof result.classification] as RegulationClassification;

  const handleDelete = async () => {
    if (!incidentId) return;
    if (!window.confirm("Supprimer cet incident de l'historique ?")) return;
    setDeleteError(null);
    try {
      await deleteIncident(incidentId);
      onReset();
    } catch {
      setDeleteError("Impossible de supprimer l'incident.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Severity banner */}
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

      {/* Incident summary */}
      <div className="bg-white rounded-lg border p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Résumé de l'incident</h3>
        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {result.incident_summary}
        </div>
      </div>

      {/* Similar incidents */}
      <SimilarIncidents incidents={similarIncidents} onViewIncident={onViewIncident} />

      {/* Unknown impacts */}
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

      {/* Regulation classification blocks + analysis blocks */}
      {regulationKeys.map((reg) => {
        const r = classForReg(reg);
        const a = analyses[reg];
        if (!r?.applicable) return null;
        return (
          <div key={reg} className="space-y-3">
            <RegulationBlock
              regulation={reg.toUpperCase()}
              result={r}
              actions={actionsForReg(reg)}
            />
            <RegulationAnalysisBlock
              regulation={reg.toUpperCase()}
              analysis={a.result}
              isLoading={a.loading}
              error={a.error}
            />
          </div>
        );
      })}

      {/* Delete error */}
      {deleteError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {deleteError}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 py-2.5 px-6 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Nouvel incident
        </button>
        {incidentId && (
          <button
            onClick={handleDelete}
            className="py-2.5 px-6 border border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors"
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}
