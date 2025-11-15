'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../components/DashboardLayout'
import { getAllRequestsForClerk, type RequestWithDetails } from '../../../lib/clerkService'
import { getRequestTypes, getStatusLabel, getStatusColor } from '../../../lib/requestService'

export default function MyRequestsPage() {
    const router = useRouter()
    const [requests, setRequests] = useState<RequestWithDetails[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadMyRequests()
    }, [])

    async function loadMyRequests() {
        try {
            setLoading(true)
            setError(null)

            // Încarcă doar cererile asignate mie
            const data = await getAllRequestsForClerk({
                assignedToMe: true,
                sortBy: 'priority'
            })

            setRequests(data)
        } catch (err: any) {
            console.error('Error loading my requests:', err)
            setError(err.message || 'Eroare la încărcarea cererilor')
        } finally {
            setLoading(false)
        }
    }

    return (
        <DashboardLayout role="clerk">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Cererile Mele</h1>
                    <p className="text-gray-600 mt-1">Cererile asignate mie pentru procesare</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <p className="text-sm text-gray-600">Total Asignate</p>
                        <p className="text-3xl font-bold text-purple-600">{requests.length}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <p className="text-sm text-gray-600">În Procesare</p>
                        <p className="text-3xl font-bold text-blue-600">
                            {requests.filter(r => r.status === 'in_review').length}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <p className="text-sm text-gray-600">Urgente</p>
                        <p className="text-3xl font-bold text-red-600">
                            {requests.filter(r => r.days_until_deadline !== null && r.days_until_deadline !== undefined && r.days_until_deadline <= 3).length}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <p className="text-sm text-gray-600">Prioritate Înaltă</p>
                        <p className="text-3xl font-bold text-orange-600">
                            {requests.filter(r => r.priority >= 5).length}
                        </p>
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
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        Lista Cererilor Asignate
                    </h2>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="animate-pulse bg-gray-50 rounded-lg p-4 h-32"></div>
                            ))}
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-lg font-medium">Nu ai cereri asignate</p>
                            <p className="text-sm mt-1">Mergi la <a href="/clerk/queue" className="text-purple-600 underline">coada de cereri</a> pentru a prelua cereri</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {requests.map(request => {
                                const requestTypes = getRequestTypes()
                                const requestType = requestTypes.find(rt => rt.value === request.request_type)
                                const isUrgent = (request.days_until_deadline !== null && request.days_until_deadline !== undefined) && request.days_until_deadline <= 3

                                return (
                                    <div
                                        key={request.id}
                                        className={`border-2 rounded-lg p-5 transition-all cursor-pointer ${
                                            isUrgent 
                                                ? 'border-red-300 bg-red-50 hover:border-red-400' 
                                                : 'border-purple-200 bg-purple-50 hover:border-purple-400'
                                        }`}
                                        onClick={() => router.push(`/clerk/requests/${request.id}`)}
                                    >
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                                    <h3 className="text-lg font-semibold text-gray-800">
                                                        {requestType?.label || request.request_type}
                                                    </h3>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                                        {getStatusLabel(request.status)}
                                                    </span>
                                                    {isUrgent && (
                                                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">
                                                            🔥 URGENT
                                                        </span>
                                                    )}
                                                    {request.priority > 0 && (
                                                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                                            Prioritate {request.priority}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                        <span>{request.user_profile?.full_name || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        <span>{request.extracted_metadata?.address || 'Nedefinită'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        <span>{request.documents_count || 0} documente</span>
                                                    </div>
                                                    {request.days_until_deadline !== null && request.days_until_deadline !== undefined && (
                                                        <div className={`flex items-center gap-2 ${isUrgent ? 'text-red-700 font-semibold' : ''}`}>
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span>
                                                                {request.days_until_deadline > 0 
                                                                    ? `${request.days_until_deadline} zile`
                                                                    : request.days_until_deadline === 0
                                                                        ? 'Astăzi!'
                                                                        : `Depășit ${Math.abs(request.days_until_deadline)} zile`
                                                                }
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center">
                                                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}
