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
        setState({ phase: "result", classification: parsed as ClassificationData });
      } else {
        setState({
          phase: "questions",
          currentRound: parsed as QuestionRoundData,
          roundNumber: 1,
        });
      }
    } catch {
      setError("Erreur lors du démarrage de la session. Vérifiez la connexion backend.");
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
    setHistory(updatedHistory);

    try {
      const res = await sessionContinue(initialForm, updatedHistory, answers);
      const parsed = JSON.parse(res.raw_json);
      if (parsed.done) {
        setState({ phase: "result", classification: parsed as ClassificationData });
      } else {
        setState({
          phase: "questions",
          currentRound: parsed as QuestionRoundData,
          roundNumber: roundNumber + 1,
        });
      }
    } catch {
      setError("Erreur lors de la soumission des réponses.");
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
