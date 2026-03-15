import json
import math
import os
import tempfile
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

DATA_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "incidents.json"
_lock = threading.Lock()


def _read_db() -> list[dict]:
    if not DATA_FILE.exists():
        return []
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []


def _write_db(data: list[dict]) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=DATA_FILE.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, str(DATA_FILE))
    except Exception:
        os.unlink(tmp_path)
        raise


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def save_incident(incident_data: dict, embeddings: dict) -> dict:
    with _lock:
        db = _read_db()
        record = {
            "id": str(uuid.uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
            **incident_data,
            "embeddings": embeddings,
        }
        db.append(record)
        _write_db(db)
        return record


def list_incidents() -> list[dict]:
    with _lock:
        db = _read_db()
    summaries = []
    for inc in db:
        classification = inc.get("classification", {})
        initial_form = inc.get("initial_form", {})
        summaries.append({
            "id": inc["id"],
            "created_at": inc["created_at"],
            "entity_name": initial_form.get("entity_name", ""),
            "incident_types": initial_form.get("incident_types", []),
            "global_level": classification.get("global_level", "non_qualifie"),
            "first_deadline_hours": inc.get("first_deadline_hours"),
        })
    return sorted(summaries, key=lambda x: x["created_at"], reverse=True)


def get_incident(incident_id: str) -> Optional[dict]:
    with _lock:
        db = _read_db()
    for inc in db:
        if inc["id"] == incident_id:
            return {k: v for k, v in inc.items() if k != "embeddings"}
    return None


def delete_incident(incident_id: str) -> bool:
    with _lock:
        db = _read_db()
        new_db = [inc for inc in db if inc["id"] != incident_id]
        if len(new_db) == len(db):
            return False
        _write_db(new_db)
        return True


def find_similar(embedding: list[float], top_k: int = 5, exclude_id: Optional[str] = None) -> list[dict]:
    with _lock:
        db = _read_db()
    scored = []
    for inc in db:
        if exclude_id and inc["id"] == exclude_id:
            continue
        inc_emb = inc.get("embeddings", {}).get("incident_summary")
        if not inc_emb:
            continue
        score = _cosine_similarity(embedding, inc_emb)
        initial_form = inc.get("initial_form", {})
        classification = inc.get("classification", {})
        scored.append({
            "id": inc["id"],
            "created_at": inc["created_at"],
            "entity_name": initial_form.get("entity_name", ""),
            "incident_types": initial_form.get("incident_types", []),
            "global_level": classification.get("global_level", ""),
            "incident_summary": inc.get("incident_summary", "")[:200],
            "similarity": round(score, 4),
        })
    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return scored[:top_k]
