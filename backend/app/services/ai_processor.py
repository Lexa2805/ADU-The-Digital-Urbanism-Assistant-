"""
AI Processor - "Creierul" AI al aplicației ADU
==============================================

Acest modul conține toate funcțiile de procesare AI folosind Google Gemini.

Autor: Persoana D (Specialist AI & Logică)
Contract: Livrează funcții pure pentru Persoana C (Arhitectul API)
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
    
    Args:
        file_bytes: Imaginea documentului în format bytes
    
    Returns:
        dict: {"is_valid": bool, "message": str}
        
    Exemple:
        - {"is_valid": True, "message": "Document valid."}
        - {"is_valid": False, "message": "EROARE: Cartea de identitate a expirat la data 01.10.2024."}
    """
    try:
        # Obținem data curentă pentru verificare
        data_curenta = datetime.now().strftime("%d.%m.%Y")
        
        # Pregătim imaginea pentru Gemini
        model = genai.GenerativeModel('models/gemini-1.5-flash')
        
        # Creăm prompt-ul conform specificațiilor
        prompt = f"""Ești un funcționar de la serviciul de urbanism. Privește această imagine. Este o carte de identitate românească? Dacă da, care este data expirării? Data curentă este {data_curenta}. Compară data expirării cu data curentă. Răspunde doar în format JSON cu următoarea structură: {{"is_valid": boolean, "message": "string"}}. Dacă documentul este valid, mesajul este 'Document valid'. Dacă documentul este expirat, mesajul trebuie să fie 'EROARE: Cartea de identitate a expirat la data [zi.lună.anul].'."""
        
        # Generăm răspunsul
        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": file_bytes}
        ])
        
        # Parsăm răspunsul JSON
        result_text = response.text.strip()
        
        # Curățăm răspunsul de eventuale markdown code blocks
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        result_text = result_text.strip()
        
        result = json.loads(result_text)
        
        # Validăm structura răspunsului
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
    
    Args:
        file_bytes: Imaginea/PDF-ul documentului în format bytes
        file_type: Tipul documentului ('carte_identitate', 'plan_cadastral', 'act_proprietate')
    
    Returns:
        dict: Dicționar cu datele extrase, în funcție de tipul documentului
        
    Exemple:
        - Pentru 'carte_identitate': {"nume": "Ionescu", "prenume": "Vasile", "cnp": "180..."}
        - Pentru 'plan_cadastral': {"nr_cadastral": "12345-C1", "suprafata_masurata_mp": "500"}
        - Pentru 'act_proprietate': {"nume_proprietar": "Ion Popescu", "adresa_imobil": "Str. Libertății 10"}
    """
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Definim câmpurile pentru fiecare tip de document
        fields_map = {
            'carte_identitate': ['nume', 'prenume', 'cnp', 'adresa_domiciliu'],
            'plan_cadastral': ['nr_cadastral', 'suprafata_masurata_mp'],
            'act_proprietate': ['nume_proprietar', 'adresa_imobil']
        }
        
        # Obținem câmpurile pentru tipul documentului
        fields = fields_map.get(file_type, [])
        if not fields:
            return {"error": f"Tip de document necunoscut: {file_type}"}
        
        # Creăm prompt-ul
        fields_str = ', '.join([f'`{field}`' for field in fields])
        prompt = f"""Ești un operator de date ultra-precis. Extrage datele relevante din textul sau imaginea următoare, în funcție de tipul documentului. Tipul documentului este {file_type}.

* Dacă tipul este 'carte_identitate', caută: `nume`, `prenume`, `cnp`, `adresa_domiciliu`.
* Dacă tipul este 'plan_cadastral', caută: `nr_cadastral`, `suprafata_masurata_mp`.
* Dacă tipul este 'act_proprietate', caută: `nume_proprietar`, `adresa_imobil`.

Ignoră câmpurile pe care nu le găsești. Răspunde doar în format JSON, folosind cheile specificate."""
        
        # Generăm răspunsul
        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": file_bytes}
        ])
        
        # Parsăm răspunsul JSON
        result_text = response.text.strip()
        
        # Curățăm răspunsul de eventuale markdown code blocks
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
    
    Această funcție este folosită de Persoana C pentru a popula baza de date vectorială
    cu knowledge_base (Legi, PUG-uri, regulamente).
    
    Args:
        text_chunk: Fragmentul de text pentru care se creează vectorul
    
    Returns:
        list[float]: Vectorul de embedding (listă de numere)
        
    Raises:
        Exception: Dacă apare o eroare la crearea vectorului
    """
    try:
        # Folosim modelul de embedding recomandat de Google
        result = genai.embed_content(
            model="models/text-embedding-004",
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
    Generează un răspuns la întrebarea utilizatorului folosind RAG (Retrieval Augmented Generation).
    
    Această funcție primește întrebarea utilizatorului și contextul legal găsit de Persoana C
    în baza de date vectorială, apoi generează un răspuns fundamentat strict pe acest context.
    
    Args:
        question: Întrebarea utilizatorului
        context_chunks: Lista de fragmente de text relevante din baza de cunoștințe legală
    
    Returns:
        str: Răspunsul formulat pentru cetățean, în limba română
        
    Exemple:
        - Răspuns normal: "Conform Legii nr. 50/1991, pentru a obține autorizația..."
        - Răspuns când nu există info: "Informațiile legale pe care le dețin nu acoperă..."
    """
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Concatenăm fragmentele de context
        context_text = "\n\n".join(context_chunks)
        
        # Creăm prompt-ul conform specificațiilor
        prompt = f"""Ești ADU, un asistent digital de urbanism, prietenos și profesionist. Misiunea ta este să răspunzi la întrebarea utilizatorului. Fundamentează-ți răspunsul doar și exclusiv pe informațiile din 'Contextul Legal' furnizat. Nu inventa informații și nu folosi cunoștințe externe. Dacă contextul nu conține răspunsul, spune 'Informațiile legale pe care le dețin nu acoperă această situație specifică. Vă recomand să luați legătura cu un funcționar.'

**Context Legal:**
---
{context_text}
---

**Întrebarea Utilizatorului:**
{question}

**Răspunsul tău (în limba română):**"""
        
        # Generăm răspunsul
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
    
    Această funcție este similară cu create_embedding, dar optimizată pentru query-uri
    (întrebări ale utilizatorului) în loc de documente.
    
    Args:
        query_text: Textul întrebării utilizatorului
    
    Returns:
        list[float]: Vectorul de embedding pentru query
        
    Raises:
        Exception: Dacă apare o eroare la crearea vectorului
    """
    try:
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=query_text,
            task_type="retrieval_query"
        )
        
        return result['embedding']
        
    except Exception as e:
        raise Exception(f"Eroare la crearea vectorului de embedding pentru query: {str(e)}")
