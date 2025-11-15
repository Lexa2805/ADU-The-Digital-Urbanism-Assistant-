// Types pentru mesajele din chat
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  checklist?: string[];
}

// Types pentru răspunsul chatbot-ului de la API
export interface ChatbotResponse {
  answer: string;
  checklist?: string[];
}

export interface ChatbotRequest {
  message: string;
  dossier_id?: string;
}

// Types pentru upload documente
export interface UploadResponse {
  success: boolean;
  errors?: string[];
  error?: string;
  dossier_id?: string;
}

export interface FileWithStatus {
  file: File;
  id: string;
  status: "pending" | "uploading" | "validated" | "error";
  errorMessage?: string;
}

// Types pentru status dosar
export type StepStatus = "done" | "in_progress" | "pending";

export interface DossierStep {
  id: number;
  label: string;
  status: StepStatus;
}

export interface DossierStatus {
  dossier_id: string;
  type: string;
  submitted_at: string;
  current_step: number;
  steps: DossierStep[];
}

// Configurare API
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
