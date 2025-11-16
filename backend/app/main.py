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
    extract_procedure_requirements,
    validate_and_guide_dossier,
)
from app.services.knowledge_loader import load_all_documents, search_relevant_chunks
from app.services.document_classifier import detect_document_type
from app.services.web_scraper import fetch_multiple_urls
from app.services.urban_info_helper import (
    detect_urban_info_request,
    get_urban_info_instructions,
    extract_cadastral_code_from_text,
    extract_address_from_text,
    get_troubleshooting_tips,
)
from app.services.document_requirements import (
    list_all_procedures,
    get_procedure_requirements,
    check_missing_documents,
)
from app.services.city_hall_domains import (
    list_all_domains,
    list_all_extended_procedures,
    detect_domain_from_question,
    get_procedures_by_domain,
    CITY_HALL_DOMAINS,
    EXTENDED_PROCEDURES,
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

class DocumentInfo(BaseModel):
    type: str
    status: str
    filename: str
    message: Optional[str] = None

class ChatRequest(BaseModel):
    question: str
    user_id: Optional[str] = None  # User ID for conversation history
    procedure: Optional[str] = None  # Selected procedure key
    uploaded_documents: Optional[List[str]] = None  # List of uploaded doc types
    uploaded_documents_info: Optional[List[DocumentInfo]] = None  # Detailed document info

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
    detected_domain: Optional[str] = None
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
    5. Maintains conversation history for context
    """
    try:
        # Check if user is requesting urban information extract
        if detect_urban_info_request(request.question):
            # Extract cadastral code from question if provided (priority)
            cadastral_code = extract_cadastral_code_from_text(request.question)
            
            # If no cadastral code, try to extract address
            address = None
            if not cadastral_code:
                address = extract_address_from_text(request.question)
            
            # Get instructions for downloading urban info
            instructions = get_urban_info_instructions(cadastral_code, address)
            
            # If user is asking for troubleshooting
            if any(word in request.question.lower() for word in ["problem", "eroare", "nu merge", "nu functioneaza", "nu gasesc"]):
                instructions["message"] += f"\n\n{get_troubleshooting_tips()}"
            
            # Save conversation to history
            if request.user_id:
                try:
                    supabase.table("chat_messages").insert({
                        "user_id": request.user_id,
                        "role": "user",
                        "content": request.question
                    }).execute()
                    
                    supabase.table("chat_messages").insert({
                        "user_id": request.user_id,
                        "role": "assistant",
                        "content": instructions["message"]
                    }).execute()
                except Exception as save_err:
                    print(f"Warning: Could not save chat history: {save_err}")
            
            return ChatResponse(
                answer=instructions["message"],
                detected_procedure="informare_urbanism",
                detected_domain="urbanism",
                needs_documents=False,
                suggested_action="download_urban_info" if not instructions["needs_cadastral_code"] else "provide_cadastral_code",
                available_procedures=[]
            )
        
        # 1. Load conversation history if user_id provided
        conversation_history = []
        if request.user_id:
            try:
                history_response = supabase.table("chat_messages").select("*").eq("user_id", request.user_id).order("created_at", desc=False).limit(20).execute()
                if history_response.data:
                    conversation_history = [
                        {"role": msg["role"], "content": msg["content"]}
                        for msg in history_response.data
                    ]
            except Exception as hist_err:
                print(f"Warning: Could not load chat history: {hist_err}")
        
        # 2. Get user's uploaded documents with validation status from database
        uploaded_docs_from_db = []
        if request.user_id:
            try:
                # Join with requests table to filter documents by user_id
                docs_response = supabase.table("documents").select("*, requests!inner(user_id)").eq("requests.user_id", request.user_id).execute()
                if docs_response.data:
                    uploaded_docs_from_db = [
                        {
                            "type": doc.get("document_type_ai") or doc.get("document_type") or "unknown",
                            "status": doc.get("validation_status", "unknown"),
                            "filename": doc.get("file_name", "N/A"),
                            "message": doc.get("validation_message", "")
                        }
                        for doc in docs_response.data
                    ]
            except Exception as docs_err:
                print(f"Warning: Could not load documents: {docs_err}")
        
        # 3. Load local documents from knowledge_base folder
        local_chunks = load_all_documents()
        
        # Fetch content from configured URLs
        web_chunks = fetch_multiple_urls(LEGAL_URLS) if LEGAL_URLS else []
        
        # Combine all sources
        all_chunks = local_chunks + web_chunks
        
        # Search for relevant chunks based on the question
        context_chunks = search_relevant_chunks(request.question, all_chunks, max_results=3)
        
        # 4. Build conversation context
        conversation_context = {}
        
        # Extract previously detected domain from conversation history
        detected_domain_from_history = None
        for msg in reversed(conversation_history):
            if "[SYSTEM] CONTEXT: Domain detected" in msg.get("content", ""):
                try:
                    detected_domain_from_history = msg["content"].split("=")[-1].strip()
                    break
                except:
                    pass
        
        if detected_domain_from_history:
            conversation_context["detected_domain"] = detected_domain_from_history
        
        if request.procedure:
            conversation_context["procedure"] = request.procedure

        # --- START NOUA LOGICĂ ---
        # Verificăm documentele ÎNAINTE de a apela AI-ul, dacă avem o procedură și documente
        if request.procedure and request.uploaded_documents_info:
            
            # Extragem tipurile de documente valide din contextul primit de la frontend
            uploaded_doc_types = [
                doc.type 
                for doc in request.uploaded_documents_info 
                if doc.status == "approved" or doc.status == "validated" # Folosim statusul din frontend
            ]
            
            # Apelăm funcția de verificare a cerințelor
            check_result = check_missing_documents(request.procedure, uploaded_doc_types)
            
            if not check_result.get("error"):
                # Adăugăm informațiile despre documente lipsă în contextul conversației
                conversation_context["requirements_check"] = {
                    "has_all_required": check_result.get("has_all_required", False),
                    "missing_required": [doc["description"] for doc in check_result.get("missing_required", [])],
                    "uploaded_count": check_result.get("uploaded_count", 0),
                    "required_count": check_result.get("required_count", 0)
                }

        # Adăugăm detaliile documentelor (așa cum era și înainte)
        if request.uploaded_documents_info:
            conversation_context["documents_details"] = [
                {
                    "type": doc.type,
                    "status": doc.status,
                    "filename": doc.filename,
                    "validation_message": doc.message
                }
                for doc in request.uploaded_documents_info
            ]
        # --- SFÂRȘIT NOUA LOGICĂ ---

        # 8. Get answer from AI using RAG with context and conversation history
        ai_response = get_rag_answer(
            request.question, 
            context_chunks, 
            conversation_context,
            conversation_history
        )
        
        # 9. Save user message and AI response to database
        if request.user_id:
            try:
                # Save user message
                supabase.table("chat_messages").insert({
                    "user_id": request.user_id,
                    "role": "user",
                    "content": request.question
                }).execute()
                
                # Save AI response
                supabase.table("chat_messages").insert({
                    "user_id": request.user_id,
                    "role": "assistant",
                    "content": ai_response.get("answer", "")
                }).execute()
            except Exception as save_err:
                print(f"Warning: Could not save chat messages: {save_err}")
        
        # Get list of available procedures (extended version with all domains)
        procedures = list_all_extended_procedures()
        
        # Detect domain from question if not already detected by AI
        detected_domain = ai_response.get("detected_domain")
        if not detected_domain and request.question:
            detected_domain = detect_domain_from_question(request.question)
        
        # If domain is detected, save it to conversation context for next message
        if detected_domain and request.user_id:
            try:
                # Store detected domain as assistant message with [SYSTEM] prefix
                supabase.table("chat_messages").insert({
                    "user_id": request.user_id,
                    "role": "assistant",
                    "content": f"[SYSTEM] CONTEXT: Domain detected = {detected_domain}"
                }).execute()
            except Exception as domain_save_err:
                print(f"Warning: Could not save domain context: {domain_save_err}")
        
        return ChatResponse(
            answer=ai_response.get("answer", ""),
            detected_procedure=ai_response.get("detected_procedure"),
            detected_domain=detected_domain,
            needs_documents=ai_response.get("needs_documents", False),
            suggested_action=ai_response.get("suggested_action", ""),
            available_procedures=procedures
        )
        
    except Exception as e:
        return ChatResponse(
            answer=f"Ne cerem scuze, dar a apărut o eroare: {str(e)}",
            detected_procedure=None,
            detected_domain=None,
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
    procedure: Optional[str] = None,
    user_id: Optional[str] = None
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
        
        # Check for existing documents if user_id is provided
        existing_doc_types = []
        if user_id:
            try:
                existing_docs_response = supabase.table("documents").select("document_type_ai, requests!inner(user_id)").eq("requests.user_id", user_id).execute()
                if existing_docs_response.data:
                    existing_doc_types = [doc.get("document_type_ai") for doc in existing_docs_response.data if doc.get("document_type_ai")]
            except Exception as existing_err:
                print(f"Warning: Could not check existing documents: {existing_err}")
        
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
            
            # Check if this document type was already uploaded
            if doc_type in existing_doc_types:
                documents_processed.append(DocumentResult(
                    filename=file.filename,
                    document_type=doc_type,
                    is_valid=False,
                    validation_message=f"⚠️ Ai încărcat deja un document de tip '{doc_type}'. Nu poți încărca același tip de document de două ori. Dacă vrei să înlocuiești documentul, te rugăm să ștergi cel vechi mai întâi.",
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
        
        # Try to detect procedure if not specified
        detected_procedure = procedure
        if not detected_procedure:
            # Auto-detect based on uploaded documents
            if "certificat_urbanism" in uploaded_doc_types:
                detected_procedure = "autorizatie_construire"  # Most common next step
            elif "plan_cadastral" in uploaded_doc_types and "act_proprietate" in uploaded_doc_types:
                detected_procedure = "certificat_urbanism"  # Likely want CU
            
        if detected_procedure:
            # Check against specific procedure requirements
            check_result = check_missing_documents(detected_procedure, uploaded_doc_types)
            if not check_result.get("error"):
                if not check_result["has_all_required"]:
                    missing_documents = [doc["description"] for doc in check_result["missing_required"]]
                    status = "Incomplete"
                    summary = f"Lipsesc pentru {check_result['procedure']}: {', '.join(missing_documents)}"
                else:
                    status = "Complete"
                    summary = f"Toate documentele necesare pentru {check_result['procedure']} au fost încărcate!"
            else:
                # Unknown procedure - don't assume anything
                status = "Unknown"
                summary = f"Procedura '{detected_procedure}' nu este recunoscută. Documentele au fost procesate, dar nu pot verifica ce lipsește."
        else:
            # No procedure detected - just accept what was uploaded
            status = "Uploaded"
            valid_count = len([doc for doc in documents_processed if doc.is_valid])
            summary = f"Am procesat {valid_count} document(e). Selectează o procedură în chatbot pentru a verifica ce mai lipsește."
        
        # Save files to Supabase storage temporarily (not to database yet)
        # User will review validation in chatbot and confirm before saving to DB
        if user_id:
            for i, file in enumerate(files):
                if documents_processed[i].is_valid:
                    try:
                        file_path = f"documents/{user_id}/{file.filename}"
                        file.file.seek(0)  # Reset file pointer
                        file_content = await file.read()
                        
                        # Upload to Supabase storage
                        supabase.storage.from_("documents").upload(
                            file_path,
                            file_content,
                            {"content-type": file.content_type or "application/octet-stream"}
                        )
                    except Exception as storage_err:
                        print(f"Storage upload warning for {file.filename}: {storage_err}")
                        # Continue anyway - storage is not critical for validation
        
        # Prepare summary for chatbot review
        valid_docs = [doc for doc in documents_processed if doc.is_valid]
        invalid_docs = [doc for doc in documents_processed if not doc.is_valid]
        
        # Build detailed summary with missing documents info
        if invalid_docs:
            summary = f"⚠️ {len(invalid_docs)} document(e) au probleme:\n"
            for doc in invalid_docs:
                summary += f"\n• {doc.filename}: {doc.validation_message}"
            if valid_docs:
                summary += f"\n\n✅ {len(valid_docs)} document(e) sunt valide."
            if missing_documents:
                summary += f"\n\n📋 Lipsesc: {', '.join(missing_documents)}"
            summary += "\n\n💬 Consultă chatbot-ul pentru ajutor în corectarea problemelor."
        elif valid_docs:
            if missing_documents:
                summary = f"✅ Documentele încărcate sunt valide!\n\n⚠️ Dar lipsesc: {', '.join(missing_documents)}\n\n💬 Mergi la chatbot pentru detalii."
            else:
                summary = f"✅ Toate documentele sunt valide și complete!\n\n💬 Mergi la chatbot pentru a confirma și trimite dosarul."
        else:
            summary = "❌ Nu s-a putut valida niciun document. Verifică fișierele și încearcă din nou."
        
        # Return results
        return UploadResponse(
            success=True,
            dossier_id=None,  # No dossier until confirmed
            documents_processed=documents_processed,
            missing_documents=missing_documents if missing_documents else None,
            summary=summary,
            procedure=detected_procedure  # Return detected or specified procedure
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

class ConfirmDocumentsRequest(BaseModel):
    user_id: str
    documents: List[dict]
    files_data: Optional[List[dict]] = None  # [{ filename, content_base64, content_type }]
    procedure: Optional[str] = None

@app.post("/confirm-documents")
async def confirm_documents(req: ConfirmDocumentsRequest):
    """
    Save validated documents to database after user confirms in chatbot.
    This is called AFTER the user reviews validation results in chat.
    """
    try:
        if not req.documents:
            raise HTTPException(status_code=400, detail="No documents provided")
        
        # Check if we have all required documents for the procedure
        if req.procedure:
            uploaded_doc_types = [doc.get('document_type') for doc in req.documents if doc.get('is_valid')]
            check_result = check_missing_documents(req.procedure, uploaded_doc_types)
            
            if not check_result.get("error") and not check_result["has_all_required"]:
                missing_docs = [doc["description"] for doc in check_result["missing_required"]]
                return {
                    "success": False,
                    "error": "missing_documents",
                    "missing": missing_docs,
                    "message": f"Lipsesc documente pentru {check_result['procedure']}: {', '.join(missing_docs)}"
                }
        
        # Extract metadata from all documents
        all_extracted_data = {}
        for doc in req.documents:
            if doc.get('extracted_data'):
                all_extracted_data.update(doc.get('extracted_data', {}))
        
        # Create request in database
        request_data = {
            "user_id": req.user_id,
            "request_type": req.procedure if req.procedure else "other",
            "status": "pending_validation",
            "extracted_metadata": all_extracted_data,
            "priority": 0
        }
        
        print(f"🔄 Attempting to create request with data: {request_data}")
        
        try:
            request_response = supabase.table("requests").insert(request_data).execute()
            print(f"✅ Request created successfully: {request_response.data}")
        except Exception as insert_error:
            print(f"❌ Error inserting request: {str(insert_error)}")
            print(f"📝 Request data: {request_data}")
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to create request: {str(insert_error)}"
            )
        
        if not request_response.data or len(request_response.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create request - no data returned")
        
        request_id = request_response.data[0].get("id")
        
        # Save each document to database (metadata only, files already in storage from upload)
        for doc in req.documents:
            if doc.get('is_valid'):  # Only save valid documents
                document_data = {
                    "request_id": request_id,
                    "storage_path": f"documents/{req.user_id}/{doc.get('filename')}",
                    "file_name": doc.get('filename'),
                    "document_type_ai": doc.get('document_type'),
                    "validation_status": "approved",
                    "validation_message": doc.get('validation_message')
                }
                supabase.table("documents").insert(document_data).execute()
        
        return {
            "success": True,
            "request_id": str(request_id),
            "message": "Documentele au fost salvate cu succes și trimise spre verificare la primărie!"
        }
        
    except Exception as e:
        print(f"Error in confirm_documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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
def get_all_prioritized_requests():
    """
    Get all pending and in_review requests sorted by priority.
    Uses the prioritization algorithm to sort by:
    1. Days left until legal deadline (most urgent first)
    2. Backlog in category (more pending requests = higher priority)
    3. Submission date (older requests first)
    """
    try:
        # Get all requests that need processing (pending_validation or in_review)
        res = (
            supabase.table("requests")
            .select("*, profiles!user_id(full_name)")
            .in_("status", ["pending_validation", "in_review"])
            .execute()
        )

        rows = res.data or []

        # Map to Application objects for prioritization
        apps: list[Application] = []
        for r in rows:
            # Parse dates safely
            try:
                submitted_at = _parse_iso(r["created_at"])
            except:
                from datetime import timezone
                submitted_at = datetime.now(timezone.utc)
            
            legal_due = None
            if r.get("legal_deadline"):
                try:
                    legal_due = _parse_iso(r["legal_deadline"])
                except:
                    pass
            
            apps.append(
                Application(
                    id=str(r["id"]),
                    flow_type=r.get("request_type", "other"),
                    submitted_at=submitted_at,
                    legal_due_date=legal_due,
                    status=r.get("status", "pending_validation"),
                )
            )

        # Apply prioritization algorithm
        prioritized = prioritize_applications(apps)

        # Enrich with full request data
        result = []
        for item in prioritized:
            # Find original request data
            original = next((r for r in rows if str(r["id"]) == item["id"]), None)
            if original:
                result.append({
                    "id": item["id"],
                    "user_id": original["user_id"],
                    "citizen_name": original.get("profiles", {}).get("full_name", "N/A") if original.get("profiles") else "N/A",
                    "request_type": item["flow_type"],
                    "status": original["status"],
                    "priority": original.get("priority", 0),
                    "assigned_clerk_id": original.get("assigned_clerk_id"),
                    "created_at": original["created_at"],
                    "legal_deadline": item["legal_due_date"].isoformat() if item["legal_due_date"] else None,
                    "days_left": item["days_left"],
                    "backlog_in_category": item["backlog_in_category"],
                    "priority_score": item["priority_score"],
                })

        return result
    
    except Exception as e:
        print(f"Error in get_all_prioritized_requests: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
def _parse_iso(dt_str: str) -> datetime:
    """Mic helper pentru stringuri ISO de la Supabase (cu sau fără Z)."""
    if dt_str is None:
        return None
    # Supabase trimite de obicei gen '2025-11-15T10:23:45.123456+00:00' sau cu 'Z'
    from datetime import timezone
    dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    # Ensure timezone-aware datetime (convert to UTC if needed)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


@app.get("/clerk/requests/status")
def get_all_requests_status():
    """
    Returnează pentru TOȚI utilizatorii:
    - toate cererile
    - statusul + prioritatea (zile rămase, scor)
    - documentele aferente fiecărei cereri
    - INFORMAȚII PROFIL (NOU)
    """
    
    # 1. Cererile TUTUROR userilor (filtrează doar cele active)
    # NOU: Luăm și datele de profil (user_profile)
    res_req = (
        supabase.table("requests")
        .select("*, user_profile:profiles(full_name, role)") 
        .in_("status", ["pending_validation", "in_review"])
        .execute()
    )
    req_rows = res_req.data or []

    # 2. Mapăm la Application pentru calcul de prioritate
    apps: List[Application] = []
    for r in req_rows:
        submitted_at = _parse_iso(r["created_at"]) # Folosim created_at
        legal_due = _parse_iso(r["legal_deadline"]) if r.get("legal_deadline") else None

        apps.append(
            Application(
                id=str(r["id"]),
                flow_type=r.get("request_type", "altele"),
                submitted_at=submitted_at,
                legal_due_date=legal_due,
                status=r.get("status", "pending"),
            )
        )

    # 3. Calculăm prioritatea pentru toate cererile folosind logica ta
    prioritized_list = prioritize_applications(apps)
    stats_by_id = {item["id"]: item for item in prioritized_list}

    result = []

    # 4. Pentru fiecare cerere: adăugăm număr documente + date de prioritate
    for r in req_rows:
        request_id = str(r["id"])
        stats = stats_by_id.get(request_id, {})

        # 4a. Numărul documentelor atașate cererii
        docs_res = (
            supabase.table("documents")
            .select("id", count='exact', head=True) # Optimizat: doar numărăm
            .eq("request_id", request_id)
            .execute()
        )
        docs_count = docs_res.count or 0
        
        # 5. Formatăm datele pentru a se potrivi cu frontend-ul
        result.append(
            {
                **r, # includem toate datele originale ale cererii
                "documents_count": docs_count,
                "days_until_deadline": stats.get("days_left"),
                "priority_score": stats.get("priority_score"), # FIX: Am redenumit din 'priority'
                "backlog_in_category": stats.get("backlog_in_category"), # Adăugăm și backlog
            }
        )

    # 6. Sortăm rezultatul final conform logicii tale din prioritization.py
    result.sort(
        key=lambda x: (
            x["days_until_deadline"] if x["days_until_deadline"] is not None else 999, # 1. Zile rămase
            -x.get("priority_score", 0), # 2. Scorul (desc)
            _parse_iso(x["created_at"]) # 3. Data trimiterii
        )
    )

    return result


@app.post("/clerk/documents/ai-validate")
async def ai_validate_documents(
    files: List[UploadFile] = File(...),
    user=Depends(get_current_user),
):
    # NU citești nimic din DB aici, lucrezi DOAR cu fișierele primite
    results = []

    for f in files:
        content = await f.read()

        # 1. clasifici tipul
        doc_type = detect_document_type(content)

        # 2. dacă e buletin -> validate_id_card
        #    dacă e plan/act -> extract_metadata
        meta = extract_metadata(content, doc_type)

        results.append({
            "filename": f.filename,
            "doc_type": doc_type,
            "metadata": meta,
            "is_valid": "error" not in meta,  # poți rafina
        })

    return {"documents": results}


# ============================================
# LLM1 & LLM2 Enhanced Endpoints
# ============================================

class TextChunk(BaseModel):
    """Chunk de text cu URL-ul sursei"""
    page_url: str
    text: str

class ExtractRequirementsRequest(BaseModel):
    """Request pentru LLM1 - extragerea cerințelor"""
    procedure_description: str
    text_chunks: List[TextChunk]

class ExistingDocument(BaseModel):
    """Document deja încărcat de utilizator"""
    doc_id: str
    file_id: str
    file_name: str

class ValidateDossierRequest(BaseModel):
    """Request pentru LLM2 - validarea dosarului"""
    user_message: str
    llm1_requirements: dict
    existing_documents: Optional[List[ExistingDocument]] = None


@app.post("/llm1/extract-requirements")
def llm1_extract_requirements(request: ExtractRequirementsRequest):
    """
    LLM1 - Extrage cerințele de documentație dintr-un set de chunk-uri text.
    
    Acest endpoint primește:
    - Descrierea procedurii (ex: "certificat de urbanism")
    - Lista de chunk-uri de text de pe site-uri oficiale
    
    Returnează:
    - Structură JSON cu toate documentele necesare
    - Condiții și restricții pentru fiecare document
    - Alte reguli (termene, taxe, etc.)
    - Liste de incertitudini
    
    Exemplu request:
    {
        "procedure_description": "certificat de urbanism",
        "text_chunks": [
            {
                "page_url": "https://www.primarie.ro/urbanism",
                "text": "Pentru obținerea certificatului de urbanism sunt necesare următoarele documente:..."
            }
        ]
    }
    """
    try:
        # Convertim Pydantic models la dict-uri simple
        chunks_dict = [{"page_url": chunk.page_url, "text": chunk.text} for chunk in request.text_chunks]
        
        result = extract_procedure_requirements(
            procedure_description=request.procedure_description,
            text_chunks=chunks_dict
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare la extragerea cerințelor: {str(e)}")


@app.post("/llm2/validate-dossier")
def llm2_validate_dossier(request: ValidateDossierRequest):
    """
    LLM2 - Validează dosarul utilizatorului și oferă îndrumare.
    
    Acest endpoint primește:
    - Mesajul utilizatorului
    - Cerințele extrase de LLM1
    - Lista documentelor deja încărcate (opțional)
    
    Returnează:
    - Răspuns pentru utilizator (text în limba română)
    - Acțiune recomandată (upload, validate, save)
    - Liste cu documente lipsă sau în plus
    - Obiect "dosar" gata de salvat (dacă totul e complet)
    
    Exemplu request:
    {
        "user_message": "Am încărcat buletinul și actul de proprietate",
        "llm1_requirements": { ... },
        "existing_documents": [
            {"doc_id": "carte_identitate", "file_id": "abc123", "file_name": "CI.pdf"}
        ]
    }
    """
    try:
        # Convertim Pydantic models la dict-uri simple
        existing_docs_dict = None
        if request.existing_documents:
            existing_docs_dict = [
                {
                    "doc_id": doc.doc_id,
                    "file_id": doc.file_id,
                    "file_name": doc.file_name
                }
                for doc in request.existing_documents
            ]
        
        result = validate_and_guide_dossier(
            user_message=request.user_message,
            llm1_requirements=request.llm1_requirements,
            existing_documents=existing_docs_dict
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare la validarea dosarului: {str(e)}")


# ============================================
# Urban Information Helper Endpoint
# ============================================

class UrbanInfoRequest(BaseModel):
    """Request pentru obținerea instrucțiunilor de descărcare extras urbanistic"""
    cadastral_code: Optional[str] = None
    address: Optional[str] = None
    question: Optional[str] = None

@app.post("/urban-info/instructions")
def get_urban_info_guide(request: UrbanInfoRequest):
    """
    Returnează instrucțiuni detaliate pentru descărcarea extrasului de informare urbanistică
    de pe portalul oficial al Primăriei Timișoara.
    
    Acest endpoint:
    - Detectează dacă utilizatorul solicită un extras de informare urbanistică
    - Extrage adresa din întrebare (dacă este furnizată)
    - Oferă instrucțiuni pas cu pas personalizate
    - Include link către portalul oficial
    - Oferă sfaturi de depanare dacă sunt necesare
    
    Exemplu request:
    {
        "cadastral_code": "407839",
        "address": "Strada Revolutiei, nr. 10",
        "question": "Am nevoie de extras de informare urbanistica pentru parcela mea"
    }
    """
    try:
        cadastral_code = request.cadastral_code
        address = request.address
        
        # Try to extract cadastral code from question if not provided
        if not cadastral_code and request.question:
            cadastral_code = extract_cadastral_code_from_text(request.question)
        
        # Try to extract address from question if not provided
        if not address and request.question and not cadastral_code:
            address = extract_address_from_text(request.question)
        
        # Get instructions
        instructions = get_urban_info_instructions(cadastral_code, address)
        
        # Add troubleshooting if user mentions problems
        if request.question and any(word in request.question.lower() for word in 
            ["problem", "eroare", "nu merge", "nu functioneaza", "nu gasesc", "ajutor"]):
            instructions["troubleshooting"] = get_troubleshooting_tips()
        
        return {
            "success": True,
            "data": instructions
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Eroare la generarea instrucțiunilor: {str(e)}"
        )


@app.post("/llm-workflow/complete")
def complete_llm_workflow(
    procedure_description: str,
    text_chunks: List[TextChunk],
    user_message: str,
    existing_documents: Optional[List[ExistingDocument]] = None
):
    """
    Workflow complet: LLM1 → LLM2
    
    Execută ambii pași:
    1. LLM1 extrage cerințele din text
    2. LLM2 validează dosarul utilizatorului
    
    Acest endpoint simplifică integrarea pentru frontend - trimite totul odată
    și primește răspunsul final.
    
    Exemplu request:
    {
        "procedure_description": "certificat de urbanism",
        "text_chunks": [...],
        "user_message": "Am încărcat buletinul",
        "existing_documents": [...]
    }
    """
    try:
        # Step 1: LLM1 extrage cerințele
        chunks_dict = [{"page_url": chunk.page_url, "text": chunk.text} for chunk in text_chunks]
        llm1_result = extract_procedure_requirements(
            procedure_description=procedure_description,
            text_chunks=chunks_dict
        )
        
        # Step 2: LLM2 validează dosarul
        existing_docs_dict = None
        if existing_documents:
            existing_docs_dict = [
                {
                    "doc_id": doc.doc_id,
                    "file_id": doc.file_id,
                    "file_name": doc.file_name
                }
                for doc in existing_documents
            ]
        
        llm2_result = validate_and_guide_dossier(
            user_message=user_message,
            llm1_requirements=llm1_result,
            existing_documents=existing_docs_dict
        )
        
        # Returnăm ambele rezultate
        return {
            "llm1_requirements": llm1_result,
            "llm2_guidance": llm2_result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare în workflow-ul LLM: {str(e)}")
