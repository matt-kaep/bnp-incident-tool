import { useState, useCallback } from "react";
import {
  InitialForm,
  QuestionAnswer,
  RoundHistory,
  QuestionRoundData,
  ClassificationData,
  RegulationAnalysis,
  SimilarIncident,
  sessionStart,
  sessionContinue,
  analyzeRegulation,
  saveIncident,
  findSimilarIncidents,
} from "../lib/api";

export type AnalysisState = {
  loading: boolean;
  result: RegulationAnalysis | null;
  error: string | null;
};

export type AnalysesState = {
  dora: AnalysisState;
  rgpd: AnalysisState;
  lopmi: AnalysisState;
};

type SessionState =
  | { phase: "initial" }
  | { phase: "questions"; currentRound: QuestionRoundData; roundNumber: number }
  | { phase: "result"; classification: ClassificationData };

function safeParseClassification(parsed: unknown): ClassificationData {
  const p = parsed as Record<string, unknown>;
  return {
    done: true,
    classification: (p.classification as ClassificationData["classification"]) ?? {
      global_level: "non_qualifie",
      dora: { level: "mineur", applicable: false, reasoning: "" },
      rgpd: { level: "non_applicable", applicable: false, reasoning: "" },
      lopmi: { level: "non_applicable", applicable: false, reasoning: "" },
    },
    actions: (p.actions as ClassificationData["actions"]) ?? [],
    first_deadline_hours: (p.first_deadline_hours as number | null) ?? null,
    unknown_impacts: (p.unknown_impacts as ClassificationData["unknown_impacts"]) ?? [],
    incident_summary: (p.incident_summary as string) ?? "Résumé en cours de génération...",
  };
}

const INITIAL_ANALYSES: AnalysesState = {
  dora: { loading: false, result: null, error: null },
  rgpd: { loading: false, result: null, error: null },
  lopmi: { loading: false, result: null, error: null },
};

export function useSession() {
  const [state, setState] = useState<SessionState>({ phase: "initial" });
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [initialForm, setInitialForm] = useState<InitialForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<AnalysesState>(INITIAL_ANALYSES);
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [similarIncidents, setSimilarIncidents] = useState<SimilarIncident[]>([]);

  const triggerAnalyses = useCallback(
    (classification: ClassificationData, form: InitialForm, currentHistory: RoundHistory[]) => {
      const classificationJson = JSON.stringify(classification.classification);
      const summary = classification.incident_summary;

      // Only analyze applicable regulations
      const regs = (["dora", "rgpd", "lopmi"] as const).filter(
        (reg) => classification.classification[reg]?.applicable
      );

      // Set loading for applicable regs
      for (const reg of regs) {
        setAnalyses((prev) => ({
          ...prev,
          [reg]: { loading: true, result: null, error: null },
        }));
      }

      // Launch parallel analyses and track individual results
      const promises = regs.map((reg) =>
        analyzeRegulation(reg, classificationJson, summary)
          .then((result) => {
            setAnalyses((prev) => ({
              ...prev,
              [reg]: { loading: false, result, error: null },
            }));
            return { reg, analysis: result.analysis };
          })
          .catch(() => {
            setAnalyses((prev) => ({
              ...prev,
              [reg]: { loading: false, result: null, error: "Analyse indisponible" },
            }));
            return { reg, analysis: "" };
          })
      );

      // Auto-save when all analyses complete
      Promise.allSettled(promises).then((results) => {
        const analysisResults: Record<string, string> = {};
        for (const r of results) {
          if (r.status === "fulfilled") {
            analysisResults[r.value.reg] = r.value.analysis;
          }
        }

        const incidentData = {
          initial_form: form,
          rounds: currentHistory,
          classification: classification.classification,
          incident_summary: summary,
          actions: classification.actions,
          unknown_impacts: classification.unknown_impacts,
          analyses: analysisResults,
        };

        saveIncident(incidentData)
          .then((saved) => setIncidentId(saved.id))
          .catch(() => {
            setError("L'incident n'a pas pu être sauvegardé automatiquement.");
          });

        findSimilarIncidents(summary)
          .then(setSimilarIncidents)
          .catch(() => {});
      });
    },
    []
  );

  const startSession = async (form: InitialForm) => {
    setLoading(true);
    setError(null);
    setInitialForm(form);
    try {
      const res = await sessionStart(form);
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(res.raw_json);
      } catch {
        throw new Error("Le LLM a retourné une réponse invalide.");
      }
      if (parsed.done) {
        const classification = safeParseClassification(parsed);
        setState({ phase: "result", classification });
        triggerAnalyses(classification, form, []);
      } else {
        setState({
          phase: "questions",
          currentRound: parsed as unknown as QuestionRoundData,
          roundNumber: 1,
        });
      }
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Erreur lors du démarrage de la session.");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswers = async (
    answers: QuestionAnswer[],
    currentRound: QuestionRoundData,
    roundNumber: number
  ) => {
    if (!initialForm) return;
    setLoading(true);
    setError(null);

    const newHistoryEntry: RoundHistory = {
      round_number: roundNumber,
      round_title: currentRound.round_title,
      questions_json: JSON.stringify(currentRound),
      answers,
    };
    const updatedHistory = [...history, newHistoryEntry];

    try {
      const res = await sessionContinue(initialForm, updatedHistory, answers);
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(res.raw_json);
      } catch {
        throw new Error("Le LLM a retourné une réponse invalide.");
      }
      setHistory(updatedHistory);
      if (parsed.done) {
        const classification = safeParseClassification(parsed);
        setState({ phase: "result", classification });
        triggerAnalyses(classification, initialForm, updatedHistory);
      } else {
        setState({
          phase: "questions",
          currentRound: parsed as unknown as QuestionRoundData,
          roundNumber: roundNumber + 1,
        });
      }
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Erreur lors de la soumission des réponses.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setState({ phase: "initial" });
    setHistory([]);
    setInitialForm(null);
    setError(null);
    setAnalyses(INITIAL_ANALYSES);
    setIncidentId(null);
    setSimilarIncidents([]);
  };

  return {
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
  };
}
