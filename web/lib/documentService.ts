import { supabase } from './supabaseClient'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export interface Document {
  id: string
  request_id: string
  storage_path: string
  file_name: string
  document_type_ai: string | null
  validation_status: 'pending' | 'approved' | 'rejected'
  validation_message: string | null
  uploaded_at: string
}

export interface UploadDocumentData {
  requestId: string
  file: File
}

/**
 * Upload un document cu validare AI prin backend
 * 
 * Acest proces:
 * 1. Trimite fișierul la backend pentru validare AI
 * 2. Backend detectează tipul documentului (carte_identitate, plan_cadastral, etc.)
 * 3. Backend validează documentul (ex: buletin expirat?)
 * 4. Salvează în Supabase Storage + DB cu status validat
 */
      









export async function uploadDocument(data: UploadDocumentData): Promise<Document> {
  const { requestId, file } = data
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  try {
    // Trimite fișierul la backend pentru procesare AI
    const formData = new FormData()
    formData.append('files', file)

    const response = await fetch(`${API_BASE_URL}/upload?user_id=${user.id}`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Eroare la încărcarea documentului')
    }

    const result = await response.json()

    // Verifică dacă backend-ul a returnat erori
    if (!result.success || !result.documents_processed || result.documents_processed.length === 0) {
      throw new Error(result.error || 'Nu s-au putut procesa documentele')
    }

    const processedDoc = result.documents_processed[0]

    // Acum salvează în Supabase cu informațiile de la AI
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const storagePath = `${user.id}/${requestId}/${fileName}`

    // Upload fișierul în Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError)
      throw uploadError
    }

    // Creează intrarea în tabelul documents cu rezultatele AI
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        request_id: requestId,
        storage_path: storagePath,
        file_name: file.name,
        document_type_ai: processedDoc.document_type,
        validation_status: processedDoc.is_valid ? 'approved' : 'rejected',
        validation_message: processedDoc.validation_message,
        extracted_metadata: processedDoc.extracted_data || {}
      })
      .select()
      .single()

    if (dbError) {
      // Dacă baza de date eșuează, șterge fișierul din storage
      await supabase.storage.from('uploads').remove([storagePath])
      console.error('Error creating document record:', dbError)
      throw dbError
    }

    console.log('✅ Document uploaded and validated:', {
      filename: file.name,
      type: processedDoc.document_type,
      valid: processedDoc.is_valid,
      message: processedDoc.validation_message
    })

    return document

  } catch (error) {
    console.error('Error in uploadDocument:', error)
    throw error
  }
}

/**
 * Obține toate documentele unei cereri
 */
export async function getRequestDocuments(requestId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('request_id', requestId)
    .order('uploaded_at', { ascending: false })

  if (error) {
    console.error('Error fetching documents:', error)
    throw error
  }

  return data || []
}

/**
 * Obține URL-ul signed (temporar) pentru download
 * URL-ul expiră după 1 oră
 */
export async function getDocumentUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('uploads')
    .createSignedUrl(storagePath, 3600) // 1 oră = 3600 secunde

  if (error) {
    console.error('Error creating signed URL:', error)
    throw error
  }

  if (!data?.signedUrl) {
    throw new Error('Failed to generate download URL')
  }

  return data.signedUrl
}

/**
 * Șterge un document
 */
export async function deleteDocument(documentId: string, storagePath: string) {
  // Șterge din storage
  const { error: storageError } = await supabase.storage
    .from('uploads')
    .remove([storagePath])

  if (storageError) {
    console.error('Error deleting file from storage:', storageError)
  }

  // Șterge din baza de date
  const { error: dbError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)

  if (dbError) {
    console.error('Error deleting document record:', dbError)
    throw dbError
  }
}

/**
 * Validează tipul de fișier acceptat
 */
export function isValidFileType(file: File): boolean {
  const validTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  return validTypes.includes(file.type)
}

/**
 * Validează dimensiunea fișierului (max 10MB)
 */
export function isValidFileSize(file: File): boolean {
  const maxSize = 10 * 1024 * 1024 // 10MB
  return file.size <= maxSize
}

/**
 * Formatează dimensiunea fișierului pentru afișare
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
