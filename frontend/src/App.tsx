import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSession } from "./hooks/useSession";
import InitialForm from "./components/session/InitialForm";
import QuestionRound from "./components/session/QuestionRound";
import ResultsDashboard from "./components/results/ResultsDashboard";

const queryClient = new QueryClient();

function AppContent() {
  const { state, loading, error, startSession, submitAnswers, reset, initialForm } =
    useSession();

  return (
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
