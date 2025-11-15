"""
Test Script pentru LLM Workflow
================================

Script de test pentru funcțiile LLM1 și LLM2.
Demonstrează cum funcționează întregul workflow.
"""

import os
import sys
import json

# Adăugăm path-ul pentru import
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.ai_processor import (
    extract_procedure_requirements,
    validate_and_guide_dossier
)


def test_llm1_extract_requirements():
    """
    Test pentru LLM1 - Extragerea cerințelor din text oficial
    """
    print("=" * 80)
    print("TEST LLM1: Extragere Cerințe din Text Oficial")
    print("=" * 80)
    
    # Text oficial simulat (ar veni din web scraping în realitate)
    text_chunks = [
        {
            "page_url": "https://www.primarie.ro/certificat-urbanism",
            "text": """
            Certificat de Urbanism - Documentație Necesară
            
            Pentru obținerea Certificatului de Urbanism sunt necesare următoarele documente:
            
            1. Carte de identitate valabilă a solicitantului (copie)
            2. Act de proprietate sau extras de carte funciară pentru terenul/imobilul în cauză
            3. Plan cadastral actualizat, vizat de OCPI, emis în ultimele 6 luni
            4. Plan de încadrare în zonă (la scara 1:5000 sau 1:25000)
            
            Termene de emitere: 30 de zile lucrătoare de la data depunerii dosarului complet.
            Taxa de urbanism: 150 RON (conform HCL nr. 123/2024)
            
            IMPORTANT: Pentru zonele protejate historic este necesar și avizul MDRAP.
            """
        },
        {
            "page_url": "https://legislatie.ro/legea-50-1991",
            "text": """
            Legea nr. 50/1991 privind autorizarea executării lucrărilor de construcții
            
            Art. 7. Certificatul de urbanism se eliberează de către autoritatea administrației publice locale,
            în termen de 30 de zile de la data înregistrării cererii.
            
            Art. 8. Pentru eliberarea certificatului de urbanism, solicitantul prezintă:
            - actul de identitate
            - actul care atestă dreptul de proprietate sau alt drept real asupra imobilului
            - extras de plan cadastral sau de carte funciară
            """
        }
    ]
    
    # Apelăm LLM1
    print("\n🔄 Apelăm LLM1 pentru extragere cerințe...")
    result = extract_procedure_requirements(
        procedure_description="certificat de urbanism",
        text_chunks=text_chunks
    )
    
    # Afișăm rezultatul
    print("\n✅ Rezultat LLM1:")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    return result


def test_llm2_validate_incomplete_dossier(llm1_requirements):
    """
    Test pentru LLM2 - Validare dosar incomplet
    """
    print("\n" + "=" * 80)
    print("TEST LLM2: Validare Dosar Incomplet")
    print("=" * 80)
    
    # Utilizatorul a încărcat doar buletinul
    existing_documents = [
        {
            "doc_id": "carte_identitate",
            "file_id": "file_abc123",
            "file_name": "Buletin_Ion_Popescu.pdf"
        }
    ]
    
    user_message = "Am încărcat buletinul. Ce mai lipsește pentru certificatul de urbanism?"
    
    print(f"\n💬 Mesaj utilizator: '{user_message}'")
    print(f"📄 Documente încărcate: {len(existing_documents)}")
    
    # Apelăm LLM2
    print("\n🔄 Apelăm LLM2 pentru validare...")
    result = validate_and_guide_dossier(
        user_message=user_message,
        llm1_requirements=llm1_requirements,
        existing_documents=existing_documents
    )
    
    # Afișăm rezultatul
    print("\n✅ Răspuns LLM2:")
    print("\n" + "-" * 80)
    print("MESAJ CĂTRE UTILIZATOR:")
    print("-" * 80)
    print(result.get("assistant_reply", ""))
    
    print("\n" + "-" * 80)
    print("ACȚIUNE RECOMANDATĂ:")
    print("-" * 80)
    action = result.get("action", {})
    print(f"Tip acțiune: {action.get('type', 'N/A')}")
    
    if action.get("missing_documents"):
        print("\n❌ Documente lipsă:")
        for doc in action["missing_documents"]:
            print(f"  - {doc.get('name', 'N/A')}: {doc.get('explanation', 'N/A')}")
    
    if action.get("dossier"):
        print("\n📋 Dosar generat (gata de salvare)")
    else:
        print("\n⏳ Dosar incomplet - nu poate fi salvat încă")
    
    return result


def test_llm2_validate_complete_dossier(llm1_requirements):
    """
    Test pentru LLM2 - Validare dosar complet
    """
    print("\n" + "=" * 80)
    print("TEST LLM2: Validare Dosar Complet")
    print("=" * 80)
    
    # Utilizatorul a încărcat toate documentele
    existing_documents = [
        {
            "doc_id": "carte_identitate",
            "file_id": "file_abc123",
            "file_name": "Buletin_Ion_Popescu.pdf"
        },
        {
            "doc_id": "act_proprietate",
            "file_id": "file_def456",
            "file_name": "Act_Proprietate.pdf"
        },
        {
            "doc_id": "plan_cadastral",
            "file_id": "file_ghi789",
            "file_name": "Plan_Cadastral_OCPI.pdf"
        }
    ]
    
    user_message = "Am încărcat toate documentele. Pot trimite dosarul?"
    
    print(f"\n💬 Mesaj utilizator: '{user_message}'")
    print(f"📄 Documente încărcate: {len(existing_documents)}")
    
    # Apelăm LLM2
    print("\n🔄 Apelăm LLM2 pentru validare finală...")
    result = validate_and_guide_dossier(
        user_message=user_message,
        llm1_requirements=llm1_requirements,
        existing_documents=existing_documents
    )
    
    # Afișăm rezultatul
    print("\n✅ Răspuns LLM2:")
    print("\n" + "-" * 80)
    print("MESAJ CĂTRE UTILIZATOR:")
    print("-" * 80)
    print(result.get("assistant_reply", ""))
    
    print("\n" + "-" * 80)
    print("ACȚIUNE RECOMANDATĂ:")
    print("-" * 80)
    action = result.get("action", {})
    print(f"Tip acțiune: {action.get('type', 'N/A')}")
    
    if action.get("dossier"):
        print("\n✅ DOSAR COMPLET! Gata de salvare în baza de date:")
        print(json.dumps(action["dossier"], indent=2, ensure_ascii=False))
    else:
        print("\n⚠️ Dosar incomplet")
    
    return result


def test_complete_workflow():
    """
    Test complet: LLM1 → LLM2 (dosar incomplet) → LLM2 (dosar complet)
    """
    print("\n\n")
    print("🚀 " * 40)
    print("START TEST COMPLET - LLM WORKFLOW")
    print("🚀 " * 40)
    
    # Pas 1: LLM1 extrage cerințele
    llm1_result = test_llm1_extract_requirements()
    
    # Așteptăm confirmarea utilizatorului
    print("\n" + "=" * 80)
    input("⏸️  Apasă ENTER pentru a continua cu testul LLM2 (dosar incomplet)...")
    
    # Pas 2: LLM2 validează dosar incomplet
    test_llm2_validate_incomplete_dossier(llm1_result)
    
    # Așteptăm confirmarea utilizatorului
    print("\n" + "=" * 80)
    input("⏸️  Apasă ENTER pentru a continua cu testul LLM2 (dosar complet)...")
    
    # Pas 3: LLM2 validează dosar complet
    test_llm2_validate_complete_dossier(llm1_result)
    
    print("\n\n")
    print("🎉 " * 40)
    print("TEST COMPLET FINALIZAT CU SUCCES!")
    print("🎉 " * 40)


def main():
    """
    Funcția principală - rulează testele
    """
    print("\n")
    print("╔════════════════════════════════════════════════════════════════════════════╗")
    print("║                   TEST LLM WORKFLOW - SISTEM DUAL LLM                      ║")
    print("║                                                                            ║")
    print("║  LLM1: Extrage cerințe din text oficial                                   ║")
    print("║  LLM2: Validează dosarul utilizatorului și oferă ghidare                  ║")
    print("╚════════════════════════════════════════════════════════════════════════════╝")
    
    try:
        test_complete_workflow()
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Test întrerupt de utilizator")
        
    except Exception as e:
        print(f"\n\n❌ EROARE în timpul testului:")
        print(f"   {str(e)}")
        import traceback
        traceback.print_exc()
    
    print("\n")


if __name__ == "__main__":
    # Verificăm că avem OPENROUTER_API_KEY
    if not os.getenv("OPENROUTER_API_KEY"):
        print("❌ EROARE: OPENROUTER_API_KEY nu este setat!")
        print("   Setează-l în .env sau ca variabilă de mediu:")
        print("   export OPENROUTER_API_KEY='your-key-here'")
        sys.exit(1)
    
    main()
