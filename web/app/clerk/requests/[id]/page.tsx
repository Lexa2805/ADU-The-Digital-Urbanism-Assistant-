'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '../../../../components/DashboardLayout'
import { getRequestById, getStatusLabel, getStatusColor, getRequestTypes } from '../../../../lib/requestService'
import { getRequestDocuments, getDocumentUrl, type Document } from '../../../../lib/documentService'
import { approveRequest, rejectRequest, unassignRequest, updateRequestPriority } from '../../../../lib/clerkService'
import { supabase } from '../../../../lib/supabaseClient'

interface RequestDetails {
    id: string
    user_id: string
    request_type: string
    status: string
    priority: number
    legal_deadline: string | null
    location: any
    extracted_metadata: any
    assigned_clerk_id: string | null
    created_at: string
}

interface UserProfile {
    full_name: string | null
    role: string
}

export default function ClerkRequestDetailsPage() {
    const router = useRouter()
    const params = useParams()
    const requestId = params?.id as string

    const [request, setRequest] = useState<RequestDetails | null>(null)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState(false)

    // Modal states
    const [showApproveModal, setShowApproveModal] = useState(false)
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [showPriorityModal, setShowPriorityModal] = useState(false)
    const [approvalNotes, setApprovalNotes] = useState('')
    const [rejectionReason, setRejectionReason] = useState('')
    const [newPriority, setNewPriority] = useState(0)

    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    useEffect(() => {
        loadRequestDetails()
        loadCurrentUser()
    }, [requestId])

    async function loadCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            setCurrentUserId(user.id)
        }
    }

    async function loadRequestDetails() {
        try {
            setLoading(true)
            setError(null)

            // Încarcă cererea
            const requestData = await getRequestById(requestId)
            setRequest(requestData)
            setNewPriority(requestData.priority || 0)

            // Încarcă profilul utilizatorului care a creat cererea
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, role')
                .eq('id', requestData.user_id)
                .single()

            if (!profileError && profileData) {
                setUserProfile(profileData)
            }

            // Încarcă documentele
            const docsData = await getRequestDocuments(requestId)
            setDocuments(docsData)

        } catch (err: any) {
            console.error('Error loading request details:', err)
            setError(err.message || 'Eroare la încărcarea detaliilor cererii')
        } finally {
            setLoading(false)
        }
    }

    async function handleApprove() {
        try {
            setActionLoading(true)
            await approveRequest(requestId, approvalNotes)
            setShowApproveModal(false)
            await loadRequestDetails()
            alert('Cerere aprobată cu succes!')
        } catch (err: any) {
            console.error('Error approving request:', err)
            alert('Eroare la aprobarea cererii: ' + err.message)
        } finally {
            setActionLoading(false)
        }
    }

    async function handleReject() {
        if (!rejectionReason.trim()) {
            alert('Te rugăm să introduci un motiv pentru respingere.')
            return
        }

        try {
            setActionLoading(true)
            await rejectRequest(requestId, rejectionReason)
            setShowRejectModal(false)
            await loadRequestDetails()
            alert('Cerere respinsă.')
        } catch (err: any) {
            console.error('Error rejecting request:', err)
            alert('Eroare la respingerea cererii: ' + err.message)
        } finally {
            setActionLoading(false)
        }
    }

    async function handleUnassign() {
        if (!confirm('Sigur vrei să eliberezi această cerere?')) return

        try {
            setActionLoading(true)
            await unassignRequest(requestId)
            await loadRequestDetails()
            router.push('/clerk/queue')
        } catch (err: any) {
            console.error('Error unassigning request:', err)
            alert('Eroare la eliberarea cererii: ' + err.message)
        } finally {
            setActionLoading(false)
        }
    }

    async function handleUpdatePriority() {
        try {
            setActionLoading(true)
            await updateRequestPriority(requestId, newPriority)
            setShowPriorityModal(false)
            await loadRequestDetails()
            alert('Prioritate actualizată!')
        } catch (err: any) {
            console.error('Error updating priority:', err)
            alert('Eroare la actualizarea priorității: ' + err.message)
        } finally {
            setActionLoading(false)
        }
    }

    async function handleDownloadDocument(doc: Document) {
        try {
            const url = await getDocumentUrl(doc.storage_path)
            window.open(url, '_blank')
        } catch (err) {
            console.error('Error downloading document:', err)
            alert('Eroare la descărcarea documentului')
        }
    }

    if (loading) {
        return (
            <DashboardLayout role="clerk">
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
            </DashboardLayout>
        )
    }

    if (error || !request) {
        return (
            <DashboardLayout role="clerk">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <p className="text-red-800">{error || 'Cerere negăsită'}</p>
                    <button
                        onClick={() => router.push('/clerk/queue')}
                        className="mt-4 text-purple-600 hover:text-purple-700"
                    >
                        ← Înapoi la coadă
                    </button>
                </div>
            </DashboardLayout>
        )
    }

    const requestTypes = getRequestTypes()
    const requestType = requestTypes.find(rt => rt.value === request.request_type)
    const isAssignedToMe = request.assigned_clerk_id === currentUserId
    const canTakeAction = request.status === 'in_review' && isAssignedToMe

    return (
        <DashboardLayout role="clerk">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <button
                            onClick={() => router.push('/clerk/queue')}
                            className="text-purple-600 hover:text-purple-700 mb-2 flex items-center gap-1"
                        >
                            ← Înapoi la coadă
                        </button>
                        <h1 className="text-2xl font-bold text-gray-800">
                            {requestType?.label || request.request_type}
                        </h1>
                        <p className="text-gray-600 mt-1">Cerere #{request.id.slice(0, 8)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-4 py-2 rounded-lg text-sm font-medium ${getStatusColor(request.status)}`}>
                            {getStatusLabel(request.status)}
                        </span>
                        {request.priority > 0 && (
                            <span className="px-4 py-2 bg-orange-100 text-orange-800 rounded-lg text-sm font-medium">
                                Prioritate {request.priority}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions Bar */}
                {canTakeAction && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowApproveModal(true)}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                                ✓ Aprobă Cererea
                            </button>
                            <button
                                onClick={() => setShowRejectModal(true)}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                                ✗ Respinge Cererea
                            </button>
                            <button
                                onClick={() => setShowPriorityModal(true)}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                            >
                                🔥 Schimbă Prioritatea
                            </button>
                            <button
                                onClick={handleUnassign}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors ml-auto"
                            >
                                Eliberează Cererea
                            </button>
                        </div>
                    </div>
                )}

                {!isAssignedToMe && request.status === 'pending_validation' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-yellow-800">
                            Această cerere nu este asignată încă. Mergi la <a href="/clerk/queue" className="underline">coada de cereri</a> pentru a o prelua.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Informații Solicitant */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Informații Solicitant</h2>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <div>
                                        <p className="text-sm text-gray-600">Nume complet</p>
                                        <p className="font-medium text-gray-800">{userProfile?.full_name || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <div>
                                        <p className="text-sm text-gray-600">Data înregistrării</p>
                                        <p className="font-medium text-gray-800">
                                            {new Date(request.created_at).toLocaleString('ro-RO')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detalii Cerere */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Detalii Cerere</h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Adresă</p>
                                    <p className="font-medium text-gray-800">
                                        {request.extracted_metadata?.address || 'Nedefinită'}
                                    </p>
                                </div>
                                {request.extracted_metadata?.cadastral_number && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Număr Cadastral</p>
                                        <p className="font-medium text-gray-800">
                                            {request.extracted_metadata.cadastral_number}
                                        </p>
                                    </div>
                                )}
                                {request.extracted_metadata?.description && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Descriere</p>
                                        <p className="text-gray-800">
                                            {request.extracted_metadata.description}
                                        </p>
                                    </div>
                                )}
                                {request.legal_deadline && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Termen Legal</p>
                                        <p className="font-medium text-gray-800">
                                            {new Date(request.legal_deadline).toLocaleDateString('ro-RO')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Documente */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">
                                Documente ({documents.length})
                            </h2>
                            {documents.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">Nu sunt documente încărcate</p>
                            ) : (
                                <div className="space-y-3">
                                    {documents.map((doc) => (
                                        <div
                                            key={doc.id}
                                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                                <div>
                                                    <p className="font-medium text-gray-800">{doc.file_name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                            doc.validation_status === 'approved' 
                                                                ? 'bg-green-100 text-green-800'
                                                                : doc.validation_status === 'rejected'
                                                                    ? 'bg-red-100 text-red-800'
                                                                    : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {doc.validation_status === 'approved' ? 'Validat' : 
                                                             doc.validation_status === 'rejected' ? 'Respins' : 'În validare'}
                                                        </span>
                                                        {doc.document_type_ai && (
                                                            <span className="text-xs text-gray-500">
                                                                {doc.document_type_ai}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {doc.validation_message && (
                                                        <p className="text-xs text-gray-600 mt-1">{doc.validation_message}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDownloadDocument(doc)}
                                                className="px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                            >
                                                Descarcă
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Timeline/Status */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Status</h2>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className={`w-2 h-2 rounded-full mt-2 ${
                                        request.status === 'draft' ? 'bg-gray-400' : 'bg-green-500'
                                    }`}></div>
                                    <div>
                                        <p className="font-medium text-gray-800">Creat</p>
                                        <p className="text-sm text-gray-600">
                                            {new Date(request.created_at).toLocaleDateString('ro-RO')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className={`w-2 h-2 rounded-full mt-2 ${
                                        ['pending_validation', 'in_review', 'approved', 'rejected'].includes(request.status) 
                                            ? 'bg-green-500' 
                                            : 'bg-gray-300'
                                    }`}></div>
                                    <div>
                                        <p className="font-medium text-gray-800">În validare</p>
                                        <p className="text-sm text-gray-600">
                                            {request.status === 'draft' ? 'În așteptare' : 'Validat'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className={`w-2 h-2 rounded-full mt-2 ${
                                        ['in_review', 'approved', 'rejected'].includes(request.status) 
                                            ? 'bg-green-500' 
                                            : 'bg-gray-300'
                                    }`}></div>
                                    <div>
                                        <p className="font-medium text-gray-800">În procesare</p>
                                        <p className="text-sm text-gray-600">
                                            {request.status === 'in_review' ? 'În lucru' : 
                                             ['approved', 'rejected'].includes(request.status) ? 'Finalizat' : 'În așteptare'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className={`w-2 h-2 rounded-full mt-2 ${
                                        request.status === 'approved' ? 'bg-green-500' : 
                                        request.status === 'rejected' ? 'bg-red-500' : 'bg-gray-300'
                                    }`}></div>
                                    <div>
                                        <p className="font-medium text-gray-800">Finalizat</p>
                                        <p className="text-sm text-gray-600">
                                            {request.status === 'approved' ? 'Aprobat' : 
                                             request.status === 'rejected' ? 'Respins' : 'În așteptare'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Metadata AI */}
                        {request.extracted_metadata?.approval_notes && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                <h3 className="font-semibold text-green-800 mb-2">Note aprobare</h3>
                                <p className="text-sm text-green-700">{request.extracted_metadata.approval_notes}</p>
                            </div>
                        )}
                        {request.extracted_metadata?.rejection_reason && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <h3 className="font-semibold text-red-800 mb-2">Motiv respingere</h3>
                                <p className="text-sm text-red-700">{request.extracted_metadata.rejection_reason}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Approve Modal */}
                {showApproveModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Aprobă Cererea</h3>
                            <textarea
                                value={approvalNotes}
                                onChange={(e) => setApprovalNotes(e.target.value)}
                                placeholder="Note suplimentare (opțional)"
                                rows={4}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={handleApprove}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Se procesează...' : 'Confirmă Aprobare'}
                                </button>
                                <button
                                    onClick={() => setShowApproveModal(false)}
                                    disabled={actionLoading}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Anulează
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reject Modal */}
                {showRejectModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Respinge Cererea</h3>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Motiv respingere (obligatoriu) *"
                                rows={4}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={handleReject}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Se procesează...' : 'Confirmă Respingere'}
                                </button>
                                <button
                                    onClick={() => setShowRejectModal(false)}
                                    disabled={actionLoading}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Anulează
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Priority Modal */}
                {showPriorityModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Schimbă Prioritatea</h3>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Prioritate (0-10)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={newPriority}
                                    onChange={(e) => setNewPriority(parseInt(e.target.value) || 0)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">0 = Normal, 10 = Urgență maximă</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleUpdatePriority}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Se procesează...' : 'Actualizează'}
                                </button>
                                <button
                                    onClick={() => setShowPriorityModal(false)}
                                    disabled={actionLoading}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Anulează
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
