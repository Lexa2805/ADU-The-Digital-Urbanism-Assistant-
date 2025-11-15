/**
 * Hook pentru gestionarea istoricului de activitate (Admin)
 */

import { useState, useEffect } from 'react'
import { 
  getUserActivityHistory, 
  getAllActivityHistory,
  getUserRequestsCount,
  getUserDocumentsCount,
  AdminActivityLog
} from '../services/adminService'

export function useAdminActivity() {
  const [activities, setActivities] = useState<AdminActivityLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Încarcă istoricul pentru un utilizator specific
  const loadUserActivity = async (userId: string, limit: number = 50) => {
    try {
      setLoading(true)
      setError(null)
      const data = await getUserActivityHistory(userId, limit)
      setActivities(data)
    } catch (err) {
      console.error('Eroare la încărcarea istoricului:', err)
      setError('Nu s-a putut încărca istoricul de activitate.')
    } finally {
      setLoading(false)
    }
  }

  // Încarcă tot istoricul cu filtre
  const loadAllActivity = async (
    filters?: {
      action_type?: string
      from_date?: string
      to_date?: string
      user_id?: string
    },
    limit: number = 100
  ) => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAllActivityHistory(filters, limit)
      setActivities(data)
    } catch (err) {
      console.error('Eroare la încărcarea istoricului complet:', err)
      setError('Nu s-a putut încărca istoricul complet.')
    } finally {
      setLoading(false)
    }
  }

  // Obține statistici despre activitatea unui utilizator
  const getUserStats = async (userId: string) => {
    try {
      const [requestsCount, documentsCount] = await Promise.all([
        getUserRequestsCount(userId),
        getUserDocumentsCount(userId)
      ])

      return {
        total_requests: requestsCount,
        total_documents: documentsCount
      }
    } catch (err) {
      console.error('Eroare la obținerea statisticilor utilizatorului:', err)
      return {
        total_requests: 0,
        total_documents: 0
      }
    }
  }

  return {
    activities,
    loading,
    error,
    loadUserActivity,
    loadAllActivity,
    getUserStats
  }
}
