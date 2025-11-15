/**
 * Timeline pentru afișarea istoricului de activitate (Admin)
 */

'use client'
import React from 'react'
import { AdminActivityLog } from '../../lib/services/adminService'

interface AdminActivityTimelineProps {
  activities: AdminActivityLog[]
}

export default function AdminActivityTimeline({ activities }: AdminActivityTimelineProps) {
  const getActionLabel = (actionType: string): string => {
    const labels: Record<string, string> = {
      login: 'Autentificare',
      logout: 'Deconectare',
      create_request: 'Cerere Creată',
      update_request: 'Cerere Actualizată',
      delete_request: 'Cerere Ștearsă',
      upload_document: 'Document Încărcat',
      delete_document: 'Document Șters',
      role_change: 'Schimbare Rol',
      account_create: 'Cont Creat',
      account_disable: 'Cont Modificat',
      gdpr_consent: 'Consimțământ GDPR',
      gdpr_data_export: 'Export Date GDPR',
      gdpr_data_delete: 'Ștergere Date GDPR',
      admin_view_user: 'Vizualizare Utilizator',
      admin_edit_user: 'Editare Utilizator'
    }
    return labels[actionType] || actionType
  }

  const getActionIcon = (actionType: string): string => {
    const icons: Record<string, string> = {
      login: '🔓',
      logout: '🔒',
      create_request: '📝',
      update_request: '✏️',
      delete_request: '🗑️',
      upload_document: '📤',
      delete_document: '🗑️',
      role_change: '👤',
      account_create: '➕',
      account_disable: '⚙️',
      gdpr_consent: '✅',
      gdpr_data_export: '📊',
      gdpr_data_delete: '❌',
      admin_view_user: '👁️',
      admin_edit_user: '✏️'
    }
    return icons[actionType] || '📌'
  }

  const getActionColor = (actionType: string): string => {
    const colors: Record<string, string> = {
      login: 'bg-green-100 text-green-800 border-green-200',
      logout: 'bg-gray-100 text-gray-800 border-gray-200',
      create_request: 'bg-blue-100 text-blue-800 border-blue-200',
      update_request: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      delete_request: 'bg-red-100 text-red-800 border-red-200',
      upload_document: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      delete_document: 'bg-red-100 text-red-800 border-red-200',
      role_change: 'bg-purple-100 text-purple-800 border-purple-200',
      account_create: 'bg-green-100 text-green-800 border-green-200',
      account_disable: 'bg-orange-100 text-orange-800 border-orange-200',
      gdpr_consent: 'bg-teal-100 text-teal-800 border-teal-200',
      gdpr_data_export: 'bg-blue-100 text-blue-800 border-blue-200',
      gdpr_data_delete: 'bg-red-100 text-red-800 border-red-200',
      admin_view_user: 'bg-purple-100 text-purple-800 border-purple-200',
      admin_edit_user: 'bg-purple-100 text-purple-800 border-purple-200'
    }
    return colors[actionType] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Acum'
    if (diffMins < 60) return `Acum ${diffMins} min`
    if (diffHours < 24) return `Acum ${diffHours} ore`
    if (diffDays < 7) return `Acum ${diffDays} zile`

    return date.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDetails = (details: Record<string, any> | null): string => {
    if (!details) return ''
    
    const entries = Object.entries(details)
    if (entries.length === 0) return ''

    return entries
      .map(([key, value]) => {
        if (key === 'timestamp') return null
        if (key === 'new_role') return `Rol nou: ${value}`
        if (key === 'is_active') return value ? 'Cont activat' : 'Cont dezactivat'
        if (key === 'updated_fields') return `Câmpuri actualizate: ${(value as string[]).join(', ')}`
        return `${key}: ${JSON.stringify(value)}`
      })
      .filter(Boolean)
      .join(', ')
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Nicio activitate înregistrată</h3>
        <p className="mt-1 text-sm text-gray-500">
          Acest utilizator nu are activități recente în sistem.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
      <div className="divide-y divide-gray-200">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className="p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                {getActionIcon(activity.action_type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded border ${getActionColor(activity.action_type)}`}>
                    {getActionLabel(activity.action_type)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(activity.created_at)}
                  </span>
                </div>

                {/* Details */}
                {activity.details && (
                  <p className="mt-1 text-sm text-gray-700">
                    {formatDetails(activity.details)}
                  </p>
                )}

                {/* Affected User */}
                {activity.affected_user && (
                  <p className="mt-1 text-xs text-gray-500">
                    Utilizator afectat: {activity.affected_user.full_name || activity.affected_user.email}
                  </p>
                )}

                {/* IP & User Agent */}
                {(activity.ip_address || activity.user_agent) && (
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                    {activity.ip_address && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        {activity.ip_address}
                      </span>
                    )}
                    {activity.user_agent && (
                      <span className="truncate max-w-xs">
                        {activity.user_agent}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
