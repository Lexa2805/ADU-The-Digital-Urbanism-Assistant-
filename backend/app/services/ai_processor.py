"""
AI Processor - "Creierul" AI al aplicației ADU
==============================================

Acest modul conține toate funcțiile de procesare AI folosind OpenRouter.

Autor: Persoana D (Specialist AI & Logică)
Contract: Livrează funcții pure pentru Persoana C (Arhitectul API)
"""

import os
import json
import base64
from openai import OpenAI
from datetime import datetime
from typing import Optional


# ========================================
# Configurare OpenRouter
# ========================================
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    raise ValueError(
        "EROARE: Cheia OPENROUTER_API_KEY nu este configurată în "
        "variabilele de mediu!"
    )

# Inițializăm clientul OpenAI cu OpenRouter
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)


# ========================================
# Task 1: Validarea Documentelor (Buletin)
# ========================================
def validate_id_card(file_bytes: bytes) -> dict:
    """
    Validează un document de identitate (buletin) folosind OpenRouter
    Vision API.
    
    Args:
        file_bytes: Bytes-urile fișierului imagine (JPG/PNG)
    
    Returns:
        dict: {"is_valid": bool, "message": str}
    """
    try:
        data_curenta = datetime.now().strftime("%d.%m.%Y")

        # Encodăm imaginea în base64
        base64_image = base64.b64encode(file_bytes).decode("utf-8")

        prompt_text = f"""Privește această imagine. Este o carte de identitate românească? Dacă da, care este data expirării? Compară data expirării cu data curentă ({data_curenta}). Dacă documentul este valid, mesajul este 'Document valid'. Dacă documentul este expirat, mesajul trebuie să fie 'EROARE: Cartea de identitate a expirat la data [zi.lună.anul].'."""

        # Folosim formatul de mesaje OpenAI compatibil cu OpenRouter
        response = client.chat.completions.create(
            model="openai/gpt-4o",  # Model de viziune prin OpenRouter
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": f"Ești un funcționar de la serviciul de urbanism. Data curentă este {data_curenta}. Răspunde doar în format JSON cu următoarea structură: {{\"is_valid\": boolean, \"message\": \"string\"}}.",
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt_text},
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

        # Extragem răspunsul
        result_text = response.choices[0].message.content

        result = json.loads(result_text)

        if "is_valid" not in result or "message" not in result:
            return {
                "is_valid": False,
                "message": "EROARE: Răspunsul AI nu este în formatul corect.",
            }

        return result

    except json.JSONDecodeError:
        return {
            "is_valid": False,
            "message": "EROARE: Nu s-a putut procesa răspunsul AI.",
        }
    except Exception as e:
        return {
            "is_valid": False,
            "message": f"EROARE: Eroare la validarea documentului: {str(e)}",
        }


# ========================================
# Task 2: Extragerea Datelor (AI-OCR)
# ========================================
def extract_metadata(file_bytes: bytes, file_type: str) -> dict:
    """
    Extrage date cheie din documente folosind AI-OCR (OpenRouter Vision).
    
    Args:
        file_bytes: Bytes-urile fișierului imagine
        file_type: Tipul documentului (carte_identitate, plan_cadastral,
                   act_proprietate)
    
    Returns:
        dict: Datele extrase sau {"error": str} în caz de eroare
    """
    try:
        # Encodăm imaginea în base64
        base64_image = base64.b64encode(file_bytes).decode("utf-8")

        fields_map = {
            "carte_identitate": [
                "nume",
                "prenume",
                "cnp",
                "adresa_domiciliu",
            ],
            "plan_cadastral": ["nr_cadastral", "suprafata_masurata_mp"],
            "act_proprietate": ["nume_proprietar", "adresa_imobil"],
        }

        fields = fields_map.get(file_type, [])
        if not fields:
            return {"error": f"Tip de document necunoscut: {file_type}"}

        prompt_text = f"""Ești un operator de date ultra-precis. Extrage datele relevante din imaginea următoare, în funcție de tipul documentului. Tipul documentului este {file_type}.

* Dacă tipul este 'carte_identitate', caută: nume, prenume, cnp, adresa_domiciliu.
* Dacă tipul este 'plan_cadastral', caută: nr_cadastral, suprafata_masurata_mp.
* Dacă tipul este 'act_proprietate', caută: nume_proprietar, adresa_imobil.

Ignoră câmpurile pe care nu le găsești. Răspunde doar în format JSON, folosind cheile specificate."""

        # Folosim formatul de mesaje OpenAI compatibil cu OpenRouter
        response = client.chat.completions.create(
            model="openai/gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "Ești un operator de date ultra-precis. Răspunde doar în format JSON.",
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt_text},
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
        return result

    except json.JSONDecodeError:
        return {"error": "Nu s-a putut procesa răspunsul AI."}
    except Exception as e:
        return {"error": f"Eroare la extragerea datelor: {str(e)}"}


# ========================================
# Task 3: Crearea Vectorilor (Embedding)
# ========================================
def create_embedding(text_chunk: str) -> list[float]:
    """
    Creează un vector de embedding pentru un fragment de text (document).
    
    Args:
        text_chunk: Fragmentul de text pentru care se creează embedding-ul
    
    Returns:
        list[float]: Vectorul de embedding (dimensiune 1536)
    """
    try:
        # Folosim API-ul de embeddings prin OpenRouter
        response = client.embeddings.create(
            model="openai/text-embedding-3-small",
            input=text_chunk,
        )
        return response.data[0].embedding

    except Exception as e:
        raise Exception(
            f"Eroare la crearea vectorului de embedding: {str(e)}"
        )


# ========================================
# Task 4: Funcția Chatbot (RAG)
# ========================================
def get_rag_answer(question: str, context_chunks: list[str], conversation_context: Optional[dict] = None) -> dict:
    """
    Generează un răspuns la întrebarea utilizatorului folosind RAG
    (Retrieval-Augmented Generation) prin OpenRouter.
    
    Args:
        question: Întrebarea utilizatorului
        context_chunks: Lista de fragmente de text relevante din
                        documentele legale
        conversation_context: Context despre procedura selectată și documente încărcate
    
    Returns:
        dict: {
            "answer": str,
            "detected_procedure": str | None,
            "needs_documents": bool,
            "suggested_action": str
        }
    """
    try:
        context_text = "\n\n".join(context_chunks)
        
        # Contextul conversației (dacă există)
        context_info = ""
        if conversation_context:
            if conversation_context.get("procedure"):
                context_info += f"\n\nPROCEDURĂ SELECTATĂ: {conversation_context['procedure']}"
            if conversation_context.get("uploaded_documents"):
                docs = ", ".join(conversation_context["uploaded_documents"])
                context_info += f"\nDOCUMENTE ÎNCĂRCATE: {docs}"
            
            # Add detailed document validation information
            if conversation_context.get("documents_details"):
                context_info += "\n\nDETALII DOCUMENTE ÎNCĂRCATE:"
                for doc in conversation_context["documents_details"]:
                    status_emoji = "✅" if doc["status"] == "approved" else "⏳" if doc["status"] == "pending" else "❌"
                    context_info += f"\n  {status_emoji} {doc['filename']}"
                    context_info += f"\n     Tip: {doc['type']}"
                    context_info += f"\n     Status validare: {doc['status']}"
                    if doc.get("validation_message"):
                        context_info += f"\n     Mesaj: {doc['validation_message']}"

        system_prompt = f"""Tu ești ADU (Asistentul Digital de Urbanism) - un ghid prietenos care ajută cetățenii din România să navigheze procesele de urbanism.

PROCEDURI DISPONIBILE:
- certificat_urbanism: Certificat de Urbanism
- autorizatie_construire: Autorizație de Construire
- autorizatie_desfiintare: Autorizație de Desființare
- informare_urbanism: Informare de Urbanism
- racord_utilitati: Racordare Utilități

ROLUL TĂU:
1. Identifică ce dorește să facă cetățeanul (construcție nouă, renovare, desființare, etc.)
2. Explică-i ce documente sunt necesare pentru procedura dorită
3. Ghidează-l pas cu pas prin proces
4. Răspunde întrebări despre legislația de urbanism

INSTRUCȚIUNI:
- Folosește un ton prietenos și accesibil
- Dacă utilizatorul nu a specificat ce vrea să facă, întreabă-l cu opțiuni concrete
- După ce înțelegi ce vrea, explică-i ce documente trebuie să încarce
- Citează articolele relevante când este cazul
- Dacă utilizatorul a încărcat documente, analizează statusul lor și oferă feedback clar
- Dacă documente sunt aprobate (approved), confirmă că sunt valide
- Dacă documente sunt în așteptare (pending), spune că sunt în procesare
- Dacă documente sunt respinse (rejected), explică ce trebuie corectat
- Dacă toate documentele necesare sunt aprobate, felicită utilizatorul și spune-i care sunt următorii pași

Răspunde în format JSON:
{{
    "answer": "răspunsul complet pentru utilizator (în limba română)",
    "detected_procedure": "cheia procedurii (ex: certificat_urbanism) sau null",
    "needs_documents": true/false,
    "suggested_action": "upload_documents" sau "answer_questions" sau "clarify_intent"
}}"""

        user_prompt = f"""*Context Legal:*
---
{context_text}
---
{context_info}

*Întrebarea Utilizatorului:*
{question}"""

        # Folosim formatul de mesaje OpenAI compatibil cu OpenRouter
        response = client.chat.completions.create(
            model="openai/gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        result = json.loads(response.choices[0].message.content)
        return result

    except Exception as e:
        return {
            "answer": f"Ne cerem scuze, dar a apărut o eroare tehnică: {str(e)}. Vă rugăm să încercați din nou.",
            "detected_procedure": None,
            "needs_documents": False,
            "suggested_action": "retry"
        }


# ========================================
# Funcție Helper: Crearea Embedding pentru Query
# ========================================
def create_query_embedding(query_text: str) -> list[float]:
    """
    Creează un vector de embedding pentru o întrebare (query).
    
    Args:
        query_text: Textul întrebării
    
    Returns:
        list[float]: Vectorul de embedding
    """
    try:
        # Folosim API-ul de embeddings prin OpenRouter
        response = client.embeddings.create(
            model="openai/text-embedding-3-small",
            input=query_text,
        )
        return response.data[0].embedding

    except Exception as e:
        raise Exception(
            f"Eroare la crearea vectorului de embedding pentru query: "
            f"{str(e)}"
        )