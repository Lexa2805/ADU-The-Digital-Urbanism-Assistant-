// ============================================
// REQUESTS API - Using Next.js API Routes
// ============================================

export interface Request {
  id: string
  user_id: string
  request_type: string
  status: 'draft' | 'pending_validation' | 'in_review' | 'rejected' | 'approved'
  priority: number
  legal_deadline: string | null
  location: any
  extracted_metadata: Record<string, any> | null
  assigned_clerk_id: string | null
  created_at: string
}

export interface RequestWithDetails extends Request {
  user: {
    email: string
    full_name: string | null
  }
  assigned_clerk: {
    email: string
    full_name: string | null
  } | null
}

/**
 * Get all requests with filters
 */
export async function getAllRequests(filters?: {
  status?: string
  request_type?: string
  assigned_clerk_id?: string
  from_date?: string
  to_date?: string
  search?: string
}): Promise<RequestWithDetails[]> {
  const params = new URLSearchParams()
  
  if (filters?.status) params.append('status', filters.status)
  if (filters?.request_type) params.append('request_type', filters.request_type)
  if (filters?.assigned_clerk_id) params.append('assigned_clerk_id', filters.assigned_clerk_id)
  if (filters?.from_date) params.append('from_date', filters.from_date)
  if (filters?.to_date) params.append('to_date', filters.to_date)
  if (filters?.search) params.append('search', filters.search)

  const response = await fetch(`/api/requests?${params.toString()}`)
  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch requests')
  }
  
  return result.data || []
}

/**
 * Get urgent requests (approaching legal deadline)
 */
export async function getUrgentRequests(daysThreshold: number = 3): Promise<RequestWithDetails[]> {
  const response = await fetch(`/api/requests/urgent?days=${daysThreshold}`)
  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch urgent requests')
  }
  
  return result.data || []
}

/**
 * AI auto-assignment: Distribute unassigned requests to clerks using round-robin
 */
export async function autoAssignRequests(): Promise<{ success: boolean; assigned_count: number; message?: string }> {
  const response = await fetch('/api/requests/auto-assign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  
  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(result.error || 'Failed to auto-assign requests')
  }
  
  return result
}

/**
 * Get requests statistics
 */
export async function getRequestsStatistics(timeframe: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<{
  total: number
  pending: number
  approved: number
  rejected: number
  approval_rate: number
  by_type: Record<string, number>
}> {
  const response = await fetch(`/api/requests/statistics?timeframe=${timeframe}`)
  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch statistics')
  }
  
  return result.data
}

/**
 * Export requests to CSV
 */
export function exportRequestsToCSV(requests: RequestWithDetails[]): string {
  const headers = ['ID', 'Tip Cerere', 'Status', 'Utilizator', 'Email', 'Funcționar Asignat', 'Data Creare', 'Termen Legal']
  
  const rows = requests.map(req => [
    req.id,
    req.request_type,
    req.status,
    req.user.full_name || 'N/A',
    req.user.email,
    req.assigned_clerk?.full_name || 'Nealocată',
    new Date(req.created_at).toLocaleDateString('ro-RO'),
    req.legal_deadline ? new Date(req.legal_deadline).toLocaleDateString('ro-RO') : 'N/A'
  ])

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  return csv
}
