'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../components/DashboardLayout'
// IMPORTURI MODIFICATE
import { getClerkStats, getPrioritizedRequests, assignRequestToMe, type ClerkStats, type PrioritizedRequest } from '../../lib/clerkService'
import { getRequestTypes, getStatusLabel, getStatusColor } from '../../lib/requestService'

export default function ClerkDashboard() {
    const router = useRouter()
    const [stats, setStats] = useState<ClerkStats | null>(null)
    // TIP MODIFICAT
    const [requests, setRequests] = useState<PrioritizedRequest[]>([]) 
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            setLoading(true)
            setError(null)
            
            const [statsData, requestsData] = await Promise.all([
                getClerkStats(),
                // FUNCȚIE MODIFICATĂ
                getPrioritizedRequests()
            ])

            setStats(statsData)
            setRequests(requestsData.slice(0, 5)) // Primele 5 cereri
        } catch (err: any) {
            console.error('Error loading clerk data:', err)
            setError(err.message || 'Eroare la încărcarea datelor')
        } finally {
            setLoading(false)
        }
    }

    async function handleClaimRequest(requestId: string) {
        try {
            await assignRequestToMe(requestId)
            await loadData() // Reîncarcă datele
        } catch (err: any) {
            console.error('Error claiming request:', err)
            alert('Eroare la preluarea cererii: ' + err.message)
        }
    }

    return (
        <DashboardLayout role="clerk">
            <div className="space-y-6">
                {/* Welcome Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-2xl font-semibold text-purple-700 mb-2">
                        Panou Funcționar
                    </h2>
                    <p className="text-gray-600">
                        Gestionează și procesează cererile de urbanism.
                    </p>
                </div>

                {/* Stats Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                                <div className="w-12 h-12 bg-gray-200 rounded-lg mb-3"></div>
                                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                                <div className="h-8 bg-gray-200 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : stats ? (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <StatCard
                            title="Cereri Noi"
                            value={stats.pending_validation.toString()}
                            color="purple"
                            icon={
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            }
                        />
                        <StatCard
                            title="În Procesare"
                            value={stats.in_review.toString()}
                            color="blue"
                            icon={
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }
                        />
                        <StatCard
                            title="Aproape Termen"
                            value={stats.near_deadline.toString()}
                            color="orange"
                            icon={
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            }
                        />
                        <StatCard
                            title="Finalizate Luna"
                            value={stats.completed_this_month.toString()}
                            color="green"
                            icon={
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }
                        />
                        <StatCard
                            title="Asignate Mie"
                            value={stats.assigned_to_me.toString()}
                            color="indigo"
                            icon={
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            }
                        />
                    </div>
                ) : null}

                {/* Priority Queue */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Coada de Priorități</h3>
                        <a 
                            href="/clerk/queue"
                            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                            Vezi toate →
                        </a>
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="animate-pulse bg-gray-50 rounded-lg p-4 h-24"></div>
                            ))}
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <p className="text-lg font-medium">Nu sunt cereri în așteptare</p>
                            <p className="text-sm mt-1">Toate cererile au fost procesate</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {requests.map((request, index) => { // 'request' este acum PrioritizedRequest
                                const requestTypes = getRequestTypes()
                                const requestType = requestTypes.find(rt => rt.value === request.request_type)
                                // FOLOSIM NOUL CÂMP
                                const isUrgent = request.days_left !== null && request.days_left <= 3

                                return (
                                    <div
                                        key={request.id}
                                        className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span className="text-lg font-bold text-purple-600">
                                                        #{index + 1}
                                                    </span>
                                                    <h4 className="font-semibold text-gray-800">
                                                        {requestType?.label || request.request_type}
                                                    </h4>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                                        {getStatusLabel(request.status)}
                                                    </span>
                                                    {isUrgent && (
                                                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                                            🔥 Urgent
                                                        </span>
                                                    )}
                                                    {/* BADGE PENTRU SCORUL DE PRIORITATE */}
                                                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">
                                                        ⚡ {request.priority_score} puncte
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-600 space-y-1">
                                                    {/* FOLOSIM NOUL CÂMP */}
                                                    <p>Solicitant: {request.citizen_name || 'N/A'}</p>
                                                    <p>Adresă: {request.extracted_metadata?.address || 'Nedefinită'}</p>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <span className="flex items-center gap-1">
                                                            📄 {request.documents_count || 0} documente
                                                        </span>
                                                        {/* FOLOSIM NOUL CÂMP */}
                                                        {request.days_left !== null && (
                                                            <span className={`flex items-center gap-1 ${isUrgent ? 'text-red-600 font-semibold' : ''}`}>
                                                                ⏰ {request.days_left} zile
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => router.push(`/clerk/requests/${request.id}`)}
                                                    className="px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                >
                                                    Vezi
                                                </button>
                                                {request.status === 'pending_validation' && !request.assigned_clerk_id && (
                                                    <button
                                                        onClick={() => handleClaimRequest(request.id)}
                                                        className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                                    >
                                                        Preia
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

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <QuickAction
                        title="Coada Cereri"
                        description="Vezi toate cererile de procesat"
                        icon="📋"
                        href="/clerk/queue"
                    />
                    <QuickAction
                        title="Cererile Mele"
                        description="Cererile asignate mie"
                        icon="👤"
                        href="/clerk/my-requests"
                    />
                    <QuickAction
                        title="Rapoarte"
                        description="Generează rapoarte statistice"
                        icon="📊"
                        href="/clerk/reports"
                    />
                </div>
            </div>
        </DashboardLayout>
    )
}

function StatCard({ title, value, color, icon }: {
    title: string
    value: string
    color: 'purple' | 'blue' | 'orange' | 'green' | 'indigo'
    icon: React.ReactNode
}) {
    const colors = {
        purple: 'bg-purple-50 text-purple-600 border-purple-200',
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        orange: 'bg-orange-50 text-orange-600 border-orange-200',
        green: 'bg-green-50 text-green-600 border-green-200',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className={`w-12 h-12 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
                {icon}
            </div>
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
    )
}

function QuickAction({ title, description, icon, href }: {
    title: string
    description: string
    icon: string
    href: string
}) {
    return (
        <a 
            href={href}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left block"
        >
            <div className="text-4xl mb-3">{icon}</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
        </a>
    )
}