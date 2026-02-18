import pytest
from app.services.rag_service import RagService


@pytest.fixture(scope="module")
def rag():
    service = RagService(docs_path="data/docs", persist_path="data/chroma_test")
    service.index_documents()
    return service


def test_rag_returns_non_empty_answer(rag):
    result = rag.query("What are the reporting deadlines for major incidents under DORA?")
    assert isinstance(result["answer"], str)
    assert len(result["answer"]) > 10


def test_rag_returns_sources(rag):
    result = rag.query("What is a major incident under DORA?")
    assert "sources" in result
    assert len(result["sources"]) > 0


def test_rag_returns_source_with_document_name(rag):
    result = rag.query("Article 19 DORA notification")
    sources = result["sources"]
    assert any("DORA" in s.get("source", "") for s in sources)
