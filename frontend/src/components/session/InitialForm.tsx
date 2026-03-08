import { useState } from "react";
import type { InitialForm as InitialFormData } from "../../lib/api";

interface Props {
  onSubmit: (form: InitialFormData) => void;
  loading: boolean;
}

export default function InitialForm({ onSubmit, loading }: Props) {
  const now = new Date();
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const [detectionDatetime, setDetectionDatetime] = useState(localIso);
  const [incidentTypes, setIncidentTypes] = useState<string[]>([]);
  const [entityName, setEntityName] = useState("");
  const [entityType, setEntityType] = useState("");
  const [personalData, setPersonalData] = useState<"yes" | "no" | "unknown">("unknown");
  const [dataVolume, setDataVolume] = useState("");
  const [crossBorder, setCrossBorder] = useState<"yes" | "no" | "unknown">("unknown");
  const [csirtSeverity, setCsirtSeverity] = useState("");
  const [servicenow, setServicenow] = useState("");
  const [description, setDescription] = useState("");

  const today = new Date();
  const detection = new Date(detectionDatetime);
  const diffMs = today.getTime() - detection.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.floor((diffMs % 3600000) / 60000);
  const durationLabel =
    diffMs > 0 ? `${diffH}h ${diffM}min depuis la détection` : "Date future";

  const toggleType = (type: string) => {
    setIncidentTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityName || incidentTypes.length === 0) return;
    onSubmit({
      detection_datetime: detectionDatetime,
      incident_types: incidentTypes,
      entity_name: entityName,
      entity_type: entityType || undefined,
      personal_data_involved: personalData,
      data_volume_estimate: dataVolume || undefined,
      cross_border: crossBorder,
      csirt_severity: (csirtSeverity as "low" | "moderate" | "serious" | "extreme") || undefined,
      servicenow_ticket: servicenow || undefined,
      description,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg border p-6 space-y-5">
        <h2 className="text-lg font-semibold text-gray-900">
          Informations initiales sur l'incident
        </h2>

        {/* Dates */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date et heure de détection <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={detectionDatetime}
              onChange={(e) => setDetectionDatetime(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex flex-col justify-end">
            <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-sm">
              <div className="text-blue-600 font-medium">
                Aujourd'hui :{" "}
                {today.toLocaleDateString("fr-FR")}{" "}
                {today.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="text-blue-800 font-semibold mt-1">{durationLabel}</div>
            </div>
          </div>
        </div>

        {/* Nature de l'incident */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nature de l'incident <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {[
              {
                value: "cyber",
                label: "Cyber Security Incident (cyberattaque, intrusion, ransomware…)",
              },
              {
                value: "data_breach",
                label: "Data Breach (violation ou exposition de données)",
              },
              {
                value: "tech_failure",
                label: "Technology Failure (panne, défaillance technique)",
              },
            ].map(({ value, label }) => (
              <label key={value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incidentTypes.includes(value)}
                  onChange={() => toggleType(value)}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Entité */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entité BNP Paribas touchée <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              placeholder="Ex: BNP Paribas SA, Cetelem, Cardif…"
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type d'entité
            </label>
            <input
              type="text"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              placeholder="Ex: IT, Risk, Compliance, RH…"
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Données personnelles */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Données personnelles potentiellement affectées ?{" "}
            <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            {(["yes", "no", "unknown"] as const).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setPersonalData(val)}
                className={`px-4 py-2 rounded-md text-sm border font-medium transition-colors ${
                  personalData === val
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {val === "yes" ? "Oui" : val === "no" ? "Non" : "Je ne sais pas"}
              </button>
            ))}
          </div>
        </div>

        {/* Volume et transfrontalier */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Volume estimé (données / personnes)
            </label>
            <input
              type="text"
              value={dataVolume}
              onChange={(e) => setDataVolume(e.target.value)}
              placeholder="Ex: ~10 000 clients, 500 enregistrements"
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Impact transfrontalier (&gt;1 pays UE) ?
            </label>
            <div className="flex gap-3">
              {(["yes", "no", "unknown"] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCrossBorder(val)}
                  className={`px-3 py-1.5 rounded-md text-sm border font-medium transition-colors ${
                    crossBorder === val
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {val === "yes" ? "Oui" : val === "no" ? "Non" : "Incertain"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CSIRT et ServiceNow */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sévérité CSIRT (si déjà évaluée)
            </label>
            <select
              value={csirtSeverity}
              onChange={(e) => setCsirtSeverity(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Non évaluée</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="serious">Serious</option>
              <option value="extreme">Extreme</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro de ticket ServiceNow
            </label>
            <input
              type="text"
              value={servicenow}
              onChange={(e) => setServicenow(e.target.value)}
              placeholder="INC0001234"
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Description libre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description de l'incident
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Décrivez l'incident ou collez ici une alerte, un email CSIRT ou un résumé reçu.
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Ex: Alerte CSIRT reçue — activité suspecte sur serveur XYZ, exfiltration potentielle de données clients…"
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !entityName || incidentTypes.length === 0}
        className="w-full py-3 px-6 bg-blue-700 text-white font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Analyse en cours..." : "Analyser l'incident"}
      </button>
    </form>
  );
}
