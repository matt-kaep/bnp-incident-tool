import { useState, useRef, useEffect } from "react";
import { chatWithAgent, type ChatSource } from "../../lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

interface Props {
  incidentDescription: string;
}

function IconChat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SourceCard({ source }: { source: ChatSource }) {
  const [expanded, setExpanded] = useState(false);
  const name = source.source.replace(/\.pdf$/i, "").replace(/_/g, " ");
  const hasLongExcerpt = source.excerpt && source.excerpt.length > 150;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 text-xs shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-semibold text-gray-800 truncate">{name}</span>
        {source.page !== "" && (
          <span className="shrink-0 bg-gray-100 text-gray-500 rounded-md px-2 py-0.5 font-mono">
            p. {source.page}
          </span>
        )}
      </div>
      {source.excerpt && (
        <>
          <p
            className={`text-gray-600 leading-relaxed ${
              expanded ? "" : "line-clamp-3"
            }`}
          >
            {source.excerpt}
          </p>
          {hasLongExcerpt && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1.5 text-green-700 hover:underline text-xs font-medium"
            >
              {expanded ? "Voir moins" : "Voir le passage complet"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function Chatbot({ incidentDescription }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 50);
  }, [open]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);
    try {
      const res = await chatWithAgent(question, incidentDescription);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer, sources: res.sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Erreur lors de la connexion au service RAG." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fermer l'assistant" : "Ouvrir l'assistant réglementaire"}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-green-700 hover:bg-green-800 active:scale-95 text-white shadow-xl flex items-center justify-center transition-all duration-150"
      >
        {open ? <IconClose /> : <IconChat />}
      </button>

      {/* Panneau de chat */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[460px] max-h-[680px] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* En-tête */}
          <div className="bg-green-700 px-5 py-4 text-white shrink-0">
            <p className="font-semibold text-sm">Assistant réglementaire</p>
            <p className="text-xs text-green-200 mt-0.5">
              Recherche dans les textes DORA, RGPD et LOPMI
            </p>
          </div>

          {/* Zone messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-gray-50">
            {messages.length === 0 && (
              <p className="text-xs text-gray-400 text-center pt-8">
                Posez vos questions sur les obligations réglementaires liées à cet incident.
              </p>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col gap-2 ${
                  m.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[85%] ${
                    m.role === "user"
                      ? "bg-green-700 text-white rounded-br-none"
                      : "bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm"
                  }`}
                >
                  {m.content}
                </div>

                {m.sources && m.sources.length > 0 && (
                  <div className="w-full space-y-2">
                    <p className="text-xs text-gray-400 font-medium px-1">
                      {m.sources.length} source{m.sources.length > 1 ? "s" : ""} trouvée{m.sources.length > 1 ? "s" : ""}
                    </p>
                    {m.sources.map((s, j) => (
                      <SourceCard key={j} source={s} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Zone saisie */}
          <div className="border-t border-gray-200 p-3 flex gap-2 bg-white shrink-0">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question réglementaire..."
              rows={2}
              className="flex-1 resize-none text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="bg-green-700 hover:bg-green-800 disabled:opacity-40 text-white px-4 rounded-xl transition-colors shrink-0 flex items-center justify-center"
            >
              <IconSend />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
