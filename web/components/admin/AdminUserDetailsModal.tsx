/**
 * Modal cu detalii complete despre utilizator și istoric (Admin)
 */

'use client'
import React, { useState, useEffect } from 'react'
import { AdminUser } from '../../lib/services/adminService'
import { useAdminActivity } from '../../lib/hooks/useAdminActivity'
import AdminActivityTimeline from './AdminActivityTimeline'

interface AdminUserDetailsModalProps {
  user: AdminUser
  onClose: () => void
  onUpdate: (userId: string, updates: Partial<Pick<AdminUser, 'full_name' | 'phone' | 'email'>>) => Promise<{ success: boolean; error?: string }>
}

export default function AdminUserDetailsModal({ 
  user, 
  onClose, 
  onUpdate 
}: AdminUserDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedUser, setEditedUser] = useState({
    full_name: user.full_name || '',
    phone: user.phone || '',
    email: user.email || ''
  })

  const { activities, loading, getUserStats, loadUserActivity } = useAdminActivity()
  const [stats, setStats] = useState({ total_requests: 0, total_documents: 0 })

  useEffect(() => {
    loadUserActivity(user.id, 50)
    getUserStats(user.id).then(setStats)
  }, [user.id])

  const handleSave = async () => {
    setIsSaving(true)
    const result = await onUpdate(user.id, editedUser)
    setIsSaving(false)

    if (result.success) {
      setIsEditing(false)
    } else {
      alert(result.error || 'Eroare la actualizare')
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Detalii Utilizator
              </h2>
              <p className="text-sm text-purple-100">
                Informații complete și istoric activitate
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informații Personale */}
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Informații Personale
                </h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1 text-sm text-purple-700 hover:bg-purple-100 rounded-lg transition-colors"
                  >
                    Editează
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nume Complet
                    </label>
                    <input
                      type="text"
                      value={editedUser.full_name}
                      onChange={(e) => setEditedUser({ ...editedUser, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editedUser.email}
                      onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={editedUser.phone}
                      onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Anulează
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'Se salvează...' : 'Salvează'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <InfoRow label="Nume" value={user.full_name || 'Neconfigurat'} />
                  <InfoRow label="Email" value={user.email} />
                  <InfoRow label="Telefon" value={user.phone || 'Neconfigurat'} />
                  <InfoRow label="ID Utilizator" value={user.id} small />
                </div>
              )}
            </div>

            {/* Status & Activitate */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Status & Activitate
              </h3>
              <div className="space-y-3">
                <InfoRow 
                  label="Rol" 
                  value={
                    user.role === 'admin' ? 'Administrator' :
                    user.role === 'clerk' ? 'Funcționar' : 'Cetățean'
                  }
                />
                <InfoRow 
                  label="Status Cont" 
                  value={user.is_active ? 'Activ' : 'Dezactivat'}
                  valueClass={user.is_active ? 'text-green-600' : 'text-red-600'}
                />
                <InfoRow label="Ultima Autentificare" value={formatDate(user.last_login)} />
                <InfoRow label="Data Înregistrare" value={formatDate(user.created_at)} />
                <InfoRow label="Ultima Actualizare" value={formatDate(user.updated_at)} />
              </div>
            </div>

            {/* Statistici */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Statistici Utilizator
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Total Cereri"
                  value={stats.total_requests}
                  icon="📋"
                />
                <StatCard
                  label="Documente Încărcate"
                  value={stats.total_documents}
                  icon="📄"
                />
                <StatCard
                  label="Acțiuni Înregistrate"
                  value={activities.length}
                  icon="📊"
                />
                <StatCard
                  label="Consimțământ GDPR"
                  value={user.gdpr_consent ? 'Da' : 'Nu'}
                  icon="🔒"
                  valueClass={user.gdpr_consent ? 'text-green-600' : 'text-red-600'}
                />
              </div>
              {user.gdpr_consent && user.gdpr_consent_date && (
                <p className="mt-3 text-xs text-gray-600">
                  Consimțământ acordat la: {formatDate(user.gdpr_consent_date)}
                </p>
              )}
            </div>

            {/* Istoric Activitate */}
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Istoric Activitate (Últimele 50 acțiuni)
              </h3>
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-2 text-sm">Se încarcă istoricul...</p>
                </div>
              ) : (
                <AdminActivityTimeline activities={activities} />
              )}
            </div>
          </div>
        </div>

        {/* Footer GDPR Notice */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
          <p className="text-xs text-gray-600">
            <strong>📋 Notă GDPR:</strong> Această vizualizare a fost înregistrată în audit trail conform 
            Regulamentului (UE) 2016/679. Administratorul are obligația de a proteja datele personale vizualizate.
          </p>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, small = false, valueClass = '' }: { 
  label: string
  value: string
  small?: boolean
  valueClass?: string
}) {
  return (
    <div className="flex justify-between items-start">
      <span className={`${small ? 'text-xs' : 'text-sm'} text-gray-600`}>
        {label}:
      </span>
      <span className={`${small ? 'text-xs' : 'text-sm'} font-medium ${valueClass || 'text-gray-900'} text-right max-w-[60%] break-all`}>
        {value}
      </span>
    </div>
  )
}

function StatCard({ label, value, icon, valueClass = '' }: {
  label: string
  value: number | string
  icon: string
  valueClass?: string
}) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${valueClass || 'text-gray-900'}`}>
        {value}
      </div>
      <div className="text-xs text-gray-600 mt-1">
        {label}
      </div>
    </div>
  )
}
