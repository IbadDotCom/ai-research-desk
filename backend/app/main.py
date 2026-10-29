
from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel

from app.routes.documents import router as documents_router
from app.services.document_store import initialize_store
from app.services.llm import generate_answer
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_store()
    yield


app = FastAPI(
    title="AI Research Desk",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router)

class LLMTestRequest(BaseModel):
    prompt: str


@app.post("/llm-test")
async def llm_test(request: LLMTestRequest):
    answer = await generate_answer(request.prompt)
    return {"answer": answer}


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "project": "AI Research Desk",
    }
