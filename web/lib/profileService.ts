import { supabase } from './supabaseClient'

export type UserRole = 'citizen' | 'clerk' | 'admin'

export interface UserProfile {
    id: string
    full_name: string | null
    role: UserRole
    created_at: string
}

/**
 * Creează un profil pentru utilizatorul nou înregistrat
 */
export async function createUserProfile(userId: string, fullName: string, role: UserRole = 'citizen') {
    const { data, error } = await supabase
        .from('profiles')
        .insert({
            id: userId,
            full_name: fullName,
            role: role
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating profile:', error)
        throw error
    }

    return data
}

/**
 * Obține profilul utilizatorului curent
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

    if (error) {
        console.error('Error fetching profile:', error)
        return null
    }

    return data
}

/**
 * Actualizează profilul utilizatorului
 */
export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

    if (error) {
        console.error('Error updating profile:', error)
        throw error
    }

    return data
}
