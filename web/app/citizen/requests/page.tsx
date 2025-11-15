'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import FloatingChatButton from '../../../components/FloatingChatButton'
import { getUserRequests, getStatusLabel, getStatusColor, getRequestTypes } from '../../../lib/requestService'
import { supabase } from '../../../lib/supabaseClient'

import type { RequestStatus, RequestType } from '../../../lib/requestService'

type Request = {
    id: string
    request_type: RequestType
    status: RequestStatus
    extracted_metadata?: {
        address?: string
        cadastral_number?: string
        description?: string
    }
    created_at: string
    updated_at: string
}

export default function CitizenRequestsPage() {
    const [requests, setRequests] = useState<Request[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filter, setFilter] = useState<string>('all')

    useEffect(() => {
        loadRequests()
    }, [])

    async function loadRequests() {
        try {
            setLoading(true)
            setError(null)

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setError('Nu sunteți autentificat')
                return
            }

            const data = await getUserRequests()
            setRequests(data)
        } catch (err) {
            console.error('Error loading requests:', err)
            setError('Nu s-au putut încărca cererile')
        } finally {
            setLoading(false)
        }
    }

    const filteredRequests = filter === 'all' 
        ? requests 
        : requests.filter(r => r.status === filter)

    const statusCounts = {
        all: requests.length,
        draft: requests.filter(r => r.status === 'draft').length,
        pending_validation: requests.filter(r => r.status === 'pending_validation').length,
        in_review: requests.filter(r => r.status === 'in_review').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
    }

    return (
        <div className="p-8">
            <FloatingChatButton />
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-purple-700">Cererile Mele</h1>
                        <p className="text-gray-600 mt-1">Gestionează toate cererile tale de urbanism</p>
                    </div>
                    <Link
                        href="/chat"
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Cerere Nouă
                    </Link>
                </div>

                {/* Filter Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 flex gap-1 overflow-x-auto">
                    {[
                        { key: 'all', label: 'Toate', count: statusCounts.all },
                        { key: 'draft', label: 'Ciorne', count: statusCounts.draft },
                        { key: 'pending_validation', label: 'În validare', count: statusCounts.pending_validation },
                        { key: 'in_review', label: 'În evaluare', count: statusCounts.in_review },
                        { key: 'approved', label: 'Aprobate', count: statusCounts.approved },
                        { key: 'rejected', label: 'Respinse', count: statusCounts.rejected },
                    ].map(({ key, label, count }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                                filter === key
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {label} ({count})
                        </button>
                    ))}
                </div>

                {/* Requests List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                            <p className="text-gray-600 mt-4">Se încarcă cererile...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                            <p className="text-red-800">{error}</p>
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-lg font-medium text-gray-800">Nu ai cereri {filter !== 'all' ? getStatusLabel(filter as RequestStatus) : ''}</p>
                            <p className="text-sm text-gray-600 mt-1">Creează prima ta cerere pentru a începe</p>
                            <a
                                href="/citizen/new-request"
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                                Cerere Nouă
                            </a>
                        </div>
                    ) : (
                        filteredRequests.map((request) => {
                            const requestTypes = getRequestTypes()
                            const requestType = requestTypes.find(rt => rt.value === request.request_type)
                            
                            return (
                                <Link
                                    key={request.id}
                                    href={`/status/${request.id}`}
                                    className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold text-gray-800">
                                                    {requestType?.label || request.request_type}
                                                </h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                                    {getStatusLabel(request.status)}
                                                </span>
                                            </div>
                                            <div className="space-y-1 text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    <span>{request.extracted_metadata?.address || 'Adresă nedefinită'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span>Creat: {new Date(request.created_at).toLocaleDateString('ro-RO')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </Link>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}
