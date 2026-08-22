import os
import requests
import tempfile

import pymupdf as fitz
from dotenv import load_dotenv

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import (
    GoogleGenerativeAIEmbeddings,
    ChatGoogleGenerativeAI,
)
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is not set in .env")


def extract_pdf_text(pdf_url: str) -> str:
    """Download PDF and extract text using PyMuPDF."""
    try:
        response = requests.get(pdf_url, timeout=30)
        response.raise_for_status()

        with tempfile.NamedTemporaryFile(
            suffix=".pdf",
            delete=False
        ) as tmp:
            tmp.write(response.content)
            tmp_path = tmp.name

        doc = fitz.open(tmp_path)

        text = ""

        for page in doc:
            text += page.get_text()

        doc.close()
        os.unlink(tmp_path)

        return text.strip()

    except Exception as e:
        print(f"Warning: Could not extract PDF text: {e}")
        return ""


def build_documents(
    patient: dict,
    reports: list,
    pdf_url: str = None
) -> list[Document]:

    docs = []

    # -----------------------------
    # Patient profile
    # -----------------------------

    patient_info = f"""
PATIENT PROFILE

Name: {patient.get('name')}
Age: {patient.get('age')}
Gender: {patient.get('gender')}
Blood Group: {patient.get('bloodGroup')}
Patient ID: {patient.get('patientId')}
Contact: {patient.get('contact', 'Not provided')}
""".strip()

    docs.append(
        Document(
            page_content=patient_info,
            metadata={"source": "patient_profile"}
        )
    )

    # -----------------------------
    # Visit reports
    # -----------------------------

    for i, report in enumerate(reports):

        visit_date = report.get(
            "visitDate",
            "Unknown date"
        )

        if isinstance(visit_date, str) and "T" in visit_date:
            visit_date = visit_date[:10]

        report_text = f"""
VISIT REPORT — {visit_date}

Diagnosis: {report.get('diagnosis', 'Not recorded')}

Symptoms: {report.get('symptoms', 'Not recorded')}

Allergies: {report.get('allergies', 'None noted')}

Current Medications: {report.get('currentMedications', 'None noted')}

Lab Results: {report.get('labResults', 'Not recorded')}

Doctor Notes: {report.get('notes', 'None')}
""".strip()

        docs.append(
            Document(
                page_content=report_text,
                metadata={
                    "source": f"visit_report_{i + 1}",
                    "date": str(visit_date)
                }
            )
        )

    # -----------------------------
    # PDF
    # -----------------------------

    if pdf_url:

        pdf_text = extract_pdf_text(pdf_url)

        if pdf_text:

            splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=150,
                separators=[
                    "\n\n",
                    "\n",
                    ". ",
                    " "
                ]
            )

            chunks = splitter.split_text(pdf_text)

            for j, chunk in enumerate(chunks):

                docs.append(
                    Document(
                        page_content=chunk,
                        metadata={
                            "source": f"pdf_chunk_{j + 1}"
                        }
                    )
                )

            print(
                f"PDF extracted: {len(chunks)} chunks "
                f"from {len(pdf_text)} characters"
            )

        else:
            print("PDF extraction returned empty text")

    return docs


def build_prompt():

    system_prompt = """
You are a clinical assistant helping an infectious disease specialist
review a specific patient's medical history.

You have access to the patient's:

- Patient profile
- Visit reports
- Uploaded medical PDF

Answer the doctor's question using ONLY the information
provided in the retrieved patient context.

Rules:

1. Be specific.
2. Use actual dates, values, and medical terms from the records.
3. Never invent medical values.
4. Never guess information.
5. If the answer is not present in the context, say:

"This information is not available in the patient's records."

6. Keep answers concise and clinically useful.
7. Use previous conversation context when it is relevant.
"""

    return ChatPromptTemplate.from_messages(
        [
            (
                "system",
                system_prompt
            ),
            (
                "human",
                """
Patient context:

{context}

Previous conversation:

{chat_history}

Doctor's question:

{question}

Clinical answer:
"""
            )
        ]
    )


def build_rag_chain(
    patient: dict,
    reports: list,
    pdf_url: str = None,
    chat_history: list = None
):

    # -----------------------------
    # 1. Build documents
    # -----------------------------

    documents = build_documents(
        patient,
        reports,
        pdf_url
    )

    print(
        f"Total documents built: {len(documents)}"
    )

    if not documents:
        raise ValueError(
            "No patient documents were created."
        )

    # -----------------------------
    # 2. Gemini embeddings
    # -----------------------------

    embeddings = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001",
    google_api_key=GEMINI_API_KEY
)

    # -----------------------------
    # 3. Chroma vector store
    # -----------------------------

    vectorstore = Chroma.from_documents(
        documents=documents,
        embedding=embeddings
    )

    # -----------------------------
    # 4. Retriever
    # -----------------------------

    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={
            "k": 5
        }
    )

    # -----------------------------
    # 5. Gemini LLM
    # -----------------------------

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=GEMINI_API_KEY,
        temperature=0.2
    )

    # -----------------------------
    # 6. Prompt
    # -----------------------------

    prompt = build_prompt()

    # -----------------------------
    # 7. Custom RAG chain
    # -----------------------------

    def rag_invoke(inputs):

        question = inputs["question"]

        # Retrieve relevant patient information
        retrieved_docs = retriever.invoke(question)

        context = "\n\n".join(
            doc.page_content
            for doc in retrieved_docs
        )

        # Convert chat history into readable text
        history_text = ""

        if chat_history:

            history_parts = []

            for turn in chat_history:

                history_parts.append(
                    f"Doctor: {turn['question']}"
                )

                history_parts.append(
                    f"Assistant: {turn['answer']}"
                )

            history_text = "\n".join(
                history_parts
            )

        # Build prompt
        messages = prompt.invoke(
            {
                "context": context,
                "chat_history": history_text,
                "question": question
            }
        )

        # Call Gemini
        response = llm.invoke(messages)

        return {
            "answer": response.content
        }

    class RAGChain:

        def invoke(self, inputs):

            return rag_invoke(inputs)

    return RAGChain()