from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
from app.core.config import settings

_client = None
COLLECTION_NAME = "document_chunks"
VECTOR_SIZE = 384  # must match the embedding model's output dimension

def get_qdrant_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(path=settings.QDRANT_PATH)
        _ensure_collection(_client)
    return _client

def _ensure_collection(client: QdrantClient):
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in existing:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )

def upsert_chunks(document_id: int, owner_id: int, chunks: list[dict], vectors: list[list[float]]):
    client = get_qdrant_client()
    points = []
    for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
        points.append(PointStruct(
            id=f"{document_id}-{i}",
            vector=vector,
            payload={
                "document_id": document_id,
                "owner_id": owner_id,
                "page": chunk["page"],
                "chunk_index": chunk["chunk_index"],
                "text": chunk["text"],
            },
        ))
    client.upsert(collection_name=COLLECTION_NAME, points=points)

def search_chunks(owner_id: int, query_vector: list[float], document_id: int | None = None, top_k: int = 4):
    client = get_qdrant_client()
    must_filters = [{"key": "owner_id", "match": {"value": owner_id}}]
    if document_id is not None:
        must_filters.append({"key": "document_id", "match": {"value": document_id}})

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter={"must": must_filters},
        limit=top_k,
    )
    return [
        {
            "text": point.payload["text"],
            "page": point.payload["page"],
            "document_id": point.payload["document_id"],
            "score": point.score,
        }
        for point in results.points
    ]