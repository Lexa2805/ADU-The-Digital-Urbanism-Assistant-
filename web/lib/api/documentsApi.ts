// ============================================
// DOCUMENTS API - Using Next.js API Routes
// ============================================

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

export interface DocumentWithRequest extends Document {
  request: {
    id: string
    request_type: string
    user: {
      email: string
      full_name: string | null
    }
  }
}

/**
 * Get documents pending AI validation
 */
export async function getPendingDocuments(): Promise<DocumentWithRequest[]> {
  const response = await fetch('/api/documents/pending')
  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch pending documents')
  }
  
  return result.data || []
}

/**
 * Get AI-rejected documents needing manual review
 */
export async function getRejectedDocuments(limit: number = 50): Promise<DocumentWithRequest[]> {
  const response = await fetch(`/api/documents/rejected?limit=${limit}`)
  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch rejected documents')
  }
  
  return result.data || []
}

/**
 * Approve document manually (admin override)
 */
export async function approveDocument(documentId: string, adminId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`/api/documents/${documentId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ admin_id: adminId })
  })
  
  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(result.error || 'Failed to approve document')
  }
  
  return result
}

/**
 * Reject document with reason (admin override)
 */
export async function rejectDocument(
  documentId: string, 
  reason: string, 
  adminId: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`/api/documents/${documentId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ admin_id: adminId, reason })
  })
  
  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(result.error || 'Failed to reject document')
  }
  
  return result
}
