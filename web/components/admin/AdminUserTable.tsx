/**
 * Componenta pentru tabelul cu utilizatori (Admin)
 */

'use client'
import React, { useState } from 'react'
import { AdminUser } from '../../lib/services/adminService'
import AdminUserDetailsModal from './AdminUserDetailsModal'
import AdminRoleSelector from './AdminRoleSelector'

interface AdminUserTableProps {
  users: AdminUser[]
  onRoleChange: (userId: string, newRole: 'citizen' | 'clerk' | 'admin') => Promise<{ success: boolean; error?: string }>
  onToggleActive: (userId: string, isActive: boolean) => Promise<{ success: boolean; error?: string }>
  onUpdateUser: (userId: string, updates: Partial<Pick<AdminUser, 'full_name' | 'phone' | 'email'>>) => Promise<{ success: boolean; error?: string }>
}

export default function AdminUserTable({ 
  users, 
  onRoleChange, 
  onToggleActive,
  onUpdateUser 
}: AdminUserTableProps) {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: 'bg-purple-100 text-purple-800 border-purple-200',
      clerk: 'bg-blue-100 text-blue-800 border-blue-200',
      citizen: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    const labels = {
      admin: 'Administrator',
      clerk: 'Funcționar',
      citizen: 'Cetățean'
    }
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${badges[role as keyof typeof badges]}`}>
        {labels[role as keyof typeof labels]}
      </span>
    )
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
        Activ
      </span>
    ) : (
      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">
        Dezactivat
      </span>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Niciodată'
    const date = new Date(dateString)
    return date.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleViewDetails = (user: AdminUser) => {
    setSelectedUser(user)
    setShowDetailsModal(true)
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Utilizator
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Ultima Autentificare
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Înregistrat La
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Acțiuni
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {user.full_name || 'Fără nume'}
                    </span>
                    <span className="text-xs text-gray-500">{user.email}</span>
                    {user.phone && (
                      <span className="text-xs text-gray-400">{user.phone}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <AdminRoleSelector
                    currentRole={user.role}
                    userId={user.id}
                    userName={user.full_name || user.email}
                    onRoleChange={onRoleChange}
                  />
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(user.is_active)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatDate(user.last_login)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatDate(user.created_at)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleViewDetails(user)}
                      className="px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      Detalii
                    </button>
                    <button
                      onClick={() => onToggleActive(user.id, !user.is_active)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                        user.is_active
                          ? 'text-red-700 hover:bg-red-50'
                          : 'text-green-700 hover:bg-green-50'
                      }`}
                    >
                      {user.is_active ? 'Dezactivează' : 'Activează'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Niciun utilizator găsit</h3>
            <p className="mt-1 text-sm text-gray-500">
              Nu există utilizatori care să corespundă criteriilor de căutare.
            </p>
          </div>
        )}
      </div>

      {/* Modal cu detalii utilizator */}
      {showDetailsModal && selectedUser && (
        <AdminUserDetailsModal
          user={selectedUser}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedUser(null)
          }}
          onUpdate={onUpdateUser}
        />
      )}
    </>
  )
}
