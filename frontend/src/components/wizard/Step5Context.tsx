import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WizardData } from "./useWizard";

interface Props {
  data: WizardData;
  update: (fields: Partial<WizardData>) => void;
}

export default function Step5Context({ data, update }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">Description de l'incident</Label>
        <Textarea
          id="description"
          placeholder="Décrivez l'incident, les systèmes concernés, les premières constatations, les actions déjà engagées..."
          rows={8}
          value={data.description}
          onChange={(e) => update({ description: e.target.value })}
        />
      </div>
      <p className="text-xs text-gray-500">
        Ces informations seront utilisées pour contextualiser les recommandations du chatbot.
      </p>
    </div>
  );
}
