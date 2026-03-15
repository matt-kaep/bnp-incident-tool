import { useEffect, useState } from "react";
import type { IncidentSummaryItem } from "../../lib/api";
import { listIncidents, deleteIncident } from "../../lib/api";
import { LEVEL_COLORS } from "../../lib/severity";

interface Props {
  onSelectIncident: (id: string) => void;
}

export default function IncidentList({ onSelectIncident }: Props) {
  const [incidents, setIncidents] = useState<IncidentSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listIncidents();
      setIncidents(data);
    } catch {
      setError("Impossible de charger l'historique.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Supprimer cet incident ?")) return;
    try {
      await deleteIncident(id);
      setIncidents((prev) => prev.filter((inc) => inc.id !== id));
    } catch {
      setError("Impossible de supprimer l'incident.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
        Chargement de l'historique...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">Aucun incident enregistré.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Historique des incidents</h2>
      {incidents.map((inc) => {
        const badgeClass = LEVEL_COLORS[inc.global_level] ?? LEVEL_COLORS.non_applicable;
        return (
          <div
            key={inc.id}
            onClick={() => onSelectIncident(inc.id)}
            className="bg-white rounded-lg border p-4 cursor-pointer hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {new Date(inc.created_at).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-sm font-medium text-gray-800">
                  {inc.entity_name}
                </span>
                <span className="text-xs text-gray-500">
                  {inc.incident_types.join(", ")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>
                  {inc.global_level}
                </span>
                <button
                  onClick={(e) => handleDelete(inc.id, e)}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
