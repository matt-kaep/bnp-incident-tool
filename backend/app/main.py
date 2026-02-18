from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import classification, rag

app = FastAPI(title="BNP Incident Notification Tool")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(classification.router, prefix="/api")
app.include_router(rag.router, prefix="/api")
