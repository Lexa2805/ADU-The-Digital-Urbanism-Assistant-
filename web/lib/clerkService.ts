// web/lib/clerkService.ts

import { supabase } from './supabaseClient'
import type { RequestStatus } from './requestService'

// Interfața pentru statistici (rămâne neschimbată)
export interface ClerkStats {
    pending_validation: number
    in_review: number
    near_deadline: number
    completed_this_month: number
    assigned_to_me: number
}

// Interfața de bază
export interface RequestWithDetails {
    id: string
    user_id: string
    request_type: string
    status: RequestStatus
    priority: number // Coloana originală din DB
    legal_deadline: string | null
    location: unknown
    extracted_metadata: any
    assigned_clerk_id: string | null
    created_at: string
    user_profile?: {
        full_name: string | null
        role: string
    }
    documents_count?: number
    days_until_deadline?: number // Acesta este câmpul vechi
}

// ==========================================================
// INTERFAȚA NOUĂ PENTRU DATELE DE LA BACKEND
// ==========================================================
export interface PrioritizedRequest extends RequestWithDetails {
    priority_score: number      // Noul scor calculat de backend
    backlog_in_category: number // Noul câmp de la backend
    citizen_name: string        // Numele cetățeanului
    days_left: number | null    // Noul câmp 'days_left' (înlocuiește 'days_until_deadline')
}
// ==========================================================

// Funcția de statistici (rămâne neschimbată)
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
        .eq('status', 'approved') // Doar aprobate
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

// ==========================================================
// FUNCȚIA MODIFICATĂ PENTRU A APELA BACKEND-UL
// ==========================================================
export async function getPrioritizedRequests(): Promise<PrioritizedRequest[]> {

    // Setează adresa backend-ului tău FastAPI
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

    try {
        console.log("Fetching prioritized requests from FastAPI backend...");

        // 1. Apelăm backend-ul FastAPI
        const response = await fetch(`${API_URL}/clerk/requests/status`);

        if (!response.ok) {
            // AICI APARE EROAREA TA CÂND SERVERUL E OPRIT
            const err = await response.text(); // Luăm textul erorii
            console.error("Failed to fetch from FastAPI backend", response.status, response.statusText, err);
            throw new Error('Failed to fetch prioritized requests. Asigură-te că serverul backend (FastAPI) rulează.');
        }

        let data = await response.json();
        console.log(`Fetched ${data.length} requests from backend.`);

        // 2. Mapăm datele pentru a se potrivi 100% cu componenta
        const formattedData = data.map((req: any) => ({
            ...req,
            // Creăm câmpul 'citizen_name' pe care îl folosește componenta
            citizen_name: req.user_profile?.full_name || 'N/A',
            // Redenumim 'days_until_deadline' în 'days_left' pentru a se potrivi cu noul cod
            days_left: req.days_until_deadline
        }));

        return formattedData as PrioritizedRequest[];

    } catch (error) {
        console.error('Error in getPrioritizedRequests:', error);
        if (error instanceof TypeError && error.message.includes('fetch failed')) {
            throw new Error('Conexiunea la backend-ul FastAPI (http://127.0.0.1:8000) a eșuat. Este pornit?');
        }
        throw error;
    }
}

// ==========================================================
// FUNCȚIA PENTRU A OBȚINE CERERILE PENTRU CLERK
// ==========================================================
export interface GetRequestsOptions {
    assignedToMe?: boolean
    sortBy?: 'priority' | 'created_at' | 'deadline'
    status?: RequestStatus | RequestStatus[]
}

export async function getAllRequestsForClerk(options: GetRequestsOptions = {}): Promise<RequestWithDetails[]> {
    const { assignedToMe = false, sortBy = 'created_at', status } = options

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('User not authenticated')
    }

    let query = supabase
        .from('requests')
        .select(`
            *,
            user_profile:profiles!user_id(full_name, role)
        `)

    // Filter by assigned clerk if requested
    if (assignedToMe) {
        query = query.eq('assigned_clerk_id', user.id)
    }

    // Filter by status if provided
    if (status) {
        if (Array.isArray(status)) {
            query = query.in('status', status)
        } else {
            query = query.eq('status', status)
        }
    }

    // Sort by requested field
    switch (sortBy) {
        case 'priority':
            query = query.order('priority', { ascending: false })
            break
        case 'deadline':
            query = query.order('legal_deadline', { ascending: true, nullsFirst: false })
            break
        case 'created_at':
        default:
            query = query.order('created_at', { ascending: false })
            break
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching requests:', error)
        throw error
    }

    // Get documents count for each request
    const requestsWithCounts = await Promise.all(
        (data || []).map(async (request) => {
            const { count } = await supabase
                .from('documents')
                .select('*', { count: 'exact', head: true })
                .eq('request_id', request.id)

            // Calculate days until deadline
            let daysUntilDeadline: number | undefined
            if (request.legal_deadline) {
                const deadline = new Date(request.legal_deadline)
                const now = new Date()
                const diffTime = deadline.getTime() - now.getTime()
                daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            }

            return {
                ...request,
                documents_count: count || 0,
                days_until_deadline: daysUntilDeadline
            }
        })
    )

    return requestsWithCounts as RequestWithDetails[]
}

// ==========================================================
// RESTUL FUNCȚIILOR (Rămân neschimbate)
// ==========================================================

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
        .eq('status', 'pending_validation')
        .select()
        .single()

    if (error) {
        console.error('Error assigning request:', error)
        throw error
    }

    return data
}

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

export async function updateRequestPriority(requestId: string, priority: number) {
    const { data, error } = await supabase
        .from('requests')
        .update({ priority }) // Aici actualizăm coloana veche 'priority'
        .eq('id', requestId)
        .select()
        .single()

    if (error) {
        console.error('Error updating priority:', error)
        throw error
    }

    return data
}