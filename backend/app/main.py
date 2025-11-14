from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import random
from datetime import datetime
from app.services.supabase_client import supabase
from app.services.ai_processor import get_rag_answer, create_query_embedding
from app.services.knowledge_loader import load_all_documents, search_relevant_chunks
from app.services.web_scraper import fetch_multiple_urls
from app.config.urls import LEGAL_URLS

# Initialize FastAPI app
app = FastAPI(title="ADU - Asistentul Digital de Urbanism")

# CORS middleware setup (allow all origins for hackathon)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Pydantic Models
# ============================================

class ChatRequest(BaseModel):
    question: str

class Dossier(BaseModel):
    id: str
    citizen_name: str
    status: str
    extracted_data: dict
    created_at: str

class UploadResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    dossier_id: Optional[str] = None

# ============================================
# Mock API Endpoints
# ============================================

@app.get("/")
def read_root():
    return {"message": "ADU 🎉"}

@app.post("/chatbot")
def chatbot(request: ChatRequest):
    """
    Chatbot endpoint that uses RAG to answer questions based on legal knowledge base.
    """
    try:
        # Load local documents from knowledge_base folder
        local_chunks = load_all_documents()
        
        # Fetch content from configured URLs
        web_chunks = fetch_multiple_urls(LEGAL_URLS) if LEGAL_URLS else []
        
        # Combine all sources
        all_chunks = local_chunks + web_chunks
        
        # Search for relevant chunks based on the question
        context_chunks = search_relevant_chunks(request.question, all_chunks, max_results=3)
        
        # Get answer from AI using RAG with context
        answer = get_rag_answer(request.question, context_chunks)
        
        return {"response": answer}
        
    except Exception as e:
        return {"response": f"Ne cerem scuze, dar a apărut o eroare: {str(e)}"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Document upload endpoint that saves data to Supabase.
    """
    try:
        # Read file content
        file_content = await file.read()
        
        # TODO: Call Person D's extract_data() and check_validity() functions
        # For now, using mock extracted data
        mock_extracted_data = {
            "first_name": "Ion",
            "last_name": "Popescu",
            "cnp": "1234567890123",
            "address": "Str. Mihai Eminescu, nr. 10, București",
            "document_type": "Buletin de Identitate"
        }
        
        # Randomly simulate validation check
        is_valid = random.choice([True, False])
        
        if not is_valid:
            return UploadResponse(
                success=False,
                error="Mock Error: Buletinul dvs. a expirat."
            )
        
        # Save to Supabase
        dossier_data = {
            "citizen_name": f"{mock_extracted_data['first_name']} {mock_extracted_data['last_name']}",
            "status": "Pending",
            "extracted_data": mock_extracted_data,
            "created_at": datetime.utcnow().isoformat()
        }
        
        response = supabase.table("documents").insert(dossier_data).execute()
        
        if response.data and len(response.data) > 0:
            # Get the id from the inserted record
            dossier = response.data[0]
            dossier_id = dossier.get("id")
            
            if dossier_id:
                return UploadResponse(
                    success=True,
                    dossier_id=str(dossier_id)
                )
            else:
                return UploadResponse(
                    success=False,
                    error=f"Dossier saved but no ID returned. Response: {dossier}"
                )
        else:
            return UploadResponse(
                success=False,
                error=f"Failed to save dossier. Response: {response.data}"
            )
            
    except Exception as e:
        return UploadResponse(
            success=False,
            error=f"Error processing upload: {str(e)}"
        )

@app.get("/dossiers", response_model=List[Dossier])
def get_all_dossiers():
    """
    Fetch all dossiers from Supabase for the official's dashboard.
    """
    try:
        response = supabase.table("documents").select("*").execute()
        
        if response.data:
            dossiers = [
                Dossier(
                    id=str(d["id"]),
                    citizen_name=d["citizen_name"],
                    status=d["status"],
                    extracted_data=d["extracted_data"],
                    created_at=d["created_at"]
                )
                for d in response.data
            ]
            return dossiers
        else:
            return []
    except Exception as e:
        # Return empty list on error to avoid breaking the frontend
        print(f"Error fetching dossiers: {str(e)}")
        return []

@app.get("/dossiers/{dossier_id}", response_model=Dossier)
def get_dossier_by_id(dossier_id: str):
    """
    Fetch a single dossier by ID from Supabase.
    """
    try:
        response = supabase.table("documents").select("*").eq("id", dossier_id).execute()
        
        if response.data and len(response.data) > 0:
            d = response.data[0]
            return Dossier(
                id=str(d["id"]),
                citizen_name=d["citizen_name"],
                status=d["status"],
                extracted_data=d["extracted_data"],
                created_at=d["created_at"]
            )
        else:
            raise HTTPException(status_code=404, detail=f"Dossier with id {dossier_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dossier: {str(e)}")
