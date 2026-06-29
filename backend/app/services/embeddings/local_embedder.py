from sentence_transformers import SentenceTransformer

_model = None

def get_embedder():
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

def embed_texts(texts: list[str]) -> list[list[float]]:
    model = get_embedder()
    embeddings = model.encode(texts, show_progress_bar=False)
    return embeddings.tolist()