
from io import BytesIO
import uuid

import pymupdf
from fastapi import APIRouter, File, HTTPException, UploadFile
from sentence_transformers import util

from app.schemas import SearchRequest
from app.services.chunking import split_into_chunks
from app.services.embeddings import embed_texts, embed_query
from app.services.document_store import (
    save_document,
    get_document,
    list_documents,
    delete_document,
)
from app.services.rag import answer_question

router = APIRouter()

MAX_FILE_SIZE = 20 * 1024 * 1024


@router.post("/documents/index")
async def index_pdf(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Please upload a PDF file.")

    content = await file.read(MAX_FILE_SIZE + 1)

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, "PDF must be 20 MB or smaller.")

    try:
        with pymupdf.open(
            stream=BytesIO(content),
            filetype="pdf",
        ) as pdf:
            chunks = []

            for page_number, page in enumerate(pdf, start=1):
                for chunk_text in split_into_chunks(page.get_text()):
                    chunks.append({
                        "chunk_id": len(chunks) + 1,
                        "page": page_number,
                        "text": chunk_text,
                    })

    except Exception:
        raise HTTPException(400, "Could not read this PDF.")

    if not chunks:
        raise HTTPException(400, "No extractable text found.")

    try:
        embeddings = embed_texts(
            [chunk["text"] for chunk in chunks]
        )
    except Exception:
        raise HTTPException(
            500, "Could not generate document embeddings."
        )

    document_id = str(uuid.uuid4())

    try:
        save_document(
            document_id=document_id,
            filename=file.filename,
            chunks=chunks,
            embeddings=embeddings,
        )
    except Exception:
        raise HTTPException(500, "Could not save indexed document.")

    return {
        "document_id": document_id,
        "filename": file.filename,
        "chunk_count": len(chunks),
        "message": "Document indexed successfully.",
    }


@router.get("/documents")
def get_documents():
    return {"documents": list_documents()}


@router.delete("/documents/{document_id}")
def remove_document(document_id: str):
    if not delete_document(document_id):
        raise HTTPException(404, "Document not found.")

    return {
        "document_id": document_id,
        "message": "Document deleted successfully.",
    }


@router.post("/documents/{document_id}/search")
def search_document(
    document_id: str,
    request: SearchRequest,
):
    document = get_document(document_id)

    if document is None:
        raise HTTPException(404, "Document not found. Please index the PDF again.")

    query_embedding = embed_query(request.query)

    scores = util.cos_sim(
        query_embedding,
        document["embeddings"],
    )[0]

    k = min(request.top_k, len(document["chunks"]))
    top_results = scores.topk(k)

    results = []

    for score, index in zip(
        top_results.values.tolist(),
        top_results.indices.tolist(),
    ):
        chunk = document["chunks"][index]

        results.append({
            "chunk_id": chunk["chunk_id"],
            "page": chunk["page"],
            "similarity": round(score, 4),
            "text": chunk["text"],
        })

    return {
        "document_id": document_id,
        "query": request.query,
        "results": results,
    }


@router.post("/documents/{document_id}/ask")
async def ask_document(
    document_id: str,
    request: SearchRequest,
):
    return await answer_question(
        document_id=document_id,
        question=request.query,
        top_k=request.top_k,
    )
