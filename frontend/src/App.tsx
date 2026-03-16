import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSession } from "./hooks/useSession";
import InitialForm from "./components/session/InitialForm";
import QuestionRound from "./components/session/QuestionRound";
import ResultsDashboard from "./components/results/ResultsDashboard";
import IncidentList from "./components/history/IncidentList";
import IncidentDetail from "./components/history/IncidentDetail";

const queryClient = new QueryClient();

type View = "session" | "history" | { detail: string };

function AppContent() {
  const {
    state,
    loading,
    error,
    startSession,
    submitAnswers,
    reset,
    initialForm,
    analyses,
    incidentId,
    similarIncidents,
  } = useSession();

  const [view, setView] = useState<View>("session");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
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
          <nav className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView("session")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === "session"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Nouvelle session
            </button>
            <button
              onClick={() => setView("history")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view !== "session"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Historique
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {view === "session" && (
          <>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {state.phase === "initial" && (
              <InitialForm onSubmit={startSession} loading={loading} />
            )}

            {state.phase === "questions" && (
              <QuestionRound
                key={state.roundNumber}
                round={state.currentRound}
                roundNumber={state.roundNumber}
                onSubmit={(answers) =>
                  submitAnswers(answers, state.currentRound, state.roundNumber)
                }
                loading={loading}
              />
            )}

            {state.phase === "result" && initialForm && (
              <ResultsDashboard
                result={state.classification}
                initialForm={initialForm}
                onReset={reset}
                analyses={analyses}
                incidentId={incidentId}
                similarIncidents={similarIncidents}
                onViewIncident={(id) => setView({ detail: id })}
              />
            )}
          </>
        )}

        {view === "history" && (
          <IncidentList
            onSelectIncident={(id) => setView({ detail: id })}
          />
        )}

        {typeof view === "object" && "detail" in view && (
          <IncidentDetail
            incidentId={view.detail}
            onBack={() => setView("history")}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
