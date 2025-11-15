"""
Document Classifier - Uses AI to detect document types
"""

import base64
from openai import OpenAI
import os
import json
import io
from PyPDF2 import PdfReader


OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text content from PDF."""
    try:
        pdf_file = io.BytesIO(file_bytes)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
        return ""


def detect_document_type(file_bytes: bytes, filename: str = "") -> str:
    """
    Uses AI to detect what type of document this is.
    Supports both images (via vision) and PDFs (via text extraction).
    
    Returns one of:
    - "carte_identitate" (Romanian ID card)
    - "plan_cadastral" (Cadastral plan)
    - "act_proprietate" (Property deed)
    - "certificat_urbanism" (Urban planning certificate)
    - "unknown" (Cannot determine)
    """
    try:
        # Check if it's a PDF based on filename or magic bytes
        is_pdf = filename.lower().endswith('.pdf') or file_bytes[:4] == b'%PDF'
        
        if is_pdf:
            # For PDFs, extract text and use text-based classification
            text_content = extract_text_from_pdf(file_bytes)
            
            if not text_content:
                return "unknown"
            
            response = client.chat.completions.create(
                model="openai/gpt-4o",
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": """Ești un clasificator de documente pentru urbanism în România. 
Analizează textul extras din document și determină ce tip de document este.

Tipuri posibile:
- "carte_identitate": Carte de identitate românească (ID card)
- "plan_cadastral": Plan cadastral, plan de situație, schiță cadastrală
- "act_proprietate": Act de proprietate, extras CF (carte funciară), titlu de proprietate
- "certificat_urbanism": Certificat de urbanism, autorizație de construire
- "unknown": Nu pot determina sau alt tip de document

Răspunde DOAR în format JSON: {"document_type": "tip"}"""
                    },
                    {
                        "role": "user",
                        "content": f"Ce tip de document este acesta?\n\nConținut:\n{text_content[:3000]}"  # Limit to first 3000 chars
                    },
                ],
            )
        else:
            # For images, use vision API
            base64_image = base64.b64encode(file_bytes).decode("utf-8")
            
            response = client.chat.completions.create(
                model="openai/gpt-4o",
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": """Ești un clasificator de documente pentru urbanism în România. 
Analizează imaginea și determină ce tip de document este.

Tipuri posibile:
- "carte_identitate": Carte de identitate românească (ID card)
- "plan_cadastral": Plan cadastral, plan de situație, schiță cadastrală
- "act_proprietate": Act de proprietate, extras CF (carte funciară), titlu de proprietate
- "certificat_urbanism": Certificat de urbanism, autorizație de construire
- "unknown": Nu pot determina sau alt tip de document

Răspunde DOAR în format JSON: {"document_type": "tip"}"""
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Ce tip de document este acesta?"},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                },
                            },
                        ],
                    },
                ],
            )
        
        result_text = response.choices[0].message.content
        result = json.loads(result_text)
        
        doc_type = result.get("document_type", "unknown")
        
        # Normalize to expected values
        valid_types = ["carte_identitate", "plan_cadastral", "act_proprietate", "certificat_urbanism"]
        if doc_type in valid_types:
            return doc_type
        else:
            return "unknown"
            
    except Exception as e:
        print(f"Error detecting document type: {e}")
        return "unknown"
