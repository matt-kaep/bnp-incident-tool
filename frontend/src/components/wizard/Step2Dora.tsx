import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { WizardData } from "./useWizard";

const PRIMARY = [
  { value: "critical_functions", label: "Affecte des services/systèmes ICT supportant des fonctions critiques ou importantes" },
  { value: "supervised_financial", label: "Affecte des services financiers soumis à autorisation, enregistrement ou supervision" },
  { value: "malicious_access", label: "Constitue un accès réussi, malveillant et non autorisé aux systèmes" },
];

const THRESHOLDS = [
  { value: "clients", label: "Impact sur clients, contreparties financières ou transactions" },
  { value: "reputational", label: "Impact réputationnel (médias, plaintes, régulateur)" },
  { value: "duration", label: "Durée > 24h ou indisponibilité service critique > 2h" },
  { value: "geographic", label: "Impact dans ≥ 2 États membres de l'UE" },
  { value: "economic", label: "Impact économique estimé > 100 000€" },
  { value: "data_loss", label: "Perte ou impact sur l'intégrité / disponibilité / confidentialité des données" },
];

interface Props {
  data: WizardData;
  update: (fields: Partial<WizardData>) => void;
}

function toggle(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

export default function Step2Dora({ data, update }: Props) {
  const primary = data.primary_criteria ?? [];
  const thresholds = data.materiality_thresholds ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-semibold">
          Critère primaire — cocher au moins 1
        </Label>
        {PRIMARY.map((c) => (
          <div key={c.value} className="flex items-start gap-3">
            <Checkbox
              id={c.value}
              checked={primary.includes(c.value)}
              onCheckedChange={() =>
                update({ primary_criteria: toggle(primary, c.value) })
              }
            />
            <Label htmlFor={c.value} className="text-sm leading-snug cursor-pointer">
              {c.label}
            </Label>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-semibold">
          Seuils de matérialité — cocher ≥ 2 pour qualification "majeur"
        </Label>
        <p className="text-xs text-gray-500">
          Seuils cochés : {thresholds.length}/6
        </p>
        {THRESHOLDS.map((t) => (
          <div key={t.value} className="flex items-start gap-3">
            <Checkbox
              id={t.value}
              checked={thresholds.includes(t.value)}
              onCheckedChange={() =>
                update({ materiality_thresholds: toggle(thresholds, t.value) })
              }
            />
            <Label htmlFor={t.value} className="text-sm leading-snug cursor-pointer">
              {t.label}
            </Label>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 border rounded-lg p-3 bg-amber-50 border-amber-200">
        <Checkbox
          id="is_recurring"
          checked={data.is_recurring}
          onCheckedChange={(v) => update({ is_recurring: !!v })}
        />
        <Label htmlFor="is_recurring" className="text-sm cursor-pointer">
          Incident récurrent : s'est produit 2 fois en 6 mois avec la même cause racine apparente
        </Label>
      </div>
    </div>
  );
}
