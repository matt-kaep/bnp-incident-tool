from pathlib import Path


class RagService:
    def __init__(
        self,
        docs_path: str = "data/docs",
        persist_path: str = "data/chroma_db",
        model_name: str = "BAAI/bge-small-en-v1.5",
    ):
        self.docs_path = Path(docs_path)
        self.persist_path = persist_path
        self.vectorstore = None
        self._model_name = model_name

    def _get_embeddings(self):
        from langchain_community.embeddings import HuggingFaceEmbeddings
        return HuggingFaceEmbeddings(model_name=self._model_name)

    def index_documents(self) -> None:
        from langchain_community.document_loaders import PyPDFLoader
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        from langchain_community.vectorstores import Chroma

        docs = []
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)

        for pdf_path in self.docs_path.glob("*.pdf"):
            loader = PyPDFLoader(str(pdf_path))
            pages = loader.load()
            chunks = splitter.split_documents(pages)
            for chunk in chunks:
                chunk.metadata["source"] = pdf_path.name
            docs.extend(chunks)

        embeddings = self._get_embeddings()
        from langchain_community.vectorstores import Chroma
        self.vectorstore = Chroma.from_documents(
            documents=docs,
            embedding=embeddings,
            persist_directory=self.persist_path,
        )

    def load_existing_index(self) -> None:
        from langchain_community.vectorstores import Chroma
        embeddings = self._get_embeddings()
        self.vectorstore = Chroma(
            persist_directory=self.persist_path,
            embedding_function=embeddings,
        )

    def query(self, question: str, k: int = 4) -> dict:
        if self.vectorstore is None:
            raise RuntimeError("Index non chargé. Appelez index_documents() ou load_existing_index() d'abord.")

        retriever = self.vectorstore.as_retriever(search_kwargs={"k": k})
        docs = retriever.invoke(question)

        context = "\n\n---\n\n".join([d.page_content for d in docs])
        sources = [
            {
                "source": d.metadata.get("source", ""),
                "page": str(d.metadata.get("page", "")),
                "excerpt": d.page_content[:500].strip(),
            }
            for d in docs
        ]

        answer = f"{len(docs)} passage(s) pertinent(s) trouvé(s) dans les documents réglementaires."

        return {"answer": answer, "sources": sources, "context": context}


_rag_service: RagService | None = None


def get_rag_service() -> RagService:
    global _rag_service
    if _rag_service is None:
        _rag_service = RagService()
        index_path = Path("data/chroma_db")
        if index_path.exists() and any(index_path.iterdir()):
            _rag_service.load_existing_index()
        else:
            _rag_service.index_documents()
    return _rag_service
