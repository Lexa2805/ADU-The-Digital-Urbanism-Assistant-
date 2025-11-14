"""
AI Processor - "Creierul" AI al aplicației ADU
==============================================

Acest modul conține toate funcțiile de procesare AI folosind Google Gemini.
Am corectat TOATE numele modelelor pentru a folosi versiunile stabile:
- 'gemini-pro-vision' pentru imagini
- 'gemini-pro' pentru text (chatbot)
- 'text-embedding-004' pentru embeddings (fără prefix)

"""

import os
import json
import google.generativeai as genai
from datetime import datetime
from typing import Optional


# ========================================
# Configurare Google Gemini
# ========================================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("EROARE: Cheia GEMINI_API_KEY nu este configurată în variabilele de mediu!")

genai.configure(api_key=GEMINI_API_KEY)


# ========================================
# Task 1: Validarea Documentelor (Buletin)
# ========================================
def validate_id_card(file_bytes: bytes) -> dict:
    """
    Validează un document de identitate (buletin) folosind Google Gemini Vision API.
    ...
    """
    try:
        data_curenta = datetime.now().strftime("%d.%m.%Y")
        
        # --- CORECȚIE APLICATĂ: Folosim modelul stabil de viziune ---
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        
        prompt = f"""Ești un funcționar de la serviciul de urbanism. Privește această imagine. Este o carte de identitate românească? Dacă da, care este data expirării? Data curentă este {data_curenta}. Compară data expirării cu data curentă. Răspunde doar în format JSON cu următoarea structură: {{"is_valid": boolean, "message": "string"}}. Dacă documentul este valid, mesajul este 'Document valid'. Dacă documentul este expirat, mesajul trebuie să fie 'EROARE: Cartea de identitate a expirat la data [zi.lună.anul].'."""
        
        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": file_bytes}
        ])
        
        result_text = response.text.strip()
        
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        result_text = result_text.strip()
        
        result = json.loads(result_text)
        
        if "is_valid" not in result or "message" not in result:
            return {
                "is_valid": False,
                "message": "EROARE: Răspunsul AI nu este în formatul corect."
            }
        
        return result
        
    except json.JSONDecodeError:
        return {
            "is_valid": False,
            "message": "EROARE: Nu s-a putut procesa răspunsul AI."
        }
    except Exception as e:
        return {
            "is_valid": False,
            "message": f"EROARE: Eroare la validarea documentului: {str(e)}"
        }


# ========================================
# Task 2: Extragerea Datelor (AI-OCR)
# ========================================
def extract_metadata(file_bytes: bytes, file_type: str) -> dict:
    """
    Extrage date cheie din documente folosind AI-OCR.
    ...
    """
    try:
        # --- CORECȚIE APLICATĂ: Folosim modelul stabil de viziune ---
        model = genai.GenerativeModel('gemini-pro-vision')
        
        fields_map = {
            'carte_identitate': ['nume', 'prenume', 'cnp', 'adresa_domiciliu'],
            'plan_cadastral': ['nr_cadastral', 'suprafata_masurata_mp'],
            'act_proprietate': ['nume_proprietar', 'adresa_imobil']
        }
        
        fields = fields_map.get(file_type, [])
        if not fields:
            return {"error": f"Tip de document necunoscut: {file_type}"}
        
        prompt = f"""Ești un operator de date ultra-precis. Extrage datele relevante din textul sau imaginea următoare, în funcție de tipul documentului. Tipul documentului este {file_type}.

* Dacă tipul este 'carte_identitate', caută: `nume`, `prenume`, `cnp`, `adresa_domiciliu`.
* Dacă tipul este 'plan_cadastral', caută: `nr_cadastral`, `suprafata_masurata_mp`.
* Dacă tipul este 'act_proprietate', caută: `nume_proprietar`, `adresa_imobil`.

Ignoră câmpurile pe care nu le găsești. Răspunde doar în format JSON, folosind cheile specificate."""
        
        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": file_bytes}
        ])
        
        result_text = response.text.strip()
        
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        result_text = result_text.strip()
        
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
    Creează un vector de embedding pentru un fragment de text.
    ...
    """
    try:
        # --- CORECȚIE APLICATĂ: Am scos prefixul 'models/' ---
        result = genai.embed_content(
            model="text-embedding-004",
            content=text_chunk,
            task_type="retrieval_document"
        )
        
        return result['embedding']
        
    except Exception as e:
        raise Exception(f"Eroare la crearea vectorului de embedding: {str(e)}")


# ========================================
# Task 4: Funcția Chatbot (RAG)
# ========================================
def get_rag_answer(question: str, context_chunks: list[str]) -> str:
    """
    Generează un răspuns la întrebarea utilizatorului folosind RAG.
    ...
    """
    try:
        # --- CORECȚIE APLICATĂ: Folosim modelul stabil de text ---
        model = genai.GenerativeModel('gemini-pro')
        
        context_text = "\n\n".join(context_chunks)
        
        prompt = f"""Ești ADU, un asistent digital de urbanism, prietenos și profesionist. Misiunea ta este să răspunzi la întrebarea utilizatorului. Fundamentează-ți răspunsul doar și exclusiv pe informațiile din 'Contextul Legal' furnizat. Nu inventa informații și nu folosi cunoștințe externe. Dacă contextul nu conține răspunsul, spune 'Informațiile legale pe care le dețin nu acoperă această situație specifică. Vă recomand să luați legătura cu un funcționar.'

**Context Legal:**
---
{context_text}
---

**Întrebarea Utilizatorului:**
{question}

**Răspunsul tău (în limba română):**"""
        
        response = model.generate_content(prompt)
        
        return response.text.strip()
        
    except Exception as e:
        return f"Ne cerem scuze, dar a apărut o eroare tehnică: {str(e)}. Vă rugăm să încercați din nou sau să contactați un funcționar."


# ========================================
# Funcție Helper: Crearea Embedding pentru Query
# ========================================
def create_query_embedding(query_text: str) -> list[float]:
    """
    Creează un vector de embedding pentru o întrebare (query).
    ...
    """
    try:
        # --- CORECȚIE APLICATĂ: Am scos prefixul 'models/' ---
        result = genai.embed_content(
            model="text-embedding-004",
            content=query_text,
            task_type="retrieval_query"
        )
        
        return result['embedding']
        
    except Exception as e:
        raise Exception(f"Eroare la crearea vectorului de embedding pentru query: {str(e)}")