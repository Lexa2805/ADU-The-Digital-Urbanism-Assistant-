import { supabase } from './supabaseClient'
import type { RequestStatus } from './requestService'

export interface ClerkStats {
    pending_validation: number
    in_review: number
    near_deadline: number
    completed_this_month: number
    assigned_to_me: number
}

export interface RequestWithDetails {
    id: string
    user_id: string
    request_type: string
    status: RequestStatus
    priority: number
    legal_deadline: string | null
    location: unknown
    extracted_metadata: unknown
    assigned_clerk_id: string | null
    created_at: string
    // Joined data
    user_profile?: {
        full_name: string | null
        role: string
    }
    documents_count?: number
    days_until_deadline?: number
}

/**
 * Obține statistici pentru dashboard-ul clerk
 */
export async function getClerkStats(): Promise<ClerkStats> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        throw new Error('User not authenticated')
    }

    // Cereri pending validation
    const { count: pendingCount } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_validation')

    // Cereri in review
    const { count: reviewCount } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_review')

    // Cereri aproape de deadline (următoarele 7 zile)
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    
    const { count: deadlineCount } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending_validation', 'in_review'])
        .not('legal_deadline', 'is', null)
        .lte('legal_deadline', sevenDaysFromNow.toISOString())

    // Cereri finalizate luna curentă
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const { count: completedCount } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gte('created_at', startOfMonth.toISOString())

    // Cereri asignate mie
    const { count: assignedCount } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_clerk_id', user.id)
        .in('status', ['pending_validation', 'in_review'])

    return {
        pending_validation: pendingCount || 0,
        in_review: reviewCount || 0,
        near_deadline: deadlineCount || 0,
        completed_this_month: completedCount || 0,
        assigned_to_me: assignedCount || 0
    }
}

/**
 * Obține toate cererile pentru clerk cu detalii
 */
export async function getAllRequestsForClerk(filters?: {
    status?: RequestStatus | RequestStatus[]
    assignedToMe?: boolean
    sortBy?: 'priority' | 'created_at' | 'deadline'
    sortOrder?: 'asc' | 'desc'
}): Promise<RequestWithDetails[]> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        throw new Error('User not authenticated')
    }

    let query = supabase
        .from('requests')
        .select('*')

    // Aplică filtre
    if (filters?.status) {
        if (Array.isArray(filters.status)) {
            query = query.in('status', filters.status)
        } else {
            query = query.eq('status', filters.status)
        }
    }

    if (filters?.assignedToMe) {
        query = query.eq('assigned_clerk_id', user.id)
    }

    // Sortare
    const sortBy = filters?.sortBy || 'priority'
    const sortOrder = filters?.sortOrder || 'desc'
    
    if (sortBy === 'deadline') {
        query = query.order('legal_deadline', { ascending: sortOrder === 'asc', nullsFirst: false })
    } else {
        query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching requests:', error)
        throw error
    }

    // Calculează zile până la deadline, număr documente și profil utilizator
    const requestsWithDetails: RequestWithDetails[] = await Promise.all(
        (data || []).map(async (request: RequestWithDetails) => {
            // Profil utilizator
            const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name, role')
                .eq('id', request.user_id)
                .single()

            // Număr documente
            const { count } = await supabase
                .from('documents')
                .select('*', { count: 'exact', head: true })
                .eq('request_id', request.id)

            // Zile până la deadline
            let daysUntilDeadline: number | null = null
            if (request.legal_deadline) {
                const deadline = new Date(request.legal_deadline)
                const today = new Date()
                const diffTime = deadline.getTime() - today.getTime()
                daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            }

            return {
                ...request,
                user_profile: profileData || undefined,
                documents_count: count || 0,
                days_until_deadline: daysUntilDeadline
            }
        })
    )

    return requestsWithDetails
}

/**
 * Asignează o cerere la clerk-ul curent
 */
export async function assignRequestToMe(requestId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
        .from('requests')
        .update({
            assigned_clerk_id: user.id,
            status: 'in_review'
        })
        .eq('id', requestId)
        .eq('status', 'pending_validation') // Doar cereri neasignate
        .select()
        .single()

    if (error) {
        console.error('Error assigning request:', error)
        throw error
    }

    return data
}

/**
 * Eliberează o cerere (unassign)
 */
export async function unassignRequest(requestId: string) {
    const { data, error } = await supabase
        .from('requests')
        .update({
            assigned_clerk_id: null,
            status: 'pending_validation'
        })
        .eq('id', requestId)
        .select()
        .single()

    if (error) {
        console.error('Error unassigning request:', error)
        throw error
    }

    return data
}

/**
 * Aprobă o cerere
 */
export async function approveRequest(requestId: string, notes?: string) {
    // Obține metadata curentă
    const { data: currentRequest } = await supabase
        .from('requests')
        .select('extracted_metadata')
        .eq('id', requestId)
        .single()

    const currentMetadata = currentRequest?.extracted_metadata || {}

    // Actualizează cererea
    const { data, error } = await supabase
        .from('requests')
        .update({
            status: 'approved',
            extracted_metadata: {
                ...currentMetadata,
                approval_notes: notes,
                approved_at: new Date().toISOString()
            }
        })
        .eq('id', requestId)
        .select()
        .single()

    if (error) {
        console.error('Error approving request:', error)
        throw error
    }

    return data
}

/**
 * Respinge o cerere
 */
export async function rejectRequest(requestId: string, reason: string) {
    // Obține metadata curentă
    const { data: currentRequest } = await supabase
        .from('requests')
        .select('extracted_metadata')
        .eq('id', requestId)
        .single()

    const currentMetadata = currentRequest?.extracted_metadata || {}

    // Actualizează cererea
    const { data, error } = await supabase
        .from('requests')
        .update({
            status: 'rejected',
            extracted_metadata: {
                ...currentMetadata,
                rejection_reason: reason,
                rejected_at: new Date().toISOString()
            }
        })
        .eq('id', requestId)
        .select()
        .single()

    if (error) {
        console.error('Error rejecting request:', error)
        throw error
    }

    return data
}

/**
 * Actualizează prioritatea unei cereri
 */
export async function updateRequestPriority(requestId: string, priority: number) {
    const { data, error } = await supabase
        .from('requests')
        .update({ priority })
        .eq('id', requestId)
        .select()
        .single()

    if (error) {
        console.error('Error updating priority:', error)
        throw error
    }

    return data
}
