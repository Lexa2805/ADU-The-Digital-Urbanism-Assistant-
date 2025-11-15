/**
 * Hook pentru gestionarea utilizatorilor (Admin)
 */

import { useState, useEffect } from 'react'
import { 
  getAllUsers, 
  getUserStats, 
  updateUserRole, 
  toggleUserActive,
  updateUserInfo,
  AdminUser,
  AdminUserStats
} from '../services/adminService'
import { supabase } from '../supabaseClient'

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<AdminUserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentAdminId, setCurrentAdminId] = useState<string>('')

  // Obține ID-ul adminului curent
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentAdminId(user.id)
      }
    }
    getCurrentUser()
  }, [])

  // Încarcă utilizatorii și statisticile
  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [usersData, statsData] = await Promise.all([
        getAllUsers(),
        getUserStats()
      ])
      
      setUsers(usersData)
      setStats(statsData)
    } catch (err) {
      console.error('Eroare la încărcarea utilizatorilor:', err)
      setError('Nu s-au putut încărca utilizatorii. Verificați permisiunile.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // Actualizează rolul unui utilizator
  const changeUserRole = async (
    userId: string, 
    newRole: 'citizen' | 'clerk' | 'admin'
  ) => {
    try {
      await updateUserRole(userId, newRole, currentAdminId)
      await loadUsers() // Reîncarcă lista
      return { success: true }
    } catch (err) {
      console.error('Eroare la schimbarea rolului:', err)
      return { success: false, error: 'Nu s-a putut actualiza rolul.' }
    }
  }

  // Activează/Dezactivează un utilizator
  const toggleActive = async (userId: string, isActive: boolean) => {
    try {
      await toggleUserActive(userId, isActive, currentAdminId)
      await loadUsers() // Reîncarcă lista
      return { success: true }
    } catch (err) {
      console.error('Eroare la activare/dezactivare:', err)
      return { success: false, error: 'Nu s-a putut modifica statusul contului.' }
    }
  }

  // Actualizează informațiile unui utilizator
  const updateUser = async (
    userId: string,
    updates: Partial<Pick<AdminUser, 'full_name' | 'phone' | 'email'>>
  ) => {
    try {
      await updateUserInfo(userId, updates, currentAdminId)
      await loadUsers() // Reîncarcă lista
      return { success: true }
    } catch (err) {
      console.error('Eroare la actualizarea informațiilor:', err)
      return { success: false, error: 'Nu s-au putut actualiza informațiile.' }
    }
  }

  // Caută utilizatori
  const searchUsers = (searchTerm: string): AdminUser[] => {
    if (!searchTerm.trim()) return users
    
    const term = searchTerm.toLowerCase()
    return users.filter(user => 
      user.email?.toLowerCase().includes(term) ||
      user.full_name?.toLowerCase().includes(term) ||
      user.phone?.includes(term)
    )
  }

  // Filtrează utilizatori după rol
  const filterByRole = (role: string | null): AdminUser[] => {
    if (!role) return users
    return users.filter(user => user.role === role)
  }

  // Filtrează utilizatori după status activ
  const filterByActive = (isActive: boolean | null): AdminUser[] => {
    if (isActive === null) return users
    return users.filter(user => user.is_active === isActive)
  }

  return {
    users,
    stats,
    loading,
    error,
    loadUsers,
    changeUserRole,
    toggleActive,
    updateUser,
    searchUsers,
    filterByRole,
    filterByActive,
  }
}
