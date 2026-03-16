import json
import logging
import os
from google import genai
from google.genai import types
from app.services.prompt_builder import SYSTEM_PROMPT, build_initial_message, build_continue_message

logger = logging.getLogger(__name__)

# --- NOUVELLE SYNTAXE DU SDK ---
_api_key = os.getenv("GOOGLE_API_KEY")
if _api_key:
    client = genai.Client(api_key=_api_key)
else:
    logger.warning("GOOGLE_API_KEY not set — LLM calls will fail at runtime")
    client = None  # type: ignore[assignment]
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


def generate_regulation_analysis(
    regulation: str,
    classification_json: str,
    incident_summary: str,
    rag_excerpts: list[dict],
) -> str:
    """Generate a detailed 3-4 paragraph analysis for a specific regulation using RAG excerpts."""
    reg_names = {
        "dora": "DORA (Règlement UE 2022/2554)",
        "rgpd": "RGPD (Règlement UE 2016/679, Articles 33-34)",
        "lopmi": "LOPMI (Code des assurances, Art. L12-10-1)",
    }
    reg_label = reg_names.get(regulation, regulation.upper())

    excerpts_text = "\n\n---\n\n".join(
        f"[SOURCE: {exc.get('source', 'unknown')} | PAGE: {exc.get('page', '?')}]\n{exc.get('excerpt', '')}"
        for exc in rag_excerpts
    )

    sys_prompt = f"Tu es un expert juridique BNP Paribas spécialisé en {reg_label}. Tu rédiges des analyses réglementaires détaillées avec citations d'articles. Tu insères des marqueurs de citation [REF:fichier:page:\"citation\"] dans ton texte."

    user_message = f"""{sys_prompt}

CLASSIFICATION DE L'INCIDENT :
{classification_json}

RÉSUMÉ DE L'INCIDENT :
{incident_summary}

EXTRAITS DU TEXTE RÉGLEMENTAIRE {reg_label} :
{excerpts_text}

INSTRUCTIONS DE CITATION :
Dans ton analyse, insère des marqueurs de citation inline au format exact suivant :
[REF:nom_du_fichier.pdf:numéro_de_page:"citation courte"]

Règles :
- Utilise EXACTEMENT le nom de fichier et le numéro de page indiqués dans [SOURCE: ... | PAGE: ...] ci-dessus
- La "citation courte" doit être un extrait de 5-15 mots du texte source, entre guillemets
- Place les citations directement après l'affirmation qu'elles soutiennent
- Insère au moins 2-3 citations dans ton analyse
- N'invente JAMAIS de citation : utilise uniquement les sources fournies

Exemple de format attendu :
"L'incident doit être notifié car il impacte des fonctions critiques [REF:DORA-CELEX_32022R2554_EN_TXT.pdf:12:"critical or important functions"] et dépasse les seuils de matérialité [REF:DORA-CELEX_32022R2554_EN_TXT.pdf:15:"materiality thresholds"]."

Rédige une analyse détaillée (3-4 paragraphes) expliquant pourquoi et comment la réglementation {reg_label} s'applique (ou ne s'applique pas) à cet incident. Ton juridique professionnel, en français.

Retourne UNIQUEMENT le texte de l'analyse avec les marqueurs [REF:...] inline (pas de JSON, pas de titre)."""

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
