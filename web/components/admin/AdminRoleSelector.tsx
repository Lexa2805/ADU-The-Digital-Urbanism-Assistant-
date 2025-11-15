/**
 * Selector pentru schimbarea rolului utilizatorului (Admin)
 */

'use client'
import React, { useState } from 'react'

interface AdminRoleSelectorProps {
  currentRole: 'citizen' | 'clerk' | 'admin'
  userId: string
  userName: string
  onRoleChange: (userId: string, newRole: 'citizen' | 'clerk' | 'admin') => Promise<{ success: boolean; error?: string }>
}

export default function AdminRoleSelector({
  currentRole,
  userId,
  userName,
  onRoleChange
}: AdminRoleSelectorProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'citizen' | 'clerk' | 'admin'>(currentRole)
  const [isChanging, setIsChanging] = useState(false)

  const roles = [
    { value: 'citizen', label: 'Cetățean', color: 'gray' },
    { value: 'clerk', label: 'Funcționar', color: 'blue' },
    { value: 'admin', label: 'Administrator', color: 'purple' }
  ]

  const handleRoleSelect = (newRole: 'citizen' | 'clerk' | 'admin') => {
    if (newRole === currentRole) return
    setSelectedRole(newRole)
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    setIsChanging(true)
    const result = await onRoleChange(userId, selectedRole)
    setIsChanging(false)
    
    if (result.success) {
      setShowConfirm(false)
    } else {
      alert(result.error || 'Eroare la schimbarea rolului')
      setSelectedRole(currentRole)
      setShowConfirm(false)
    }
  }

  const handleCancel = () => {
    setSelectedRole(currentRole)
    setShowConfirm(false)
  }

  return (
    <>
      <select
        value={currentRole}
        onChange={(e) => handleRoleSelect(e.target.value as 'citizen' | 'clerk' | 'admin')}
        className="px-3 py-1 text-sm font-medium rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        disabled={isChanging}
      >
        {roles.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>

      {/* Modal de confirmare */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirmare Schimbare Rol
                </h3>
                <p className="text-sm text-gray-500">
                  Această acțiune va fi înregistrată în audit trail
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 mb-2">
                Sunteți sigur că doriți să schimbați rolul pentru:
              </p>
              <p className="text-sm font-semibold text-gray-900 mb-3">
                {userName}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Din:</span>
                <span className="px-2 py-1 bg-gray-200 rounded font-medium">
                  {roles.find(r => r.value === currentRole)?.label}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span className="text-gray-600">În:</span>
                <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded font-medium">
                  {roles.find(r => r.value === selectedRole)?.label}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800">
                <strong>📋 Conform GDPR:</strong> Această modificare va fi înregistrată în istoricul de audit,
                incluzând data, ora și administratorul care a efectuat schimbarea.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={isChanging}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Anulează
              </button>
              <button
                onClick={handleConfirm}
                disabled={isChanging}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isChanging ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Se procesează...
                  </>
                ) : (
                  'Confirmă Schimbarea'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
