/**
 * Admin Service - Servicii pentru gestionare utilizatori și audit trail
 * Conform GDPR România
 */

import { supabase } from '../supabaseClient'

// ============================================
// TIPURI DE DATE
// ============================================

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: 'citizen' | 'clerk' | 'admin'
  is_active: boolean
  gdpr_consent: boolean
  gdpr_consent_date: string | null
  last_login: string | null
  created_at: string
  updated_at: string | null
}

export interface AdminActivityLog {
  id: number
  user_id: string | null
  affected_user_id: string | null
  action_type: string
  details: Record<string, any> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user?: {
    email: string
    full_name: string | null
  }
  affected_user?: {
    email: string
    full_name: string | null
  }
}

export interface AdminUserStats {
  total_users: number
  total_citizens: number
  total_clerks: number
  total_admins: number
  active_users: number
  inactive_users: number
  new_users_this_month: number
}

// ============================================
// GESTIONARE UTILIZATORI
// ============================================

/**
 * Obține lista tuturor utilizatorilor (doar pentru admin)
 */
export async function getAllUsers(): Promise<AdminUser[]> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone,
      role,
      is_active,
      gdpr_consent,
      gdpr_consent_date,
      last_login,
      created_at,
      updated_at
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Eroare la obținerea utilizatorilor:', error)
    throw error
  }

  return profiles as AdminUser[]
}

/**
 * Obține statistici despre utilizatori
 */
export async function getUserStats(): Promise<AdminUserStats> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('role, is_active, created_at')

  if (error) {
    console.error('Eroare la obținerea statisticilor:', error)
    throw error
  }

  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const stats: AdminUserStats = {
    total_users: profiles.length,
    total_citizens: profiles.filter(p => p.role === 'citizen').length,
    total_clerks: profiles.filter(p => p.role === 'clerk').length,
    total_admins: profiles.filter(p => p.role === 'admin').length,
    active_users: profiles.filter(p => p.is_active).length,
    inactive_users: profiles.filter(p => !p.is_active).length,
    new_users_this_month: profiles.filter(p => 
      new Date(p.created_at) >= firstDayOfMonth
    ).length,
  }

  return stats
}

/**
 * Actualizează rolul unui utilizator
 */
export async function updateUserRole(
  userId: string,
  newRole: 'citizen' | 'clerk' | 'admin',
  currentAdminId: string
): Promise<void> {
  // Actualizează rolul
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      role: newRole,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (updateError) {
    console.error('Eroare la actualizarea rolului:', updateError)
    throw updateError
  }

  // Înregistrează în audit trail
  await logActivity({
    user_id: currentAdminId,
    affected_user_id: userId,
    action_type: 'role_change',
    details: {
      new_role: newRole,
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * Activează/Dezactivează un cont de utilizator
 */
export async function toggleUserActive(
  userId: string,
  isActive: boolean,
  currentAdminId: string
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ 
      is_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (error) {
    console.error('Eroare la activare/dezactivare utilizator:', error)
    throw error
  }

  // Înregistrează în audit trail
  await logActivity({
    user_id: currentAdminId,
    affected_user_id: userId,
    action_type: 'account_disable',
    details: {
      is_active: isActive,
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * Actualizează informațiile unui utilizator
 */
export async function updateUserInfo(
  userId: string,
  updates: Partial<Pick<AdminUser, 'full_name' | 'phone' | 'email'>>,
  currentAdminId: string
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ 
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (error) {
    console.error('Eroare la actualizarea informațiilor:', error)
    throw error
  }

  // Înregistrează în audit trail
  await logActivity({
    user_id: currentAdminId,
    affected_user_id: userId,
    action_type: 'admin_edit_user',
    details: {
      updated_fields: Object.keys(updates),
      timestamp: new Date().toISOString()
    }
  })
}

// ============================================
// AUDIT TRAIL & ISTORIC ACTIVITATE
// ============================================

/**
 * Înregistrează o activitate în audit trail
 */
export async function logActivity(activity: {
  user_id: string | null
  affected_user_id?: string | null
  action_type: string
  details?: Record<string, any>
  ip_address?: string | null
  user_agent?: string | null
}): Promise<void> {
  const { error } = await supabase
    .from('activity_log')
    .insert({
      user_id: activity.user_id,
      affected_user_id: activity.affected_user_id || null,
      action_type: activity.action_type,
      details: activity.details || null,
      ip_address: activity.ip_address || null,
      user_agent: activity.user_agent || null,
    })

  if (error) {
    console.error('Eroare la înregistrarea activității:', error)
    // Nu aruncăm eroare pentru a nu bloca operațiunea principală
  }
}

/**
 * Obține istoricul activității pentru un utilizator specific
 */
export async function getUserActivityHistory(
  userId: string,
  limit: number = 50
): Promise<AdminActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .or(`user_id.eq.${userId},affected_user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Eroare la obținerea istoricului:', error)
    throw error
  }

  return data as unknown as AdminActivityLog[]
}

/**
 * Obține tot istoricul activității (pentru admin)
 */
export async function getAllActivityHistory(
  filters?: {
    action_type?: string
    from_date?: string
    to_date?: string
    user_id?: string
  },
  limit: number = 100
): Promise<AdminActivityLog[]> {
  let query = supabase
    .from('activity_log')
    .select('*')

  if (filters?.action_type) {
    query = query.eq('action_type', filters.action_type)
  }

  if (filters?.from_date) {
    query = query.gte('created_at', filters.from_date)
  }

  if (filters?.to_date) {
    query = query.lte('created_at', filters.to_date)
  }

  if (filters?.user_id) {
    query = query.or(`user_id.eq.${filters.user_id},affected_user_id.eq.${filters.user_id}`)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Eroare la obținerea istoricului complet:', error)
    throw error
  }

  return data as unknown as AdminActivityLog[]
}

/**
 * Obține numărul de cereri create de un utilizator
 */
export async function getUserRequestsCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    console.error('Eroare la numărarea cererilor:', error)
    return 0
  }

  return count || 0
}

/**
 * Obține numărul de documente încărcate de un utilizator
 */
export async function getUserDocumentsCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('documents')
    .select('*, requests!inner(user_id)', { count: 'exact', head: true })
    .eq('requests.user_id', userId)

  if (error) {
    console.error('Eroare la numărarea documentelor:', error)
    return 0
  }

  return count || 0
}
