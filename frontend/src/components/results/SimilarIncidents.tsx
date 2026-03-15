import type { SimilarIncident } from "../../lib/api";
import { LEVEL_COLORS } from "../../lib/severity";

interface Props {
  incidents: SimilarIncident[];
}

export default function SimilarIncidents({ incidents }: Props) {
  if (incidents.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border p-5">
      <h3 className="font-semibold text-gray-900 text-sm mb-3">
        Incidents similaires
      </h3>
      <div className="space-y-3">
        {incidents.map((inc) => {
          const badgeClass = LEVEL_COLORS[inc.global_level] ?? LEVEL_COLORS.non_applicable;
          return (
            <div key={inc.id} className="border rounded-md p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {new Date(inc.created_at).toLocaleDateString("fr-FR")}
                  </span>
                  <span className="text-xs font-medium text-gray-700">
                    {inc.entity_name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
                    {inc.global_level}
                  </span>
                  <span className="text-xs text-gray-400">
                    {Math.round(inc.similarity * 100)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">
                {inc.incident_summary}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
