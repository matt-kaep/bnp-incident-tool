from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.routers import session, rag, incidents, analysis, docs

app = FastAPI(title="BNP Incident Notification Tool V2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session.router, prefix="/api")
app.include_router(rag.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(docs.router, prefix="/api")
