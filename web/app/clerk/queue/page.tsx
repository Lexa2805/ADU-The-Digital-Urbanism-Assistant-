'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../components/DashboardLayout'
import { getPrioritizedRequests, assignRequestToMe, type PrioritizedRequest } from '../../../lib/clerkService'
import { getRequestTypes, getStatusLabel, getStatusColor, type RequestStatus } from '../../../lib/requestService'

export default function ClerkQueuePage() {
    const router = useRouter()
    const [allRequests, setAllRequests] = useState<PrioritizedRequest[]>([])
    const [filteredRequests, setFilteredRequests] = useState<PrioritizedRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [assignedFilter, setAssignedFilter] = useState<string>('all')
    const [urgencyFilter, setUrgencyFilter] = useState<string>('all')

    useEffect(() => {
        loadRequests()
    }, [])

    useEffect(() => {
        applyFilters()
    }, [statusFilter, assignedFilter, urgencyFilter, allRequests])

    async function loadRequests() {
        try {
            setLoading(true)
            setError(null)

            const data = await getPrioritizedRequests()
            setAllRequests(data)
        } catch (err: any) {
            console.error('Error loading requests:', err)
            setError(err.message || 'Eroare la încărcarea cererilor')
        } finally {
            setLoading(false)
        }
    }

    function applyFilters() {
        let filtered = [...allRequests]

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(r => r.status === statusFilter)
        }

        // Assigned filter
        if (assignedFilter === 'unassigned') {
            filtered = filtered.filter(r => !r.assigned_clerk_id)
        } else if (assignedFilter === 'assigned') {
            filtered = filtered.filter(r => r.assigned_clerk_id)
        }

        // Urgency filter
        if (urgencyFilter === 'urgent') {
            filtered = filtered.filter(r => r.days_left !== null && r.days_left <= 3)
        } else if (urgencyFilter === 'high') {
            filtered = filtered.filter(r => r.priority_score >= 100)
        }

        setFilteredRequests(filtered)
    }

    async function handleClaimRequest(requestId: string) {
        try {
            await assignRequestToMe(requestId)
            await loadRequests()
        } catch (err: any) {
            console.error('Error claiming request:', err)
            alert('Eroare la preluarea cererii: ' + err.message)
        }
    }

    const statusOptions = [
        { value: 'all', label: 'Toate statusurile' },
        { value: 'pending_validation', label: 'Validare' },
        { value: 'in_review', label: 'În procesare' },
        { value: 'approved', label: 'Aprobate' },
        { value: 'rejected', label: 'Respinse' },
    ]

    return (
        <DashboardLayout role="clerk">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Coada de Cereri</h1>
                    <p className="text-gray-600 mt-1">Gestionează și procesează cererile de urbanism</p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                {statusOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Assigned Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Asignare
                            </label>
                            <select
                                value={assignedFilter}
                                onChange={(e) => setAssignedFilter(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="all">Toate</option>
                                <option value="unassigned">Neasignate</option>
                                <option value="assigned">Asignate</option>
                            </select>
                        </div>

                        {/* Urgency Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Urgență
                            </label>
                            <select
                                value={urgencyFilter}
                                onChange={(e) => setUrgencyFilter(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="all">Toate</option>
                                <option value="urgent">Urgente (≤3 zile)</option>
                                <option value="high">Prioritate înaltă (scor ≥100)</option>
                            </select>
                        </div>
                        
                        {/* Am scos filtrul de sortare, e automat acum */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Sortare
                            </label>
                            <div className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-600">
                                Automat (Prioritate)
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {/* Requests List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">
                            {filteredRequests.length} {filteredRequests.length === 1 ? 'cerere' : 'cereri'}
                            {allRequests.length !== filteredRequests.length && ` (din ${allRequests.length} total)`}
                        </h2>
                        <div className="text-sm text-gray-600">
                            Sortate după: Prioritate (termen legal + backlog)
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="animate-pulse bg-gray-50 rounded-lg p-4 h-32"></div>
                            ))}
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <p className="text-lg font-medium">Nu sunt cereri disponibile</p>
                            <p className="text-sm mt-1">Încearcă să modifici filtrele</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredRequests.map((request, index) => {
                                const requestTypes = getRequestTypes()
                                const requestType = requestTypes.find(rt => rt.value === request.request_type)
                                const isUrgent = request.days_left !== null && request.days_left <= 3
                                const isAssignedToMe = request.assigned_clerk_id !== null

                                return (
                                    <div
                                        key={request.id}
                                        className={`border-2 rounded-lg p-5 transition-all ${isUrgent
                                                ? 'border-red-400 bg-red-50'
                                                : isAssignedToMe
                                                    ? 'border-purple-300 bg-purple-50'
                                                    : 'border-gray-200 hover:border-purple-300'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-3 flex-wrap">
                                                    {/* Priority Rank */}
                                                    <span className="text-2xl font-bold text-purple-600">
                                                        #{index + 1}
                                                    </span>

                                                    <h3 className="text-lg font-semibold text-gray-800">
                                                        {requestType?.label || request.request_type}
                                                    </h3>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                                        {getStatusLabel(request.status)}
                                                    </span>

                                                    {/* Priority Score Badge */}
                                                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">
                                                        ⚡ {request.priority_score} puncte
                                                    </span>

                                                    {isUrgent && (
                                                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">
                                                            🔥 URGENT
                                                        </span>
                                                    )}
                                                    {/* AM SCOS ASTA PENTRU CĂ FILTRUL DE SUS E MAI BUN
                                                    {request.priority > 0 && (
                                                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                                            Prioritate {request.priority}
                                                        </span>
                                                    )}
                                                    */}
                                                    {isAssignedToMe && (
                                                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                                            Asignat
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600 mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                        <span><strong>Solicitant:</strong> {request.citizen_name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span className={isUrgent ? 'font-bold text-red-600' : ''}><strong>Termen:</strong> {request.days_left !== null ? `${request.days_left} zile rămase` : 'Fără termen'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                        </svg>
                                                        <span><strong>Backlog:</strong> {request.backlog_in_category} cereri similare</span>
                                                    </div>
                                                </div>

                                                {/* Priority Explanation */}
                                                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 mb-3">
                                                    <strong>🎯 De ce această prioritate?</strong>
                                                    <ul className="ml-4 mt-1 space-y-1">
                                                        {request.days_left !== null && request.days_left <= 7 && (
                                                            <li>• Termen legal aproape de expirare ({request.days_left} zile)</li>
                                                        )}
                                                        {request.backlog_in_category > 5 && (
                                                            <li>• Categorie cu backlog mare ({request.backlog_in_category} cereri)</li>
                                                        )}
                                                        <li>• Scor total calculat: {request.priority_score} puncte</li>
                                                    </ul>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        <span><strong>Adresă:</strong> {request.extracted_metadata?.address || 'Nedefinită'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        <span><strong>Documente:</strong> {request.documents_count || 0}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => router.push(`/clerk/requests/${request.id}`)}
                                                    className="px-4 py-2 text-sm bg-white border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                                                >
                                                    Vezi Detalii
                                                </button>
                                                {request.status === 'pending_validation' && !request.assigned_clerk_id && (
                                                    <button
                                                        onClick={() => handleClaimRequest(request.id)}
                                                        className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                                    >
                                                        Preia Cererea
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout >
    )
}