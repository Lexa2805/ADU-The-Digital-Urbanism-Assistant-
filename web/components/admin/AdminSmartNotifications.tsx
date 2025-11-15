'use client'
import React, { useState, useEffect } from 'react'
import { getUrgentRequests, autoAssignRequests, RequestWithDetails } from '../../lib/api/requestsApi'
import { getPendingDocuments, getRejectedDocuments, DocumentWithRequest } from '../../lib/api/documentsApi'

export default function AdminSmartNotifications() {
  const [urgentRequests, setUrgentRequests] = useState<RequestWithDetails[]>([])
  const [pendingDocs, setPendingDocs] = useState<DocumentWithRequest[]>([])
  const [rejectedDocs, setRejectedDocs] = useState<DocumentWithRequest[]>([])
  const [autoAssigning, setAutoAssigning] = useState(false)

  useEffect(() => {
    loadData()
    // Refresh every 2 minutes
    const interval = setInterval(loadData, 120000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [urgent, pending, rejected] = await Promise.all([
        getUrgentRequests(3),
        getPendingDocuments(),
        getRejectedDocuments()
      ])
      setUrgentRequests(urgent || [])
      setPendingDocs(pending || [])
      setRejectedDocs(rejected || [])
    } catch (error: any) {
      console.error('Error loading notifications:', error.message || error)
      // Set empty arrays on error
      setUrgentRequests([])
      setPendingDocs([])
      setRejectedDocs([])
    }
  }

  const handleAutoAssign = async () => {
    try {
      setAutoAssigning(true)
      const result = await autoAssignRequests()
      if (result.success) {
        alert(`✅ ${result.assigned_count} cereri alocate automat către funcționari!`)
        await loadData()
      }
    } catch (error: any) {
      alert('Eroare la alocarea automată: ' + (error.message || 'Eroare necunoscută'))
    } finally {
      setAutoAssigning(false)
    }
  }

  const totalNotifications = urgentRequests.length + pendingDocs.length + rejectedDocs.length

  if (totalNotifications === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-orange-200 p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Notificări Inteligente
            </h3>
            <p className="text-sm text-gray-600">
              {totalNotifications} {totalNotifications === 1 ? 'notificare necesită' : 'notificări necesită'} atenție
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Reîmprospătează"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        {/* Urgent Requests */}
        {urgentRequests.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-600 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h4 className="font-semibold text-red-800 mb-1">
                  Cereri Urgente ({urgentRequests.length})
                </h4>
                <p className="text-sm text-red-700 mb-2">
                  Termene legale expiră în max. 3 zile
                </p>
                <div className="space-y-1">
                  {urgentRequests.slice(0, 3).map(req => (
                    <div key={req.id} className="text-sm text-red-700">
                      • {req.request_type} - <strong>{req.user.full_name}</strong>
                      {req.legal_deadline && ` (Termen: ${new Date(req.legal_deadline).toLocaleDateString('ro-RO')})`}
                    </div>
                  ))}
                  {urgentRequests.length > 3 && (
                    <div className="text-sm text-red-600 font-medium">
                      +{urgentRequests.length - 3} cereri suplimentare
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pending Documents */}
        {pendingDocs.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-600 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-800 mb-1">
                  Documente În Așteptare ({pendingDocs.length})
                </h4>
                <p className="text-sm text-yellow-700">
                  Validare AI în curs de procesare
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rejected Documents */}
        {rejectedDocs.length > 0 && (
          <div className="bg-orange-50 border-l-4 border-orange-600 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h4 className="font-semibold text-orange-800 mb-1">
                  Documente Invalidate ({rejectedDocs.length})
                </h4>
                <p className="text-sm text-orange-700">
                  AI a detectat probleme - necesită verificare manuală
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Auto-Assign Button */}
        <button
          onClick={handleAutoAssign}
          disabled={autoAssigning}
          className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {autoAssigning ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Se alocă...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Alocare Automată AI - Distribuie Cereri Noi
            </>
          )}
        </button>
      </div>
    </div>
  )
}
