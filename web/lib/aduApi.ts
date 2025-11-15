/**
 * ADU API Client - FastAPI Backend Integration
 * ============================================
 * 
 * This module provides all API calls to the FastAPI backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

// ============================================
// Types
// ============================================

export interface ChatRequest {
    question: string
    procedure?: string
    uploaded_documents?: string[]
}

export interface ChatResponse {
    answer: string
    detected_procedure?: string
    needs_documents: boolean
    suggested_action: string
    available_procedures: Array<{
        key: string
        name: string
        description: string
    }>
}

export interface DocumentResult {
    filename: string
    document_type: string
    is_valid: boolean
    validation_message: string
    extracted_data: Record<string, any>
}

export interface UploadResponse {
    success: boolean
    error?: string
    dossier_id?: string
    documents_processed?: DocumentResult[]
    missing_documents?: string[]
    summary?: string
    procedure?: string
}

export interface Procedure {
    procedure_name: string
    description: string
    required_documents: Array<{
        doc_type: string
        is_required: boolean
        description: string
    }>
}

export interface ProcedureListItem {
    key: string
    name: string
    description: string
}

// ============================================
// Chatbot API
// ============================================

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/chatbot`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Error sending chat message:', error)
        throw error
    }
}

// ============================================
// Document Upload API
// ============================================

export async function uploadDocuments(
    files: File[],
    procedure?: string
): Promise<UploadResponse> {
    try {
        const formData = new FormData()

        files.forEach((file) => {
            formData.append('files', file)
        })

        const url = procedure
            ? `${API_BASE_URL}/upload?procedure=${encodeURIComponent(procedure)}`
            : `${API_BASE_URL}/upload`

        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Error uploading documents:', error)
        throw error
    }
}

export async function uploadSingleDocument(file: File): Promise<UploadResponse> {
    try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(`${API_BASE_URL}/upload-single`, {
            method: 'POST',
            body: formData,
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Error uploading single document:', error)
        throw error
    }
}

// ============================================
// Procedures API
// ============================================

export async function getAllProcedures(): Promise<{ procedures: ProcedureListItem[] }> {
    try {
        const response = await fetch(`${API_BASE_URL}/procedures`)

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Error fetching procedures:', error)
        throw error
    }
}

export async function getProcedureDetails(procedureKey: string): Promise<Procedure> {
    try {
        const response = await fetch(`${API_BASE_URL}/procedures/${procedureKey}`)

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Error fetching procedure details:', error)
        throw error
    }
}

// ============================================
// Dossiers API
// ============================================

export interface Dossier {
    id: string
    citizen_name: string
    status: string
    extracted_data: Record<string, any>
    created_at: string
}

export async function getAllDossiers(): Promise<Dossier[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/dossiers`)

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Error fetching dossiers:', error)
        throw error
    }
}

export async function getDossierById(dossierId: string): Promise<Dossier> {
    try {
        const response = await fetch(`${API_BASE_URL}/dossiers/${dossierId}`)

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Error fetching dossier:', error)
        throw error
    }
}

// ============================================
// Utility Functions
// ============================================

export function getDocumentTypeLabel(docType: string): string {
    const labels: Record<string, string> = {
        carte_identitate: 'Carte de Identitate',
        plan_cadastral: 'Plan Cadastral',
        act_proprietate: 'Act de Proprietate',
        certificat_urbanism: 'Certificat de Urbanism',
        proiect_tehnic: 'Proiect Tehnic',
        raport_tehnic: 'Raport Tehnic',
        unknown: 'Document Necunoscut',
    }
    return labels[docType] || docType
}

export function getProcedureLabel(procedureKey: string): string {
    const labels: Record<string, string> = {
        certificat_urbanism: 'Certificat de Urbanism',
        autorizatie_construire: 'Autorizație de Construire',
        autorizatie_desfiintare: 'Autorizație de Desființare',
        informare_urbanism: 'Informare de Urbanism',
        racord_utilitati: 'Racordare Utilități',
    }
    return labels[procedureKey] || procedureKey
}
