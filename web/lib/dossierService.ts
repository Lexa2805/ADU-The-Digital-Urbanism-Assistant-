/**
 * Serviciu pentru gestionarea statusului dosarelor
 * 
 * NOTĂ: Acest serviciu apelează backend-ul Flask de la http://localhost:8000
 * Asigură-te că backend-ul rulează înainte de a folosi această funcționalitate
 */

import { DossierStatus, API_BASE_URL } from "@/types";

export class DossierService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Obține statusul unui dosar după ID
   */
  async getDossierStatus(dossierId: string): Promise<DossierStatus> {
    const response = await fetch(`${this.baseUrl}/dossier_status/${dossierId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Dosarul nu a fost găsit");
      }
      throw new Error(`Dossier API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Obține toate dosarele utilizatorului curent
   * TODO: Implementați când backend-ul va suporta această funcționalitate
   */
  async getAllDossiers(): Promise<DossierStatus[]> {
    // Placeholder - va fi implementat când backend-ul va avea această rută
    throw new Error("Not implemented yet");
  }
}

// Exportă o instanță default
export const dossierService = new DossierService();
