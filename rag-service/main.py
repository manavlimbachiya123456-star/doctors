from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from rag import build_rag_chain


app = FastAPI(title="Patient RAG Service")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Report(BaseModel):
    visitDate: Optional[str] = None
    diagnosis: Optional[str] = None
    symptoms: Optional[str] = None
    allergies: Optional[str] = None
    currentMedications: Optional[str] = None
    labResults: Optional[str] = None
    notes: Optional[str] = None


class Patient(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    bloodGroup: Optional[str] = None
    patientId: Optional[str] = None
    contact: Optional[str] = None
    pdfPath: Optional[str] = None


class ChatTurn(BaseModel):
    question: str
    answer: str


class ChatRequest(BaseModel):
    patient: Patient
    reports: List[Report]
    question: str
    chatHistory: Optional[List[ChatTurn]] = None


class ChatResponse(BaseModel):
    answer: str


@app.get("/")
def health():
    return {"status": "RAG service running"}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    try:
        print(f"\n💬 Question: {req.question}")

        print(
            f"📋 Patient: {req.patient.name}, "
            f"Reports: {len(req.reports)}, "
            f"PDF: {'yes' if req.patient.pdfPath else 'no'}"
        )

        chain = build_rag_chain(
            patient=req.patient.model_dump(),
            reports=[
                r.model_dump()
                for r in req.reports
            ],
            pdf_url=req.patient.pdfPath,
            chat_history=[
                t.model_dump()
                for t in (req.chatHistory or [])
            ],
        )

        result = chain.invoke({
            "question": req.question
        })

        answer = result.get(
            "answer",
            "Sorry, I could not generate an answer."
        )

        print(
            f"✅ Answer generated: {answer[:100]}..."
        )

        return ChatResponse(answer=answer)

    except Exception as e:
        print(f"❌ RAG error: {e}")

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )