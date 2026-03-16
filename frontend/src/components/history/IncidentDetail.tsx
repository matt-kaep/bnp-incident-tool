import { useEffect, useState } from "react";
import type { IncidentRecord, QuestionRoundData } from "../../lib/api";
import { getIncident, updateIncidentNotes } from "../../lib/api";
import { LEVEL_CONFIG } from "../../lib/severity";
import { parseAnalysis, type CitationRef } from "../../lib/citationParser";
import PdfPreviewModal from "../results/PdfPreviewModal";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

interface Props {
  incidentId: string;
  onBack: () => void;
}

export default function IncidentDetail({ incidentId, onBack }: Props) {
  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRounds, setShowRounds] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [pdfModal, setPdfModal] = useState<{
    open: boolean;
    url: string;
    page: number;
    quote: string;
    label: string;
  }>({ open: false, url: "", page: 1, quote: "", label: "" });

  useEffect(() => {
    setLoading(true);
    setError(null);
    getIncident(incidentId)
      .then((data) => {
        setIncident(data);
        setNotes(data.notes ?? "");
      })
      .catch(() => setError("Impossible de charger l'incident."))
      .finally(() => setLoading(false));
  }, [incidentId]);

  if (loading) {
    return <div className="py-12 text-center text-gray-500 text-sm">Chargement...</div>;
  }

  if (error || !incident) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-500 text-sm">{error ?? "Incident introuvable."}</p>
        <button onClick={onBack} className="mt-4 text-sm text-blue-600 hover:text-blue-800">
          &larr; Retour à l'historique
        </button>
      </div>
    );
  }

  const classification = incident.classification;
  const globalLevel = (classification?.global_level as string) ?? "non_qualifie";
  const globalConfig = LEVEL_CONFIG[globalLevel] ?? LEVEL_CONFIG.non_qualifie;

  const openCitation = (ref: CitationRef) => {
    setPdfModal({
      open: true,
      url: `${API_BASE}/docs/${encodeURIComponent(ref.filename)}`,
      page: ref.page,
      quote: ref.quote,
      label: ref.label,
    });
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const updated = await updateIncidentNotes(incidentId, notes);
      setIncident(updated);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const renderAnalysisText = (text: string) => {
    const segments = parseAnalysis(text);
    return (
      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
        {segments.map((seg, i) =>
          seg.type === "text" ? (
            <span key={i}>{seg.content}</span>
          ) : (
            <button
              key={i}
              onClick={() => openCitation(seg)}
              className="inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded border border-blue-200 transition-colors cursor-pointer align-baseline"
              title={`"${seg.quote}"`}
            >
              <span className="text-[10px]">&#128196;</span>
              {seg.label}
            </button>
          )
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          &larr; Retour à l'historique
        </button>

        {/* Severity banner */}
        <div className={`${globalConfig.bg} rounded-lg p-5`}>
          <p className={`text-xs font-semibold uppercase tracking-wide ${globalConfig.text} opacity-75`}>
            Niveau de gravité global
          </p>
          <p className={`text-2xl font-bold ${globalConfig.text} mt-1`}>
            {globalConfig.label}
          </p>
          <p className={`text-xs ${globalConfig.text} opacity-75 mt-1`}>
            {incident.initial_form?.entity_name} — {new Date(incident.created_at).toLocaleDateString("fr-FR")}
          </p>
        </div>

        {/* Incident summary */}
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Résumé de l'incident</h3>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {incident.incident_summary}
          </div>
        </div>

        {/* Q&R rounds detail */}
        {incident.rounds && incident.rounds.length > 0 && (
          <div className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Détail des questions/réponses</h3>
              <button
                onClick={() => setShowRounds(!showRounds)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {showRounds ? "Masquer" : "Afficher"}
              </button>
            </div>

            {showRounds && (
              <div className="mt-4 space-y-5">
                {incident.rounds.map((round, ri) => {
                  let questions: QuestionRoundData["questions"] = [];
                  try {
                    const parsed = JSON.parse(round.questions_json) as QuestionRoundData;
                    questions = parsed.questions ?? [];
                  } catch {
                    // ignore parse errors
                  }

                  return (
                    <div key={ri} className="border-l-2 border-blue-200 pl-4">
                      <p className="text-sm font-semibold text-gray-800 mb-2">
                        Tour {round.round_number} — {round.round_title}
                      </p>
                      <div className="space-y-3">
                        {questions.map((q) => {
                          const answer = round.answers.find((a) => a.question_id === q.id);
                          return (
                            <div key={q.id} className="text-sm">
                              <p className="text-gray-700 font-medium">{q.text}</p>
                              <p className="text-gray-500 mt-0.5 ml-3">
                                {answer ? answer.value : <em className="text-gray-400">Pas de réponse</em>}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {incident.actions.length > 0 && (
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Actions requises</h3>
            <div className="space-y-2">
              {incident.actions.map((action, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{action.action as string}</span>
                  <span className="text-xs border rounded px-2 py-0.5 text-gray-500">
                    {action.deadline_label as string}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regulation analyses */}
        {incident.analyses && ["dora", "rgpd", "lopmi"].map((reg) => {
          const text = incident.analyses[reg];
          if (!text) return null;
          return (
            <div key={reg} className="bg-white rounded-lg border p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">
                Analyse {reg.toUpperCase()}
              </h3>
              {renderAnalysisText(text)}
            </div>
          );
        })}

        {/* Rapport a posteriori */}
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Rapport a posteriori</h3>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setSaveStatus("idle");
            }}
            placeholder="Ajoutez vos notes et retours sur cet incident..."
            rows={5}
            className="w-full border rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 resize-y"
          />
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
            {saveStatus === "success" && (
              <span className="text-sm text-green-600">Notes sauvegardées avec succès.</span>
            )}
            {saveStatus === "error" && (
              <span className="text-sm text-red-600">Erreur lors de la sauvegarde.</span>
            )}
          </div>
        </div>
      </div>

      <PdfPreviewModal
        isOpen={pdfModal.open}
        onClose={() => setPdfModal((s) => ({ ...s, open: false }))}
        pdfUrl={pdfModal.url}
        targetPage={pdfModal.page}
        highlightText={pdfModal.quote}
        label={pdfModal.label}
      />
    </>
  );
}
