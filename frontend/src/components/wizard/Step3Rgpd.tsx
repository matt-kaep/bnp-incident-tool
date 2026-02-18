import { Label } from "@/components/ui/label";
import type { WizardData } from "./useWizard";

interface Props {
  data: WizardData;
  update: (fields: Partial<WizardData>) => void;
}

function YesNo({ id, label, value, onChange }: {
  id: string; label: string;
  value: boolean | null | undefined;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-3">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`px-6 py-2 rounded-lg border text-sm font-medium transition-colors ${
              value === v
                ? "bg-green-700 text-white border-green-700"
                : "border-gray-300 hover:border-gray-500"
            }`}
          >
            {v ? "Oui" : "Non"}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Step3Rgpd({ data, update }: Props) {
  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-500 bg-gray-50 border rounded p-3">
        Arbre de décision RGPD — répondez aux questions dans l'ordre. Les questions suivantes
        apparaissent selon vos réponses.
      </p>

      <YesNo
        id="q1"
        label="Q1 — La violation est-elle une violation de données personnelles au sens du RGPD ?"
        value={data.rgpd_q1_is_personal_breach}
        onChange={(v) => update({ rgpd_q1_is_personal_breach: v })}
      />

      {data.rgpd_q1_is_personal_breach === false && (
        <p className="text-sm text-gray-600 bg-gray-50 border rounded p-3">
          Aucune notification RGPD requise. Documentation interne uniquement.
        </p>
      )}

      {data.rgpd_q1_is_personal_breach === true && (
        <YesNo
          id="q2"
          label="Q2 — La violation est-elle susceptible d'engendrer un risque pour les droits et libertés des personnes ?"
          value={data.rgpd_q2_risk_rights}
          onChange={(v) => update({ rgpd_q2_risk_rights: v })}
        />
      )}

      {data.rgpd_q2_risk_rights === false && (
        <p className="text-sm text-gray-600 bg-gray-50 border rounded p-3">
          Documentation interne uniquement. Pas de notification APD requise.
        </p>
      )}

      {data.rgpd_q2_risk_rights === true && (
        <>
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
            Notification de l'APD compétente (ex: CNIL) requise sous 72h.
            Évaluer si d'autres autorités EEA doivent être notifiées.
          </p>
          <YesNo
            id="q3"
            label="Q3 — La violation engendre-t-elle un risque ÉLEVÉ pour les droits et libertés des personnes ?"
            value={data.rgpd_q3_high_risk}
            onChange={(v) => update({ rgpd_q3_high_risk: v })}
          />
        </>
      )}

      {data.rgpd_q3_high_risk === true && (
        <div className="space-y-3">
          <Label className="text-sm">Q4 — Une exemption s'applique-t-elle ?</Label>
          {[
            "Données protégées par chiffrement fort",
            "Mesures prises pour neutraliser l'impact (ex: suspension des comptes affectés)",
            "Notification individuelle disproportionnée (→ avis public requis à la place)",
          ].map((ex) => (
            <div key={ex} className="text-sm text-gray-700 bg-gray-50 border rounded p-2">
              {ex}
            </div>
          ))}
          <div className="flex gap-3 mt-2">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => update({ rgpd_q4_exemption: v })}
                className={`px-6 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  data.rgpd_q4_exemption === v
                    ? "bg-green-700 text-white border-green-700"
                    : "border-gray-300 hover:border-gray-500"
                }`}
              >
                {v ? "Oui — exemption applicable" : "Non — pas d'exemption"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
