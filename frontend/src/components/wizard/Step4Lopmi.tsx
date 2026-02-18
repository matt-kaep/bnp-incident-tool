import { Label } from "@/components/ui/label";
import type { WizardData } from "./useWizard";

interface Props {
  data: WizardData;
  update: (fields: Partial<WizardData>) => void;
}

export default function Step4Lopmi({ data, update }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-gray-50 border rounded p-3">
        La loi LOPMI impose le dépôt de plainte dans les 72h pour que la couverture
        assurance cyber soit activée en cas d'intrusion avérée.
      </p>

      <div className="space-y-2">
        <Label className="text-sm">
          L'intrusion dans les systèmes est-elle avérée et confirmée ?
        </Label>
        <div className="flex gap-3">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => update({ lopmi_intrusion_confirmed: v })}
              className={`px-6 py-2 rounded-lg border text-sm font-medium transition-colors ${
                data.lopmi_intrusion_confirmed === v
                  ? "bg-green-700 text-white border-green-700"
                  : "border-gray-300 hover:border-gray-500"
              }`}
            >
              {v ? "Oui" : "Non"}
            </button>
          ))}
        </div>
      </div>

      {data.lopmi_intrusion_confirmed === true && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          Dépôt de plainte obligatoire sous 72h. Utiliser le modèle disponible sur le Sharepoint interne.
        </p>
      )}
    </div>
  );
}
