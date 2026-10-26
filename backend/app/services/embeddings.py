
from sentence_transformers import SentenceTransformer

model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2",
    device="cpu",
)


def embed_texts(texts: list[str]):
    return model.encode(
        texts,
        convert_to_tensor=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )


def embed_query(query: str):
    return model.encode(
        query,
        convert_to_tensor=True,
        normalize_embeddings=True,
    )
