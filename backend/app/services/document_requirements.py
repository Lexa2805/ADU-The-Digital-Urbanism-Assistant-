"""
Document Requirements - Cerințe de documentație per domeniu
===========================================================

Acest modul definește ce documente sunt necesare pentru fiecare tip de procedură
de urbanism în România.

Autor: Persoana C (API & Data Architect)
"""

from typing import Dict, List
from pydantic import BaseModel


class DocumentRequirement(BaseModel):
    """Un document necesar pentru o procedură"""
    doc_type: str  # carte_identitate, plan_cadastral, etc.
    is_required: bool  # obligatoriu sau opțional
    description: str  # descriere pentru cetățean


class ProcedureRequirements(BaseModel):
    """Cerințe de documentație pentru o procedură"""
    procedure_name: str
    description: str
    required_documents: List[DocumentRequirement]


# ========================================
# Definirea procedurilor și documentelor necesare
# ========================================

PROCEDURES = {
    "certificat_urbanism": ProcedureRequirements(
        procedure_name="Certificat de Urbanism",
        description="Certificat care atestă condițiile de edificare a unei construcții",
        required_documents=[
            DocumentRequirement(
                doc_type="carte_identitate",
                is_required=True,
                description="Carte de identitate valabilă a solicitantului"
            ),
            DocumentRequirement(
                doc_type="act_proprietate",
                is_required=True,
                description="Act de proprietate sau extras de carte funciară pentru terenul/imobilul în cauză"
            ),
            DocumentRequirement(
                doc_type="plan_cadastral",
                is_required=True,
                description="Plan de încadrare în zonă sau plan cadastral actualizat"
            ),
        ]
    ),
    
    "autorizatie_construire": ProcedureRequirements(
        procedure_name="Autorizație de Construire",
        description="Autorizație pentru executarea lucrărilor de construire",
        required_documents=[
            DocumentRequirement(
                doc_type="carte_identitate",
                is_required=True,
                description="Carte de identitate valabilă a solicitantului"
            ),
            DocumentRequirement(
                doc_type="certificat_urbanism",
                is_required=True,
                description="Certificat de urbanism valabil"
            ),
            DocumentRequirement(
                doc_type="act_proprietate",
                is_required=True,
                description="Act de proprietate sau extras de carte funciară"
            ),
            DocumentRequirement(
                doc_type="plan_cadastral",
                is_required=True,
                description="Plan de situație vizat de OCPI"
            ),
            DocumentRequirement(
                doc_type="proiect_tehnic",
                is_required=True,
                description="Proiect tehnic întocmit de un arhitect autorizat"
            ),
        ]
    ),
    
    "autorizatie_desfiintare": ProcedureRequirements(
        procedure_name="Autorizație de Desființare",
        description="Autorizație pentru demolarea unei construcții existente",
        required_documents=[
            DocumentRequirement(
                doc_type="carte_identitate",
                is_required=True,
                description="Carte de identitate valabilă a solicitantului"
            ),
            DocumentRequirement(
                doc_type="act_proprietate",
                is_required=True,
                description="Act de proprietate sau extras de carte funciară"
            ),
            DocumentRequirement(
                doc_type="plan_cadastral",
                is_required=True,
                description="Plan cadastral cu evidențierea construcției de desființat"
            ),
            DocumentRequirement(
                doc_type="raport_tehnic",
                is_required=True,
                description="Raport tehnic de expertizare a construcției"
            ),
        ]
    ),
    
    "informare_urbanism": ProcedureRequirements(
        procedure_name="Informare de Urbanism",
        description="Informații preliminare despre regimul juridic al unui imobil",
        required_documents=[
            DocumentRequirement(
                doc_type="carte_identitate",
                is_required=True,
                description="Carte de identitate valabilă a solicitantului"
            ),
            DocumentRequirement(
                doc_type="plan_cadastral",
                is_required=True,
                description="Plan de încadrare în zonă sau extras de plan cadastral"
            ),
        ]
    ),
    
    "racord_utilitati": ProcedureRequirements(
        procedure_name="Racordare Utilități",
        description="Racordare la rețelele de utilități (apă, gaz, electricitate)",
        required_documents=[
            DocumentRequirement(
                doc_type="carte_identitate",
                is_required=True,
                description="Carte de identitate valabilă a solicitantului"
            ),
            DocumentRequirement(
                doc_type="act_proprietate",
                is_required=True,
                description="Act de proprietate sau extras de carte funciară"
            ),
            DocumentRequirement(
                doc_type="certificat_urbanism",
                is_required=True,
                description="Certificat de urbanism pentru racorduri"
            ),
            DocumentRequirement(
                doc_type="plan_cadastral",
                is_required=True,
                description="Plan de situație cu trasee de racorduri"
            ),
        ]
    ),
}


def get_procedure_requirements(procedure_key: str) -> ProcedureRequirements:
    """
    Returnează cerințele de documentație pentru o procedură specifică.
    
    Args:
        procedure_key: Cheia procedurii (ex: "certificat_urbanism")
        
    Returns:
        ProcedureRequirements sau None dacă procedura nu există
    """
    return PROCEDURES.get(procedure_key)


def list_all_procedures() -> List[Dict]:
    """
    Returnează lista tuturor procedurilor disponibile.
    
    Returns:
        Lista cu informații despre fiecare procedură
    """
    return [
        {
            "key": key,
            "name": proc.procedure_name,
            "description": proc.description
        }
        for key, proc in PROCEDURES.items()
    ]


def check_missing_documents(procedure_key: str, uploaded_doc_types: List[str]) -> Dict:
    """
    Verifică ce documente lipsesc pentru o procedură.
    
    Args:
        procedure_key: Cheia procedurii
        uploaded_doc_types: Lista cu tipurile de documente încărcate
        
    Returns:
        Dict cu informații despre documente lipsă și complete
    """
    procedure = PROCEDURES.get(procedure_key)
    if not procedure:
        return {"error": f"Procedura '{procedure_key}' nu este recunoscută"}
    
    required_docs = [doc for doc in procedure.required_documents if doc.is_required]
    optional_docs = [doc for doc in procedure.required_documents if not doc.is_required]
    
    missing_required = []
    for doc in required_docs:
        if doc.doc_type not in uploaded_doc_types:
            missing_required.append({
                "doc_type": doc.doc_type,
                "description": doc.description
            })
    
    has_all_required = len(missing_required) == 0
    
    return {
        "procedure": procedure.procedure_name,
        "has_all_required": has_all_required,
        "missing_required": missing_required,
        "uploaded_count": len(uploaded_doc_types),
        "required_count": len(required_docs)
    }
