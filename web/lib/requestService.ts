import { supabase } from './supabaseClient'

export type RequestType = 
  | 'certificat_urbanism'
  | 'autorizatie_construire'
  | 'autorizatie_demolare'
  | 'aviz_oportunitate'
  | 'altele'

export type RequestStatus = 
  | 'draft'
  | 'pending_validation'
  | 'in_review'
  | 'rejected'
  | 'approved'

export interface Request {
  id: string
  user_id: string
  request_type: RequestType
  status: RequestStatus
  priority: number
  legal_deadline: string | null
  location: {
    type: 'Point'
    coordinates: [number, number] // [lng, lat]
  } | null
  extracted_metadata: Record<string, unknown> | null
  assigned_clerk_id: string | null
  created_at: string
}

export interface CreateRequestData {
  request_type: RequestType
  location?: {
    lng: number
    lat: number
  }
  metadata?: Record<string, unknown>
}

/**
 * Creează o cerere nouă
 */
export async function createRequest(data: CreateRequestData) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  const requestData: Partial<Request> = {
    user_id: user.id,
    request_type: data.request_type,
    status: 'draft',
    priority: 0,
    extracted_metadata: data.metadata || {}
  }

  // Adaugă locația dacă există
  if (data.location) {
    requestData.location = `POINT(${data.location.lng} ${data.location.lat})`
  }

  const { data: request, error } = await supabase
    .from('requests')
    .insert(requestData)
    .select()
    .single()

  if (error) {
    console.error('Error creating request:', error)
    throw error
  }

  return request
}

/**
 * Obține toate cererile utilizatorului curent
 */
export async function getUserRequests() {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching requests:', error)
    throw error
  }

  return data
}

/**
 * Obține detaliile unei cereri
 */
export async function getRequestById(requestId: string) {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (error) {
    console.error('Error fetching request:', error)
    throw error
  }

  return data
}

/**
 * Actualizează statusul unei cereri
 */
export async function updateRequestStatus(requestId: string, status: RequestStatus) {
  const { data, error } = await supabase
    .from('requests')
    .update({ status })
    .eq('id', requestId)
    .select()
    .single()

  if (error) {
    console.error('Error updating request status:', error)
    throw error
  }

  return data
}

/**
 * Șterge o cerere (doar dacă este draft)
 */
export async function deleteRequest(requestId: string) {
  const { error } = await supabase
    .from('requests')
    .delete()
    .eq('id', requestId)
    .eq('status', 'draft') // Doar draft-urile pot fi șterse

  if (error) {
    console.error('Error deleting request:', error)
    throw error
  }
}

/**
 * Obține tipurile de cereri disponibile
 */
export function getRequestTypes() {
  return [
    { value: 'certificat_urbanism', label: 'Certificat de Urbanism' },
    { value: 'autorizatie_construire', label: 'Autorizație de Construire' },
    { value: 'autorizatie_demolare', label: 'Autorizație de Demolare' },
    { value: 'aviz_oportunitate', label: 'Aviz de Oportunitate' },
    { value: 'altele', label: 'Altele' },
  ]
}

/**
 * Obține label-ul statusului
 */
export function getStatusLabel(status: RequestStatus): string {
  const labels: Record<RequestStatus, string> = {
    draft: 'Ciornă',
    pending_validation: 'În validare',
    in_review: 'În procesare',
    rejected: 'Respinsă',
    approved: 'Aprobată',
  }
  return labels[status] || status
}

/**
 * Obține culoarea statusului pentru UI (clase Tailwind complete)
 */
export function getStatusColor(status: RequestStatus): string {
  const colors: Record<RequestStatus, string> = {
    draft: 'bg-gray-100 text-gray-800',
    pending_validation: 'bg-yellow-100 text-yellow-800',
    in_review: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
    approved: 'bg-green-100 text-green-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
