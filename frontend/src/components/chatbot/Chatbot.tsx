import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { chatWithAgent } from "../../lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ source: string; page: string }>;
}

interface Props {
  incidentDescription: string;
}

export default function Chatbot({ incidentDescription }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Assistant réglementaire — Questions sur cet incident
        </CardTitle>
        <p className="text-xs text-gray-500">
          Posez vos questions : les réponses sont basées sur les textes DORA, RGPD et LOPMI.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.length > 0 && (
          <div className="max-h-80 overflow-y-auto space-y-3 border rounded p-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`text-sm ${m.role === "user" ? "text-right" : ""}`}>
                <span
                  className={`inline-block px-3 py-2 rounded-lg max-w-[85%] text-left ${
                    m.role === "user"
                      ? "bg-green-700 text-white"
                      : "bg-white border text-gray-800"
                  }`}
                >
                  {m.content}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                      Sources : {m.sources.map((s) => `${s.source} p.${s.page}`).join(", ")}
                    </div>
                  )}
                </span>
              </div>
            ))}
            {loading && (
              <p className="text-xs text-gray-400 italic">Recherche en cours...</p>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: Quelles sont les obligations de notification DORA pour un incident majeur ?"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button
            onClick={send}
            disabled={loading || !input.trim()}
            className="bg-green-700 hover:bg-green-800 shrink-0"
          >
            Envoyer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
