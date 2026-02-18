import { useMutation } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWizard } from "./useWizard";
import Step1Triage from "./Step1Triage";
import Step2Dora from "./Step2Dora";
import Step3Rgpd from "./Step3Rgpd";
import Step4Lopmi from "./Step4Lopmi";
import Step5Context from "./Step5Context";
import { classifyIncident, type ClassificationResult, type IncidentInput } from "../../lib/api";

const STEP_TITLES: Record<number, string> = {
  1: "Triage initial",
  2: "Critères DORA",
  3: "Analyse RGPD",
  4: "Analyse LOPMI",
  5: "Contexte de l'incident",
};

interface Props {
  onClassified: (result: ClassificationResult, data: IncidentInput) => void;
}

export default function IncidentWizard({ onClassified }: Props) {
  const { step, data, update, nextStep, prevStep, isLastStep, progress } = useWizard();

  const mutation = useMutation({
    mutationFn: () => classifyIncident(data as IncidentInput),
    onSuccess: (result) => onClassified(result, data as IncidentInput),
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>{STEP_TITLES[step]}</span>
          <span>{Math.round(progress())}%</span>
        </div>
        <Progress value={progress()} className="h-2" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{STEP_TITLES[step]}</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 1 && <Step1Triage data={data} update={update} />}
          {step === 2 && <Step2Dora data={data} update={update} />}
          {step === 3 && <Step3Rgpd data={data} update={update} />}
          {step === 4 && <Step4Lopmi data={data} update={update} />}
          {step === 5 && <Step5Context data={data} update={update} />}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep} disabled={step === 1}>
          Précédent
        </Button>
        {isLastStep() ? (
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-green-700 hover:bg-green-800"
          >
            {mutation.isPending ? "Analyse en cours..." : "Analyser l'incident"}
          </Button>
        ) : (
          <Button onClick={nextStep} className="bg-green-700 hover:bg-green-800">
            Suivant
          </Button>
        )}
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-600">
          Erreur lors de l'analyse. Vérifiez que le backend est démarré.
        </p>
      )}
    </div>
  );
}
