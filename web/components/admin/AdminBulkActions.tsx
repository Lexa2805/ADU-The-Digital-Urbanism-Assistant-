'use client'
import React, { useState } from 'react'

interface BulkActionsProps {
  selectedCount: number
  onClearSelection: () => void
  onBulkAction: (action: string) => Promise<void>
}

export default function AdminBulkActions({
  selectedCount,
  onClearSelection,
  onBulkAction
}: BulkActionsProps) {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [actionType, setActionType] = useState<string | null>(null)

  const handleAction = async (action: string) => {
    setActionType(action)
    setShowConfirm(true)
  }

  const confirmAction = async () => {
    if (!actionType) return

    try {
      setLoading(true)
      await onBulkAction(actionType)
      setShowConfirm(false)
      setActionType(null)
      onClearSelection()
    } catch (error) {
      console.error('Bulk action error:', error)
      alert('Eroare la procesarea acțiunii în masă')
    } finally {
      setLoading(false)
    }
  }

  if (selectedCount === 0) return null

  return (
    <>
      <div className="bg-purple-50 border-l-4 border-purple-600 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold text-purple-800">
              {selectedCount} {selectedCount === 1 ? 'utilizator selectat' : 'utilizatori selectați'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAction('activate')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Activează
            </button>
            <button
              onClick={() => handleAction('deactivate')}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
            >
              Dezactivează
            </button>
            <button
              onClick={() => handleAction('export')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Exportă CSV
            </button>
            <button
              onClick={onClearSelection}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Anulează
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Confirmă Acțiunea în Masă
            </h3>
            <p className="text-gray-600 mb-6">
              Ești sigur că vrei să {actionType === 'activate' ? 'activezi' : actionType === 'deactivate' ? 'dezactivezi' : 'exporți'}{' '}
              <strong>{selectedCount}</strong> {selectedCount === 1 ? 'utilizator' : 'utilizatori'}?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirm(false)
                  setActionType(null)
                }}
                disabled={loading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={confirmAction}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Se procesează...' : 'Confirmă'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
