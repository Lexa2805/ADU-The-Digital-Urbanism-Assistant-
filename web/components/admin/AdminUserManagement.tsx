/**
 * Componenta principală pentru gestionarea utilizatorilor (Admin)
 */

'use client'
import React, { useState } from 'react'
import { useAdminUsers } from '../../lib/hooks/useAdminUsers'
import AdminUserTable from './AdminUserTable'

export default function AdminUserManagement() {
  const {
    users,
    stats,
    loading,
    error,
    changeUserRole,
    toggleActive,
    updateUser,
    searchUsers,
    filterByRole,
    filterByActive
  } = useAdminUsers()

  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null)

  // Aplică toate filtrele
  let filteredUsers = users
  
  if (searchTerm) {
    filteredUsers = searchUsers(searchTerm)
  }
  
  if (roleFilter) {
    filteredUsers = filterByRole(roleFilter)
  }
  
  if (activeFilter !== null) {
    filteredUsers = filterByActive(activeFilter)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Se încarcă utilizatorii...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-red-800 font-semibold">Eroare la încărcarea datelor</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistici Rapide */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <StatCard
            label="Total Utilizatori"
            value={stats.total_users}
            icon="👥"
            color="purple"
          />
          <StatCard
            label="Cetățeni"
            value={stats.total_citizens}
            icon="👤"
            color="gray"
          />
          <StatCard
            label="Funcționari"
            value={stats.total_clerks}
            icon="💼"
            color="blue"
          />
          <StatCard
            label="Administratori"
            value={stats.total_admins}
            icon="👑"
            color="purple"
          />
          <StatCard
            label="Conturi Active"
            value={stats.active_users}
            icon="✅"
            color="green"
          />
          <StatCard
            label="Dezactivate"
            value={stats.inactive_users}
            icon="⛔"
            color="red"
          />
          <StatCard
            label="Noi (Luna)"
            value={stats.new_users_this_month}
            icon="🆕"
            color="indigo"
          />
        </div>
      )}

      {/* Filtre și Căutare */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Căutare */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Caută utilizator
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nume, email sau telefon..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtru Rol */}
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrează după rol
            </label>
            <select
              value={roleFilter || ''}
              onChange={(e) => setRoleFilter(e.target.value || null)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Toate rolurile</option>
              <option value="citizen">Cetățeni</option>
              <option value="clerk">Funcționari</option>
              <option value="admin">Administratori</option>
            </select>
          </div>

          {/* Filtru Status */}
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrează după status
            </label>
            <select
              value={activeFilter === null ? '' : activeFilter ? 'active' : 'inactive'}
              onChange={(e) => {
                if (e.target.value === '') setActiveFilter(null)
                else setActiveFilter(e.target.value === 'active')
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Toate statusurile</option>
              <option value="active">Doar active</option>
              <option value="inactive">Doar dezactivate</option>
            </select>
          </div>

          {/* Reset Filtre */}
          {(searchTerm || roleFilter || activeFilter !== null) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setRoleFilter(null)
                  setActiveFilter(null)
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
              >
                Resetează filtrele
              </button>
            </div>
          )}
        </div>

        {/* Număr rezultate */}
        <div className="mt-4 text-sm text-gray-600">
          Se afișează <strong>{filteredUsers.length}</strong> din <strong>{users.length}</strong> utilizatori
        </div>
      </div>

      {/* Tabel Utilizatori */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <AdminUserTable
          users={filteredUsers}
          onRoleChange={changeUserRole}
          onToggleActive={toggleActive}
          onUpdateUser={updateUser}
        />
      </div>

      {/* GDPR Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-blue-900">Notificare Conformitate GDPR</h4>
            <p className="text-xs text-blue-800 mt-1">
              Toate vizualizările și modificările efectuate asupra datelor utilizatorilor sunt înregistrate 
              în jurnalul de audit conform Regulamentului (UE) 2016/679 privind protecția datelor. 
              Ca administrator, aveți responsabilitatea de a proteja informațiile personale vizualizate.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ 
  label, 
  value, 
  icon, 
  color = 'gray' 
}: {
  label: string
  value: number
  icon: string
  color?: string
}) {
  const colorClasses: Record<string, string> = {
    gray: 'from-gray-50 to-gray-100 border-gray-200',
    blue: 'from-blue-50 to-blue-100 border-blue-200',
    purple: 'from-purple-50 to-purple-100 border-purple-200',
    green: 'from-green-50 to-green-100 border-green-200',
    red: 'from-red-50 to-red-100 border-red-200',
    indigo: 'from-indigo-50 to-indigo-100 border-indigo-200'
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4 border shadow-sm`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-600 mt-1">{label}</div>
    </div>
  )
}
