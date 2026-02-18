import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { WizardData } from "./useWizard";

interface Props {
  data: WizardData;
  update: (fields: Partial<WizardData>) => void;
}

const INCIDENT_TYPES = [
  { value: "cyber", label: "Cyberattaque / intrusion malveillante", tag: "→ active LOPMI" },
  { value: "operational", label: "Incident opérationnel non malveillant", tag: "" },
  { value: "payment", label: "Incident sur service de paiement", tag: "" },
] as const;

export default function Step1Triage({ data, update }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="detection_datetime">Date et heure de détection</Label>
        <input
          id="detection_datetime"
          type="datetime-local"
          className="w-full border rounded px-3 py-2 text-sm"
          value={data.detection_datetime}
          onChange={(e) => update({ detection_datetime: e.target.value })}
        />
      </div>

      <div className="space-y-3">
        <Label>Nature de l'incident</Label>
        {INCIDENT_TYPES.map((type) => (
          <div
            key={type.value}
            onClick={() => update({ incident_type: type.value })}
            className={`flex items-center justify-between border rounded-lg p-4 cursor-pointer transition-colors ${
              data.incident_type === type.value
                ? "border-green-700 bg-green-50"
                : "border-gray-200 hover:border-gray-400"
            }`}
          >
            <span className="text-sm font-medium">{type.label}</span>
            {type.tag && (
              <span className="text-xs text-green-700 font-medium">{type.tag}</span>
            )}
          </div>
        ))}
      </div>

      <div
        className={`flex items-center justify-between border rounded-lg p-4 cursor-pointer transition-colors ${
          data.personal_data_involved
            ? "border-green-700 bg-green-50"
            : "border-gray-200 hover:border-gray-400"
        }`}
        onClick={() => update({ personal_data_involved: !data.personal_data_involved })}
      >
        <div>
          <p className="text-sm font-medium">
            Des données personnelles sont-elles potentiellement affectées ?
          </p>
          <p className="text-xs text-gray-500 mt-1">→ active l'analyse RGPD</p>
        </div>
        <Checkbox checked={data.personal_data_involved} />
      </div>
    </div>
  );
}
