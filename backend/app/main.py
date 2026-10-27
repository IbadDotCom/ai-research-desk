
from fastapi import FastAPI
from app.routes.documents import router as documents_router
from pydantic import BaseModel
from app.services.llm import generate_answer

app = FastAPI(title="AI Research Desk")

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
        "project": "AI Research Desk"
    }
