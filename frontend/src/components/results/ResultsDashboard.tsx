import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RegulationBlock from "./RegulationBlock";
import Countdown from "./Countdown";
import Chatbot from "../chatbot/Chatbot";
import type { ClassificationResult, IncidentInput } from "../../lib/api";

interface Props {
  result: ClassificationResult;
  incidentData: IncidentInput;
  onReset: () => void;
}

const GLOBAL_COLORS: Record<string, string> = {
  major: "bg-red-700",
  significant: "bg-amber-600",
  minor: "bg-blue-600",
  none: "bg-gray-600",
};

const GLOBAL_LABELS: Record<string, string> = {
  major: "INCIDENT MAJEUR",
  significant: "INCIDENT SIGNIFICATIF",
  minor: "INCIDENT MINEUR",
  none: "NON QUALIFIÉ",
};

export default function ResultsDashboard({ result, incidentData, onReset }: Props) {
  const activeRegs = [
    result.dora.applicable && "DORA",
    result.rgpd.applicable && "RGPD",
    result.lopmi.applicable && "LOPMI",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      {/* Bandeau gravité */}
      <div className={`${GLOBAL_COLORS[result.global_level]} rounded-xl p-6 text-white space-y-2`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{GLOBAL_LABELS[result.global_level]}</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="text-white border-white/40 hover:bg-white/10"
          >
            Nouvel incident
          </Button>
        </div>
        <div className="flex gap-2">
          {activeRegs.map((reg) => (
            <Badge key={reg} className="bg-white/20 text-white border-white/30">
              {reg}
            </Badge>
          ))}
        </div>
        <Countdown
          detectionDatetime={incidentData.detection_datetime}
          firstDeadlineHours={result.first_deadline_hours}
        />
      </div>

      {/* Blocs par réglementation */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">Actions à mener</h3>
        <RegulationBlock title="DORA — Autorités de supervision" result={result.dora} />
        <RegulationBlock title="RGPD — Protection des données" result={result.rgpd} />
        <RegulationBlock title="LOPMI — Dépôt de plainte" result={result.lopmi} />
      </div>

      {/* Chatbot RAG */}
      <Chatbot incidentDescription={incidentData.description} />
    </div>
  );
}
