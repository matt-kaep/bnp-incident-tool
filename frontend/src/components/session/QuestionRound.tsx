import { useState } from "react";
import type { QuestionRoundData, QuestionAnswer, DynamicQuestion } from "../../lib/api";

interface Props {
  round: QuestionRoundData;
  roundNumber: number;
  onSubmit: (answers: QuestionAnswer[]) => void;
  loading: boolean;
}

function QuestionItem({
  question,
  value,
  onChange,
}: {
  question: DynamicQuestion;
  value: string;
  onChange: (val: string) => void;
}) {
  if (question.type === "yes_no_unknown") {
    return (
      <div>
        <div className="flex gap-3 flex-wrap">
          {["yes", "no", "unknown"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-4 py-2 rounded-md text-sm border font-medium transition-colors ${
                value === opt
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {opt === "yes" ? "Oui" : opt === "no" ? "Non" : "Je ne sais pas"}
            </button>
          ))}
        </div>
        {value === "unknown" && question.if_unknown_impact && (
          <p className="mt-2 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-1">
            Impact : {question.if_unknown_impact}
          </p>
        )}
      </div>
    );
  }

  if (question.type === "multi_select" && question.options) {
    const selected = value ? value.split("|||") : [];
    const toggle = (opt: string) => {
      const next = selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt];
      onChange(next.join("|||"));
    };
    return (
      <div className="space-y-2">
        {question.options.map((opt) => (
          <label key={opt} className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="mt-0.5"
            />
            <span className="text-sm text-gray-700">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="Votre réponse…"
    />
  );
}

export default function QuestionRound({ round, roundNumber, onSubmit, loading }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const criticalUnanswered = round.questions.filter(
    (q) => q.importance === "critical" && !answers[q.id]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result: QuestionAnswer[] = round.questions.map((q) => ({
      question_id: q.id,
      value: answers[q.id] || "unknown",
    }));
    onSubmit(result);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            Round {roundNumber}
          </span>
          <h2 className="text-lg font-semibold text-gray-900">{round.round_title}</h2>
        </div>

        <div className="space-y-6">
          {round.questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <div className="flex items-start gap-2">
                {q.importance === "critical" && (
                  <span className="text-red-500 text-xs font-semibold mt-0.5 shrink-0">
                    CRITIQUE
                  </span>
                )}
                <label className="text-sm font-medium text-gray-800">{q.text}</label>
              </div>
              <QuestionItem
                question={q}
                value={answers[q.id] || ""}
                onChange={(val) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: val }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      {criticalUnanswered.length > 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          {criticalUnanswered.length} question(s) critique(s) sans réponse — vous pouvez
          choisir "Je ne sais pas".
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-6 bg-blue-700 text-white font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors"
      >
        {loading ? "Analyse en cours..." : "Continuer"}
      </button>
    </form>
  );
}
