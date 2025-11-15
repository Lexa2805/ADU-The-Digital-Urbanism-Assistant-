import { supabase } from './supabaseClient'

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
 * Upload un document în Supabase Storage
 */
export async function uploadDocument(data: UploadDocumentData): Promise<Document> {
  const { requestId, file } = data
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Generează un nume unic pentru fișier
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
    console.error('Error uploading file:', uploadError)
    throw uploadError
  }

  // Creează intrarea în tabelul documents
  const { data: document, error: dbError } = await supabase
    .from('documents')
    .insert({
      request_id: requestId,
      storage_path: storagePath,
      file_name: file.name,
      validation_status: 'pending'
    })
    .select()
    .single()

  if (dbError) {
    // Dacă baza de date eșuează, șterge fișierul din storage
    await supabase.storage.from('uploads').remove([storagePath])
    console.error('Error creating document record:', dbError)
    throw dbError
  }

  return document
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
