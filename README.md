# BNP Incident Notification Tool

Outil de qualification et de notification d'incidents réglementaires pour les juristes
Digital & IP de BNP Paribas (DORA / RGPD / LOPMI).

## Lancement

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Tests

```bash
cd backend && pytest tests/ -v
```

## Accès

- Frontend : http://localhost:5173
- API docs : http://localhost:8000/docs
