import { useState } from "react";
import {
  InitialForm,
  QuestionAnswer,
  RoundHistory,
  QuestionRoundData,
  ClassificationData,
  sessionStart,
  sessionContinue,
} from "../lib/api";

type SessionState =
  | { phase: "initial" }
  | { phase: "questions"; currentRound: QuestionRoundData; roundNumber: number }
  | { phase: "result"; classification: ClassificationData };

// Valeurs par défaut sûres si le LLM omet certains champs
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
    narrative: (p.narrative as string) ?? "Analyse produite. Certaines données manquent pour une narrative complète.",
  };
}

export function useSession() {
  const [state, setState] = useState<SessionState>({ phase: "initial" });
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [initialForm, setInitialForm] = useState<InitialForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSession = async (form: InitialForm) => {
    setLoading(true);
    setError(null);
    setInitialForm(form);
    try {
      const res = await sessionStart(form);
      const parsed = JSON.parse(res.raw_json);
      if (parsed.done) {
        setState({ phase: "result", classification: safeParseClassification(parsed) });
      } else {
        setState({
          phase: "questions",
          currentRound: parsed as QuestionRoundData,
          roundNumber: 1,
        });
      }
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Erreur lors du démarrage de la session. Vérifiez la connexion backend.");
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
    // setHistory uniquement après succès pour éviter la corruption en cas de retry

    try {
      const res = await sessionContinue(initialForm, updatedHistory, answers);
      const parsed = JSON.parse(res.raw_json);
      setHistory(updatedHistory); // Commit de l'historique seulement si succès
      if (parsed.done) {
        setState({ phase: "result", classification: safeParseClassification(parsed) });
      } else {
        setState({
          phase: "questions",
          currentRound: parsed as QuestionRoundData,
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
  };

  return { state, loading, error, startSession, submitAnswers, reset, initialForm };
}
