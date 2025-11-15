from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import random
from datetime import datetime

from app.services.supabase_client import supabase
from app.services.ai_processor import (
    get_rag_answer,
    create_query_embedding,
    validate_id_card,
    extract_metadata,
)
from app.services.knowledge_loader import load_all_documents, search_relevant_chunks
from app.services.document_classifier import detect_document_type
from app.services.web_scraper import fetch_multiple_urls
from app.services.document_requirements import (
    list_all_procedures,
    get_procedure_requirements,
    check_missing_documents,
)
from app.config.urls import LEGAL_URLS

# 🔹 NOU – pentru prioritizare cereri
from app.services.prioritization import Application, prioritize_applications

# 🔹 NOU – pentru autentificare Clerk pe endpoint
from app.middleware.clerk_auth import get_current_user


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
    procedure: Optional[str] = None  # Selected procedure key
    uploaded_documents: Optional[List[str]] = None  # List of uploaded doc types

class Dossier(BaseModel):
    id: str
    citizen_name: str
    status: str
    extracted_data: dict
    created_at: str

class DocumentResult(BaseModel):
    filename: str
    document_type: str
    is_valid: bool
    validation_message: str
    extracted_data: dict

class UploadResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    dossier_id: Optional[str] = None
    documents_processed: Optional[List[DocumentResult]] = None
    missing_documents: Optional[List[str]] = None
    summary: Optional[str] = None
    procedure: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    detected_procedure: Optional[str] = None
    needs_documents: bool = False
    suggested_action: str = ""
    available_procedures: List[dict] = []

# ============================================
# Mock API Endpoints
# ============================================

@app.get("/")
def read_root():
    return {"message": "ADU 🎉"}

@app.post("/chatbot", response_model=ChatResponse)
def chatbot(request: ChatRequest):
    """
    Context-aware chatbot that helps citizens understand what documents they need.
    
    The chatbot:
    1. Identifies what the citizen wants to do (build, demolish, etc.)
    2. Lists required documents for that procedure
    3. Tracks uploaded documents and shows what's missing
    4. Answers questions about urbanism using RAG
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
        
        # Build conversation context
        conversation_context = {}
        if request.procedure:
            conversation_context["procedure"] = request.procedure
        if request.uploaded_documents:
            conversation_context["uploaded_documents"] = request.uploaded_documents
        
        # Get answer from AI using RAG with context
        ai_response = get_rag_answer(request.question, context_chunks, conversation_context)
        
        # Get list of available procedures
        procedures = list_all_procedures()
        
        return ChatResponse(
            answer=ai_response.get("answer", ""),
            detected_procedure=ai_response.get("detected_procedure"),
            needs_documents=ai_response.get("needs_documents", False),
            suggested_action=ai_response.get("suggested_action", ""),
            available_procedures=procedures
        )
        
    except Exception as e:
        return ChatResponse(
            answer=f"Ne cerem scuze, dar a apărut o eroare: {str(e)}",
            detected_procedure=None,
            needs_documents=False,
            suggested_action="retry",
            available_procedures=[]
        )

@app.get("/procedures")
def get_procedures():
    """
    Get all available procedures and their document requirements.
    """
    return {"procedures": list_all_procedures()}

@app.get("/procedures/{procedure_key}")
def get_procedure_details(procedure_key: str):
    """
    Get detailed requirements for a specific procedure.
    """
    procedure = get_procedure_requirements(procedure_key)
    if not procedure:
        raise HTTPException(status_code=404, detail=f"Procedura '{procedure_key}' nu există")
    return procedure

@app.post("/upload")
async def upload_documents(
    files: List[UploadFile] = File(..., description="Upload one or more documents"),
    procedure: Optional[str] = None
):
    """
    Upload one or multiple documents. AI automatically detects document type
    (ID card, cadastral plan, property deed) and validates each one.
    Returns detailed feedback about all documents.
    
    In Swagger UI: Click "Add string item" to add each file.
    """
    try:
        if not files:
            return UploadResponse(
                success=False,
                error="Niciun document încărcat. Vă rugăm să încărcați cel puțin un document."
            )
        documents_processed = []
        all_extracted_data = {}
        has_id_card = False
        has_cadastral = False
        has_property_deed = False
        citizen_name = "N/A"
        
        # Process each uploaded file
        for file in files:
            file_content = await file.read()
            
            # Use AI to automatically detect document type from image/PDF content
            doc_type = detect_document_type(file_content, file.filename)
            
            if doc_type == "unknown":
                # If AI can't determine, skip this file
                documents_processed.append(DocumentResult(
                    filename=file.filename,
                    document_type="unknown",
                    is_valid=False,
                    validation_message="Nu pot determina tipul documentului. Vă rugăm să încărcați un document valid (carte de identitate, plan cadastral, act de proprietate sau certificat de urbanism).",
                    extracted_data={}
                ))
                continue
            
            # Validate if it's an ID card
            if doc_type == "carte_identitate":
                validation_result = validate_id_card(file_content)
                is_valid = validation_result.get("is_valid", False)
                validation_message = validation_result.get("message", "")
                
                if is_valid:
                    has_id_card = True
            elif doc_type == "certificat_urbanism":
                # Urban certificate - we accept it as valid
                is_valid = True
                validation_message = "Certificat de urbanism acceptat"
            else:
                # For other document types (cadastral, property), we assume they're valid
                is_valid = True
                validation_message = f"Document de tip '{doc_type}' acceptat"
            
            # Extract metadata only for document types we support
            if doc_type in ["carte_identitate", "plan_cadastral", "act_proprietate"]:
                extracted_data = extract_metadata(file_content, doc_type)
            else:
                # For certificat_urbanism or other types, we don't extract structured data yet
                extracted_data = {"document_type": doc_type, "status": "acceptat"}
            
            if "error" not in extracted_data:
                all_extracted_data.update(extracted_data)
                
                # Update document type flags
                if doc_type == "carte_identitate" and is_valid:
                    has_id_card = True
                    citizen_name = f"{extracted_data.get('prenume', 'N/A')} {extracted_data.get('nume', 'N/A')}"
                elif doc_type == "plan_cadastral":
                    has_cadastral = True
                elif doc_type == "act_proprietate":
                    has_property_deed = True
            
            # Record result for this document
            documents_processed.append(DocumentResult(
                filename=file.filename,
                document_type=doc_type,
                is_valid=is_valid,
                validation_message=validation_message,
                extracted_data=extracted_data if "error" not in extracted_data else {}
            ))
        
        # Check what's missing based on procedure (if specified)
        missing_documents = []
        uploaded_doc_types = [doc.document_type for doc in documents_processed if doc.document_type != "unknown"]
        
        if procedure:
            # Check against specific procedure requirements
            check_result = check_missing_documents(procedure, uploaded_doc_types)
            if not check_result.get("error"):
                if not check_result["has_all_required"]:
                    missing_documents = [doc["description"] for doc in check_result["missing_required"]]
                    status = "Incomplete"
                    summary = f"Lipsesc pentru {check_result['procedure']}: {', '.join(missing_documents)}"
                else:
                    status = "Complete"
                    summary = f"Toate documentele necesare pentru {check_result['procedure']} au fost încărcate!"
            else:
                # Unknown procedure, fallback to basic check
                if not has_id_card:
                    missing_documents.append("Carte de identitate (validă și neexpirată)")
                status = "Incomplete" if missing_documents else "Complete"
                summary = f"Lipsesc: {', '.join(missing_documents)}" if missing_documents else "Documente încărcate cu succes!"
        else:
            # No procedure specified, just basic validation
            if not has_id_card:
                missing_documents.append("Carte de identitate (validă și neexpirată)")
            status = "Incomplete" if missing_documents else "Complete"
            summary = f"Lipsesc: {', '.join(missing_documents)}" if missing_documents else "Documente încărcate cu succes! Selectați o procedură pentru verificare completă."
        
        # Save to database - using only fields that exist in your schema
        dossier_data = {
            "extracted_data": all_extracted_data,
            "created_at": datetime.utcnow().isoformat()
        }
        
        try:
            response = supabase.table("documents").insert(dossier_data).execute()
            
            if response.data and len(response.data) > 0:
                dossier_id = response.data[0].get("id")
            else:
                dossier_id = None
        except Exception as db_error:
            # Database save failed, but we can still return the results
            print(f"Database error (non-fatal): {db_error}")
            dossier_id = None
        
        # Return results even if database save failed
        return UploadResponse(
            success=True,
            dossier_id=str(dossier_id) if dossier_id else None,
            documents_processed=documents_processed,
            missing_documents=missing_documents if missing_documents else None,
            summary=summary,
            procedure=procedure
        )
            
    except Exception as e:
        return UploadResponse(
            success=False,
            error=f"Eroare la procesarea documentelor: {str(e)}"
        )

@app.post("/upload-single")
async def upload_single_document(file: UploadFile = File(...)):
    """
    Upload a single document (simpler endpoint for testing).
    AI automatically detects document type and validates it.
    """
    try:
        file_content = await file.read()
        
        # Use AI to automatically detect document type from image/PDF content
        doc_type = detect_document_type(file_content, file.filename)
        
        # Validate if it's an ID card
        if doc_type == "carte_identitate":
            validation_result = validate_id_card(file_content)
            is_valid = validation_result.get("is_valid", False)
            validation_message = validation_result.get("message", "")
        else:
            is_valid = True
            validation_message = "Document acceptat"
        
        # Extract metadata
        extracted_data = extract_metadata(file_content, doc_type)
        
        if "error" in extracted_data:
            return UploadResponse(
                success=False,
                error=f"Eroare la extragerea datelor: {extracted_data['error']}"
            )
        
        # Create response
        doc_result = DocumentResult(
            filename=file.filename,
            document_type=doc_type,
            is_valid=is_valid,
            validation_message=validation_message,
            extracted_data=extracted_data
        )
        
        return UploadResponse(
            success=is_valid,
            error=None if is_valid else validation_message,
            documents_processed=[doc_result],
            summary=f"Document procesat: {doc_type}"
        )
        
    except Exception as e:
        return UploadResponse(
            success=False,
            error=f"Eroare: {str(e)}"
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

@app.get("/requests/prioritized")
def get_user_prioritized_requests(user=Depends(get_current_user)):
    user_id = user["id"]  # Clerk user ID

    # 1. luăm DOAR cererile userului curent
    res = (
        supabase.table("requests")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", "pending")
        .execute()
    )

    rows = res.data or []

    # 2. mapăm
    apps: list[Application] = []
    for r in rows:
        submitted_at = datetime.fromisoformat(r["submitted_at"])
        legal_due = (
            datetime.fromisoformat(r["legal_due_date"])
            if r.get("legal_due_date")
            else None
        )
        apps.append(
            Application(
                id=str(r["id"]),
                flow_type=r.get("flow_type", "necunoscut"),
                submitted_at=submitted_at,
                legal_due_date=legal_due,
                status=r.get("status", "pending"),
            )
        )

    # 3. prioritizare
    prioritized = prioritize_applications(apps)

    return [
        {
            "id": item["id"],
            "flow_type": item["flow_type"],
            "submitted_at": item["submitted_at"],
            "legal_due_date": item["legal_due_date"],
            "days_left": item["days_left"],
            "backlog_in_category": item["backlog_in_category"],
            "priority_score": item["priority_score"],
        }
        for item in prioritized
    ]
def _parse_iso(dt_str: str) -> datetime:
    """Mic helper pentru stringuri ISO de la Supabase (cu sau fără Z)."""
    if dt_str is None:
        return None
    # Supabase trimite de obicei gen '2025-11-15T10:23:45.123456+00:00' sau cu 'Z'
    return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))


@app.get("/clerk/requests/status")
def get_user_requests_status(user=Depends(get_current_user)):
    """
    Returnează pentru utilizatorul curent:
    - toate cererile lui
    - statusul + prioritatea (zile rămase, scor)
    - documentele aferente fiecărei cereri
    - ce documente mai lipsesc conform procedurii
    """
    user_id = user["id"]  # Clerk user ID

    # 1. Cererile userului (indiferent de status, sau poți filtra doar pending)
    res_req = (
        supabase.table("requests")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    req_rows = res_req.data or []

    # 2. Mapăm la Application pentru calcul de prioritate
    apps: List[Application] = []
    for r in req_rows:
        submitted_at = _parse_iso(r["submitted_at"])
        legal_due = _parse_iso(r["legal_due_date"]) if r.get("legal_due_date") else None

        apps.append(
            Application(
                id=str(r["id"]),
                flow_type=r.get("flow_type", "necunoscut"),
                submitted_at=submitted_at,
                legal_due_date=legal_due,
                status=r.get("status", "pending"),
            )
        )

    # 3. Calculăm prioritatea pentru toate cererile
    prioritized_list = prioritize_applications(apps)
    stats_by_id = {item["id"]: item for item in prioritized_list}

    result = []

    # 4. Pentru fiecare cerere: documente + docs lipsă
    for r in req_rows:
        request_id = str(r["id"])
        flow_type = r.get("flow_type")
        status = r.get("status")

        # info de prioritate
        stats = stats_by_id.get(request_id, {})

        # 4a. Documentele atașate cererii
        docs_res = (
            supabase.table("documents")
            .select("*")
            .eq("request_id", request_id)
            .execute()
        )
        docs_rows = docs_res.data or []

        documents = [
            {
                "id": str(d["id"]),
                "doc_type": d.get("doc_type"),
                "status": d.get("status"),
                "is_valid": d.get("is_valid"),
                "uploaded_at": d.get("uploaded_at"),
            }
            for d in docs_rows
        ]

        uploaded_types = [
            d["doc_type"]
            for d in documents
            if d.get("doc_type")
        ]

        # 4b. Ce documente mai lipsesc pentru procedura respectivă
        missing_docs = None
        if flow_type:
            try:
                # presupunem semnătura: check_missing_documents(flow_type, uploaded_types)
                missing_info = check_missing_documents(flow_type, uploaded_types)
                # dacă funcția ta întoarce dict cu cheie 'missing_documents' sau 'missing'
                if isinstance(missing_info, dict):
                    missing_docs = (
                        missing_info.get("missing_documents")
                        or missing_info.get("missing")
                        or missing_info
                    )
                else:
                    missing_docs = missing_info
            except Exception:
                # dacă ceva crapă, nu blocăm endpoint-ul, doar nu afișăm lipsurile
                missing_docs = None

        result.append(
            {
                "id": request_id,
                "flow_type": flow_type,
                "status": status,
                "submitted_at": r.get("submitted_at"),
                "legal_due_date": r.get("legal_due_date"),
                "priority": {
                    "days_left": stats.get("days_left"),
                    "priority_score": stats.get("priority_score"),
                    "backlog_in_category": stats.get("backlog_in_category"),
                },
                "documents": documents,
                "missing_documents": missing_docs,
            }
        )

    return result
