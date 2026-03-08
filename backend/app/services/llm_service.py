import json
import os
from anthropic import Anthropic
from app.services.prompt_builder import SYSTEM_PROMPT, build_initial_message, build_continue_message

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = os.getenv("LLM_MODEL", "claude-haiku-4-5-20251001")


def _build_conversation_messages(history: list, current_user_message: str) -> list:
    messages = []
    for round_entry in history:
        messages.append({"role": "assistant", "content": round_entry["questions_json"]})
        answers_text = "\n".join(
            f"Question {a['question_id']} : {a['value']}"
            for a in round_entry["answers"]
        )
        messages.append({"role": "user", "content": f"=== RÉPONSES ===\n{answers_text}"})
    messages.append({"role": "user", "content": current_user_message})
    return messages


def start_session(initial_form: dict) -> dict:
    user_message = build_initial_message(initial_form)
    response = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}]
    )
    raw = response.content[0].text.strip()
    parsed = json.loads(raw)
    return {"done": parsed.get("done", False), "raw_json": raw}


def continue_session(initial_form: dict, history: list, current_answers: list) -> dict:
    initial_message = build_initial_message(initial_form)
    messages = _build_conversation_messages(
        history,
        build_continue_message(history, current_answers)
    )
    # Insérer le message initial comme premier message user
    all_messages = [{"role": "user", "content": initial_message}] + messages
    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=all_messages
    )
    raw = response.content[0].text.strip()
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
