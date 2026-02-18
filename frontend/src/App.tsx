import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import IncidentWizard from "./components/wizard/IncidentWizard";
import ResultsDashboard from "./components/results/ResultsDashboard";
import Chatbot from "./components/chatbot/Chatbot";
import type { ClassificationResult, IncidentInput } from "./lib/api";

const queryClient = new QueryClient();

export default function App() {
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [incidentData, setIncidentData] = useState<IncidentInput | null>(null);

  const handleClassified = (res: ClassificationResult, data: IncidentInput) => {
    setResult(res);
    setIncidentData(data);
  };

  const handleReset = () => {
    setResult(null);
    setIncidentData(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="w-8 h-8 bg-green-700 rounded" />
            <div>
              <h1 className="font-semibold text-gray-900">
                Outil de Notification d'Incidents
              </h1>
              <p className="text-xs text-gray-500">
                BNP Paribas — Direction Juridique Digital & IP
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8">
          {result === null ? (
            <IncidentWizard onClassified={handleClassified} />
          ) : (
            <ResultsDashboard
              result={result}
              incidentData={incidentData!}
              onReset={handleReset}
            />
          )}
        </main>
      </div>

      {result !== null && incidentData !== null && (
        <Chatbot incidentDescription={incidentData.description} />
      )}
    </QueryClientProvider>
  );
}
