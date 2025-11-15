'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import FloatingChatButton from '../../components/FloatingChatButton'
import { supabase } from '../../lib/supabaseClient'

type Request = {
    id: string
    request_type: string
    status: string
    extracted_metadata?: {
        address?: string
    }
    created_at: string
}

type Document = {
    id: string
    request_id: string
    document_type: string
    document_type_ai?: string | null // Detectat de AI
    file_name: string
    validation_status: string
    validation_message?: string | null
    uploaded_at: string
}

const REQUEST_TYPES: Record<string, string> = {
    'building_permit': 'Autorizație de Construire',
    'urbanism_certificate': 'Certificat de Urbanism',
    'demolition_permit': 'Autorizație de Demolare',
    'other': 'Altă cerere'
}

// Mapping pentru request types (folosit în backend)
const REQUEST_TYPE_MAPPING: Record<string, string> = {
    'building_permit': 'autorizatie_construire',
    'urbanism_certificate': 'certificat_urbanism',
    'demolition_permit': 'autorizatie_desfiintare',
    'certificat_urbanism': 'certificat_urbanism',
    'autorizatie_construire': 'autorizatie_construire',
    'autorizatie_desfiintare': 'autorizatie_desfiintare',
    'informare_urbanism': 'informare_urbanism',
    'racord_utilitati': 'racord_utilitati'
}

// Traduceri pentru tipurile de documente (detectate de AI)
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
    'carte_identitate': 'Carte de identitate',
    'act_proprietate': 'Act de proprietate',
    'plan_cadastral': 'Plan cadastral',
    'certificat_urbanism': 'Certificat de urbanism',
    'proiect_tehnic': 'Proiect tehnic',
    'raport_tehnic': 'Raport tehnic',
    'unknown': 'Document necunoscut'
}

// Documente necesare per procedură (conform document_requirements.py)
const REQUIRED_DOCUMENTS: Record<string, string[]> = {
    'certificat_urbanism': [
        'carte_identitate',
        'act_proprietate',
        'plan_cadastral'
    ],
    'autorizatie_construire': [
        'carte_identitate',
        'certificat_urbanism',
        'act_proprietate',
        'plan_cadastral',
        'proiect_tehnic'
    ],
    'autorizatie_desfiintare': [
        'carte_identitate',
        'act_proprietate',
        'plan_cadastral',
        'raport_tehnic'
    ],
    'informare_urbanism': [
        'carte_identitate',
        'plan_cadastral'
    ],
    'racord_utilitati': [
        'carte_identitate',
        'act_proprietate',
        'certificat_urbanism',
        'plan_cadastral'
    ]
}

export default function CitizenDashboard() {
    const router = useRouter()
    const [requests, setRequests] = useState<Request[]>([])
    const [documents, setDocuments] = useState<Record<string, Document[]>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Încarcă cererile
            const { data: requestsData, error: reqError } = await supabase
                .from('requests')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5)

            if (reqError) throw reqError

            setRequests(requestsData || [])

            // Încarcă documentele pentru fiecare cerere
            if (requestsData && requestsData.length > 0) {
                const requestIds = requestsData.map(r => r.id)
                const { data: docsData, error: docsError } = await supabase
                    .from('documents')
                    .select('*')
                    .in('request_id', requestIds)

                if (!docsError && docsData) {
                    const docsByRequest: Record<string, Document[]> = {}
                    docsData.forEach(doc => {
                        if (!docsByRequest[doc.request_id]) {
                            docsByRequest[doc.request_id] = []
                        }
                        docsByRequest[doc.request_id].push(doc)
                    })
                    setDocuments(docsByRequest)
                }
            }
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'draft': 'bg-gray-100 text-gray-800',
            'pending_validation': 'bg-yellow-100 text-yellow-800',
            'in_review': 'bg-blue-100 text-blue-800',
            'approved': 'bg-green-100 text-green-800',
            'rejected': 'bg-red-100 text-red-800'
        }
        return colors[status] || 'bg-gray-100 text-gray-800'
    }

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'draft': 'Ciornă',
            'pending_validation': 'În validare',
            'in_review': 'În evaluare',
            'approved': 'Aprobat',
            'rejected': 'Respins'
        }
        return labels[status] || status
    }

    const getMissingDocuments = (request: Request) => {
        // Mapează request_type la procedură standard
        const procedureKey = REQUEST_TYPE_MAPPING[request.request_type] || request.request_type
        const required = REQUIRED_DOCUMENTS[procedureKey] || []
        const uploaded = documents[request.id] || []

        // Folosim document_type_ai din baza de date (detectat de AI)
        const uploadedTypes = uploaded
            .filter(d => d.validation_status === 'approved') // Doar documente aprobate
            .map(d => d.document_type_ai || d.document_type)
            .filter(Boolean) // Elimină null/undefined

        console.log('📊 Missing documents check:', {
            request_type: request.request_type,
            procedureKey,
            required,
            uploadedTypes,
            uploaded: uploaded.map(d => ({
                type: d.document_type_ai,
                status: d.validation_status,
                message: d.validation_message
            }))
        })

        return required
            .filter(doc => !uploadedTypes.includes(doc))
            .map(doc => DOCUMENT_TYPE_LABELS[doc] || doc)
    }

    const getDocumentLabel = (docType: string | null | undefined): string => {
        if (!docType) return 'Document necunoscut'
        return DOCUMENT_TYPE_LABELS[docType] || docType
    }

    const getValidationStats = (requestId: string) => {
        const docs = documents[requestId] || []
        const validated = docs.filter(d => d.validation_status === 'approved').length
        const invalid = docs.filter(d => d.validation_status === 'rejected').length
        const pending = docs.filter(d => d.validation_status === 'pending').length
        return { validated, invalid, pending, total: docs.length }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="p-8">
            <FloatingChatButton />

            {/* Logout Button */}
            <div className="flex justify-end mb-4">
                <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Deconectare
                </button>
            </div>

            <div className="space-y-6">
                {/* Welcome Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-2xl font-semibold text-purple-700 mb-2">
                        Bun venit în ADU!
                    </h2>
                    <p className="text-gray-600">
                        Portalul tău digital pentru solicitări de urbanism și autorizații.
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ActionCard
                        title="Cerere Nouă"
                        description="Discută cu asistentul AI despre cererea ta"
                        icon={
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        }
                        color="purple"
                        href="/chat"
                    />
                    <ActionCard
                        title="Încarcă Documente"
                        description="Adaugă documente pentru dosarul tău"
                        icon={
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        }
                        color="purple"
                        href="/upload"
                    />
                    <ActionCard
                        title="Cererile Mele"
                        description="Vizualizează și gestionează cererile tale"
                        icon={
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        }
                        color="purple"
                        href="/citizen/requests"
                    />
                </div>

                {/* Status Overview */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Cererile Mele Recente</h3>
                        <Link href="/citizen/requests" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                            Vezi toate →
                        </Link>
                    </div>

                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                            <p className="text-gray-600 mt-4">Se încarcă...</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-lg font-medium">Nu ai cereri active</p>
                            <p className="text-sm mt-1">Creează prima ta cerere pentru a începe</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {requests.map((request) => {
                                const stats = getValidationStats(request.id)
                                const missing = getMissingDocuments(request)

                                return (
                                    <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="font-semibold text-gray-800">
                                                        {REQUEST_TYPES[request.request_type] || request.request_type}
                                                    </h4>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                                        {getStatusLabel(request.status)}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    <p className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        {request.extracted_metadata?.address || 'Adresă nedefinită'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Creat: {new Date(request.created_at).toLocaleDateString('ro-RO')}
                                                    </p>
                                                </div>
                                            </div>
                                            <Link
                                                href={`/status/${request.id}`}
                                                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                                            >
                                                Vezi status
                                            </Link>
                                        </div>

                                        {/* Documente */}
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <h5 className="text-sm font-semibold text-gray-700">Documente</h5>
                                                <div className="flex gap-3 text-xs">
                                                    {stats.validated > 0 && (
                                                        <span className="flex items-center gap-1 text-green-600">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                            {stats.validated} valide
                                                        </span>
                                                    )}
                                                    {stats.invalid > 0 && (
                                                        <span className="flex items-center gap-1 text-red-600">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                            </svg>
                                                            {stats.invalid} invalide
                                                        </span>
                                                    )}
                                                    {stats.pending > 0 && (
                                                        <span className="flex items-center gap-1 text-yellow-600">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                            </svg>
                                                            {stats.pending} în așteptare
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Documente lipsă */}
                                            {missing.length > 0 && (
                                                <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                    <p className="text-sm font-medium text-yellow-800 mb-2">
                                                        ⚠️ {missing.length} documente lipsă
                                                    </p>
                                                    <ul className="text-xs text-yellow-700 space-y-1">
                                                        {missing.slice(0, 3).map((doc, idx) => (
                                                            <li key={idx} className="flex items-center gap-2">
                                                                <span>•</span>
                                                                <span>{doc}</span>
                                                            </li>
                                                        ))}
                                                        {missing.length > 3 && (
                                                            <li className="text-yellow-600 font-medium">
                                                                +{missing.length - 3} altele
                                                            </li>
                                                        )}
                                                    </ul>
                                                    <Link
                                                        href="/upload"
                                                        className="mt-2 inline-block text-xs text-yellow-800 font-semibold hover:text-yellow-900"
                                                    >
                                                        Încarcă documente →
                                                    </Link>
                                                </div>
                                            )}

                                            {/* Lista documentelor încărcate */}
                                            {documents[request.id] && documents[request.id].length > 0 && (
                                                <div className="mt-2 space-y-2">
                                                    {documents[request.id].map((doc) => (
                                                        <div key={doc.id} className="flex items-start justify-between p-2 bg-gray-50 rounded text-xs">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    {doc.validation_status === 'approved' && (
                                                                        <span className="text-green-600">✅</span>
                                                                    )}
                                                                    {doc.validation_status === 'rejected' && (
                                                                        <span className="text-red-600">❌</span>
                                                                    )}
                                                                    {doc.validation_status === 'pending' && (
                                                                        <span className="text-yellow-600">⏳</span>
                                                                    )}
                                                                    <span className="font-medium">
                                                                        {getDocumentLabel(doc.document_type_ai)}
                                                                    </span>
                                                                </div>
                                                                {doc.validation_message && (
                                                                    <p className="mt-1 text-gray-600 ml-6">
                                                                        {doc.validation_message}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Dosar complet */}
                                            {missing.length === 0 && stats.total > 0 && stats.invalid === 0 && (
                                                <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3">
                                                    <p className="text-sm font-medium text-green-800 flex items-center gap-2">
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                        Dosar complet - toate documentele încărcate și validate
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function ActionCard({ title, description, icon, color, href }: {
    title: string
    description: string
    icon: React.ReactNode
    color: 'purple' | 'blue' | 'green'
    href?: string
}) {
    const colors = {
        purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
        blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
        green: 'bg-green-50 text-green-600 hover:bg-green-100',
    }

    const content = (
        <>
            <div className={`w-16 h-16 rounded-lg ${colors[color]} flex items-center justify-center mb-4`}>
                {icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
        </>
    )

    if (href) {
        return (
            <a
                href={href}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left block"
            >
                {content}
            </a>
        )
    }

    return (
        <button className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left block w-full">
            {content}
        </button>
    )
}
