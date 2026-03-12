import json
import logging
import os
from google import genai
from google.genai import types
from app.services.prompt_builder import SYSTEM_PROMPT, build_initial_message, build_continue_message

logger = logging.getLogger(__name__)

# --- NOUVELLE SYNTAXE DU SDK ---
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
MODEL = os.getenv("LLM_MODEL", "gemini-3.1-flash-lite-preview")


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
    """Reconstruit la conversation complète depuis l'historique."""
    messages = []
    for i, round_entry in enumerate(history):
        # Nouvelle syntaxe pour le contenu : dict avec "text"
        messages.append({"role": "model", "parts": [{"text": round_entry["questions_json"]}]})
        
        answers_text = "\n".join(
            f"Question {a['question_id']} : {a['value']}"
            for a in round_entry["answers"]
        )
        is_last = (i == len(history) - 1)
        if is_last:
            round_count = len(history) + 1
            if round_count >= 7:
                instruction = "DERNIER ROUND POSSIBLE — tu DOIS conclure avec done: true."
            elif round_count < 4:
                instruction = " RAPPEL STRICT : INTERDICTION FORMELLE de conclure ce round. Tu DOIS  poser de nouvelles questions pour creuser le contexte (utilise les catégories LEG0115)."
            else:
                instruction = "Génère le round suivant ou la classification finale si tu as assez d'informations."
            content = f"=== RÉPONSES ===\n{answers_text}\n\n=== ROUND {round_count}/7 ===\n{instruction}"
        else:
            content = f"=== RÉPONSES ===\n{answers_text}"
            
        messages.append({"role": "user", "parts": [{"text": content}]})
    return messages


def start_session(initial_form: dict) -> dict:
    user_message = build_initial_message(initial_form)
    
    combined_message = f"{SYSTEM_PROMPT}\n\n{user_message}"
    
    # Appel API avec le nouveau client
    response = client.models.generate_content(
        model=MODEL,
        contents=[{"role": "user", "parts": [{"text": combined_message}]}],
        config=types.GenerateContentConfig(max_output_tokens=4096)
    )
    
    finish_reason = response.candidates[0].finish_reason.name if response.candidates else "UNKNOWN"
    logger.info("LLM finish_reason: %s", finish_reason)
    
    try:
        raw_text = response.text
    except ValueError:
        raw_text = ""
        
    raw = _extract_json(raw_text)
    if not raw:
        raise ValueError(f"LLM a retourné une réponse vide. finish_reason={finish_reason}")
        
    parsed = json.loads(raw)
    return {"done": parsed.get("done", False), "raw_json": raw}


def continue_session(initial_form: dict, history: list, current_answers: list) -> dict:  # noqa: ARG001
    """Continue la session."""
    initial_message = build_initial_message(initial_form)
    messages = _build_conversation_messages(history)

    combined_initial = f"{SYSTEM_PROMPT}\n\n{initial_message}"
    
    all_messages = [{"role": "user", "parts": [{"text": combined_initial}]}] + messages
    
    # Appel API avec le nouveau client
    response = client.models.generate_content(
        model=MODEL,
        contents=all_messages,
        config=types.GenerateContentConfig(max_output_tokens=4096)
    )
    
    finish_reason = response.candidates[0].finish_reason.name if response.candidates else "UNKNOWN"
    logger.info("LLM finish_reason: %s", finish_reason)
    
    try:
        raw_text = response.text
    except ValueError:
        raw_text = ""
        
    raw = _extract_json(raw_text)
    if not raw:
        raise ValueError(f"LLM a retourné une réponse vide. finish_reason={finish_reason}")
        
    parsed = json.loads(raw)
    return {"done": parsed.get("done", False), "raw_json": raw}


def refine_with_rag(classification_json: str, rag_excerpts: list[str]) -> str:
    excerpts_text = "\n\n---\n\n".join(
        f"Extrait réglementaire ({i+1}) :\n{exc}"
        for i, exc in enumerate(rag_excerpts)
    )

    sys_prompt="Tu es un assistant juridique expert BNP Paribas spécialisé en DORA, RGPD et LOPMI. Tu rédiges des analyses juridiques précises."
    user_message = f"""{sys_prompt}

Tu as produit cette classification :

{classification_json}

Voici des extraits des textes officiels récupérés par recherche sémantique :

{excerpts_text}

Régénère UNIQUEMENT le champ "narrative", enrichi avec des citations précises des articles. Retourne uniquement la narrative en texte brut (pas de JSON), 5-6 paragraphes, ton juridique professionnel."""

    # Appel API avec le nouveau client
    response = client.models.generate_content(
        model=MODEL,
        contents=[{"role": "user", "parts": [{"text": user_message}]}],
        config=types.GenerateContentConfig(max_output_tokens=4096)
    )
    
    try:
        return response.text.strip()
    except ValueError:
        return ""