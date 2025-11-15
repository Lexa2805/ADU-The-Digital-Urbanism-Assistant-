/**
 * Serviciu pentru interacțiunea cu API-ul de chatbot
 * 
 * NOTĂ: Acest serviciu apelează backend-ul Flask de la http://localhost:8000
 * Asigură-te că backend-ul rulează înainte de a folosi această funcționalitate
 */

import { ChatbotRequest, ChatbotResponse, API_BASE_URL } from "@/types";

export class ChatbotService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Trimite un mesaj către chatbot și primește un răspuns
   */
  async sendMessage(
    message: string,
    dossierId?: string
  ): Promise<ChatbotResponse> {
    const requestBody: ChatbotRequest = {
      message,
      ...(dossierId && { dossier_id: dossierId }),
    };

    const response = await fetch(`${this.baseUrl}/chatbot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Chatbot API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

// Exportă o instanță default
export const chatbotService = new ChatbotService();
