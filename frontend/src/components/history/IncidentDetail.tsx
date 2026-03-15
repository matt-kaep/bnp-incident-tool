import { useEffect, useState } from "react";
import type { IncidentRecord } from "../../lib/api";
import { getIncident } from "../../lib/api";
import { LEVEL_CONFIG } from "../../lib/severity";

interface Props {
  incidentId: string;
  onBack: () => void;
}

export default function IncidentDetail({ incidentId, onBack }: Props) {
  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getIncident(incidentId)
      .then(setIncident)
      .catch(() => setError("Impossible de charger l'incident."))
      .finally(() => setLoading(false));
  }, [incidentId]);

  if (loading) {
    return <div className="py-12 text-center text-gray-500 text-sm">Chargement...</div>;
  }

  if (error || !incident) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-500 text-sm">{error ?? "Incident introuvable."}</p>
        <button onClick={onBack} className="mt-4 text-sm text-blue-600 hover:text-blue-800">
          &larr; Retour à l'historique
        </button>
      </div>
    );
  }

  const classification = incident.classification;
  const globalLevel = (classification?.global_level as string) ?? "non_qualifie";
  const globalConfig = LEVEL_CONFIG[globalLevel] ?? LEVEL_CONFIG.non_qualifie;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        &larr; Retour à l'historique
      </button>

      {/* Severity banner */}
      <div className={`${globalConfig.bg} rounded-lg p-5`}>
        <p className={`text-xs font-semibold uppercase tracking-wide ${globalConfig.text} opacity-75`}>
          Niveau de gravité global
        </p>
        <p className={`text-2xl font-bold ${globalConfig.text} mt-1`}>
          {globalConfig.label}
        </p>
        <p className={`text-xs ${globalConfig.text} opacity-75 mt-1`}>
          {incident.initial_form?.entity_name} — {new Date(incident.created_at).toLocaleDateString("fr-FR")}
        </p>
      </div>

      {/* Incident summary */}
      <div className="bg-white rounded-lg border p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Résumé de l'incident</h3>
        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {incident.incident_summary}
        </div>
      </div>

      {/* Actions */}
      {incident.actions.length > 0 && (
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Actions requises</h3>
          <div className="space-y-2">
            {incident.actions.map((action, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{action.action as string}</span>
                <span className="text-xs border rounded px-2 py-0.5 text-gray-500">
                  {action.deadline_label as string}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regulation analyses */}
      {incident.analyses && ["dora", "rgpd", "lopmi"].map((reg) => {
        const text = incident.analyses[reg];
        if (!text) return null;
        return (
          <div key={reg} className="bg-white rounded-lg border p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">
              Analyse {reg.toUpperCase()}
            </h3>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {text}
            </div>
          </div>
        );
      })}
    </div>
  );
}
