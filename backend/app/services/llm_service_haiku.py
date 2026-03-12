import json
import logging
import os
from anthropic import Anthropic
from app.services.prompt_builder import SYSTEM_PROMPT, build_initial_message, build_continue_message

logger = logging.getLogger(__name__)

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = os.getenv("LLM_MODEL", "claude-haiku-4-5-20251001")


def _extract_json(raw: str) -> str:
    """Extrait le JSON brut même si le LLM l'a enveloppé dans des blocs markdown."""
    text = raw.strip()
    if text.startswith("```"):
        # Supprime le bloc markdown ```json ... ```
        lines = text.split("\n")
        lines = lines[1:]  # Retire la ligne ```json
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    logger.debug("LLM raw response: %s", text[:200])
    return text


def _build_conversation_messages(history: list) -> list:
    """Reconstruit la conversation complète depuis l'historique.

    Chaque round produit :
    - assistant : les questions JSON du round
    - user : les réponses + instruction de navigation (uniquement pour le dernier round)
    """
    messages = []
    for i, round_entry in enumerate(history):
        messages.append({"role": "assistant", "content": round_entry["questions_json"]})
        answers_text = "\n".join(
            f"Question {a['question_id']} : {a['value']}"
            for a in round_entry["answers"]
        )
        is_last = (i == len(history) - 1)
        if is_last:
            round_count = len(history) + 1
            if round_count >= 3:
                instruction = "DERNIER ROUND POSSIBLE — tu DOIS conclure avec done: true."
            else:
                instruction = "Génère le round suivant ou la classification finale si tu as assez d'informations."
            content = f"=== RÉPONSES ===\n{answers_text}\n\n=== ROUND {round_count}/3 ===\n{instruction}"
        else:
            content = f"=== RÉPONSES ===\n{answers_text}"
        messages.append({"role": "user", "content": content})
    return messages


def start_session(initial_form: dict) -> dict:
    user_message = build_initial_message(initial_form)
    response = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}]
    )
    logger.info("LLM stop_reason: %s, content blocks: %d", response.stop_reason, len(response.content))
    raw = _extract_json(response.content[0].text)
    if not raw:
        raise ValueError(f"LLM a retourné une réponse vide. stop_reason={response.stop_reason}")
    parsed = json.loads(raw)
    return {"done": parsed.get("done", False), "raw_json": raw}


def continue_session(initial_form: dict, history: list, current_answers: list) -> dict:  # noqa: ARG001
    """Continue la session.

    `history` contient tous les rounds complétés incluant le round courant (avec ses réponses).
    `current_answers` n'est plus utilisé directement — les réponses sont dans history[-1].
    """
    initial_message = build_initial_message(initial_form)
    messages = _build_conversation_messages(history)
    all_messages = [{"role": "user", "content": initial_message}] + messages
    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=all_messages
    )
    logger.info("LLM stop_reason: %s, content blocks: %d", response.stop_reason, len(response.content))
    raw = _extract_json(response.content[0].text)
    if not raw:
        raise ValueError(f"LLM a retourné une réponse vide. stop_reason={response.stop_reason}")
    parsed = json.loads(raw)
    return {"done": parsed.get("done", False), "raw_json": raw}


def refine_with_rag(classification_json: str, rag_excerpts: list[str]) -> str:
    excerpts_text = "\n\n---\n\n".join(
        f"Extrait réglementaire ({i+1}) :\n{exc}"
        for i, exc in enumerate(rag_excerpts)
    )
    user_message = f"""Tu as produit cette classification :

{classification_json}

Voici des extraits des textes officiels récupérés par recherche sémantique :

{excerpts_text}

Régénère UNIQUEMENT le champ "narrative", enrichi avec des citations précises des articles. Retourne uniquement la narrative en texte brut (pas de JSON), 5-6 paragraphes, ton juridique professionnel."""

    response = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        system="Tu es un assistant juridique expert BNP Paribas spécialisé en DORA, RGPD et LOPMI. Tu rédiges des analyses juridiques précises.",
        messages=[{"role": "user", "content": user_message}]
    )
    return response.content[0].text.strip()
