
import sqlite3
import json
from pathlib import Path

import torch

DB_PATH = Path(__file__).resolve().parents[2] / "ai_research_desk.db"


def initialize_store():
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                document_id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                chunks TEXT NOT NULL,
                embeddings TEXT NOT NULL
            )
        """)


def save_document(document_id, filename, chunks, embeddings):
    if isinstance(embeddings, torch.Tensor):
        embeddings = embeddings.detach().cpu().tolist()

    with sqlite3.connect(DB_PATH) as connection:
        connection.execute(
            """
            INSERT OR REPLACE INTO documents
            (document_id, filename, chunks, embeddings)
            VALUES (?, ?, ?, ?)
            """,
            (
                document_id,
                filename,
                json.dumps(chunks),
                json.dumps(embeddings),
            ),
        )


def get_document(document_id):
    with sqlite3.connect(DB_PATH) as connection:
        row = connection.execute(
            """
            SELECT filename, chunks, embeddings
            FROM documents
            WHERE document_id = ?
            """,
            (document_id,),
        ).fetchone()

    if row is None:
        return None

    return {
        "filename": row[0],
        "chunks": json.loads(row[1]),
        "embeddings": torch.tensor(json.loads(row[2])),
    }


def list_documents():
    with sqlite3.connect(DB_PATH) as connection:
        rows = connection.execute(
            """
            SELECT document_id, filename, COUNT(*)
            FROM documents
            JOIN json_each(documents.chunks)
            GROUP BY document_id, filename
            """
        ).fetchall()

    return [
        {
            "document_id": row[0],
            "filename": row[1],
            "chunk_count": row[2],
        }
        for row in rows
    ]


def delete_document(document_id):
    with sqlite3.connect(DB_PATH) as connection:
        cursor = connection.execute(
            "DELETE FROM documents WHERE document_id = ?",
            (document_id,),
        )
        return cursor.rowcount > 0
