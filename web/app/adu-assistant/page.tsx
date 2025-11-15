'use client'
import React, { useState } from 'react'
import Chatbot from '../../components/Chatbot'
import DocumentUpload from '../../components/DocumentUpload'
import { getProcedureLabel } from '../../lib/aduApi'

export default function ADUAssistantPage() {
    const [selectedProcedure, setSelectedProcedure] = useState<string | undefined>()
    const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([])
    const [showUpload, setShowUpload] = useState(false)

    const handleProcedureDetected = (procedure: string) => {
        setSelectedProcedure(procedure)
        setShowUpload(true)
    }

    const handleDocumentsNeeded = () => {
        setShowUpload(true)
    }

    const handleDocumentsChange = (documentTypes: string[]) => {
        setUploadedDocuments(documentTypes)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">
                        ADU - Asistent Digital de Urbanism
                    </h1>
                    <p className="text-lg text-gray-600">
                        Ghidul tău inteligent pentru cereri de urbanism
                    </p>
                </div>

                {/* Procedure Status */}
                {selectedProcedure && (
                    <div className="max-w-4xl mx-auto mb-6">
                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm text-purple-600 font-medium">Procedură detectată</p>
                                        <p className="text-lg font-bold text-purple-900">
                                            {getProcedureLabel(selectedProcedure)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedProcedure(undefined)
                                        setShowUpload(false)
                                    }}
                                    className="text-sm text-purple-600 hover:text-purple-700 underline"
                                >
                                    Schimbă
                                </button>
                            </div>
                            {uploadedDocuments.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-purple-200">
                                    <p className="text-sm text-purple-800">
                                        📎 Documente încărcate: <span className="font-medium">{uploadedDocuments.length}</span>
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {uploadedDocuments.map((doc, index) => (
                                            <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                                {doc}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Main Content - Two Columns */}
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chatbot Column */}
                    <div className="lg:col-span-1">
                        <div className="h-[700px]">
                            <Chatbot
                                procedure={selectedProcedure}
                                uploadedDocuments={uploadedDocuments}
                                onProcedureDetected={handleProcedureDetected}
                                onDocumentsNeeded={handleDocumentsNeeded}
                                onDocumentsUploaded={handleDocumentsChange}
                            />
                        </div>
                    </div>

                    {/* Document Upload Column */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold text-gray-800">
                                    Încarcă Documente
                                </h2>
                            </div>

                            {!showUpload && !selectedProcedure ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-600 font-medium">
                                        Întreabă ADU ce tip de cerere vrei să faci
                                    </p>
                                    <p className="text-sm text-gray-500 mt-2">
                                        De exemplu: "Vreau să construiesc o casă" sau "Am nevoie de certificat de urbanism"
                                    </p>
                                </div>
                            ) : (
                                <DocumentUpload
                                    procedure={selectedProcedure}
                                    onDocumentsChange={handleDocumentsChange}
                                />
                            )}
                        </div>

                        {/* Help Section */}
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
                            <div className="flex items-start gap-3">
                                <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <p className="font-bold text-blue-900 mb-3">Cum funcționează ADU?</p>
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-2">
                                            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                                            <p className="text-sm text-blue-800">Spune-i lui ADU ce vrei să faci</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                                            <p className="text-sm text-blue-800">ADU detectează procedura și îți listează documentele necesare</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                                            <p className="text-sm text-blue-800">Încarcă documentele (imagini sau PDF-uri)</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                                            <p className="text-sm text-blue-800">ADU verifică automat validitatea documentelor</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
                                            <p className="text-sm text-blue-800">Primești feedback instant despre ce mai lipsește</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Feature Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-sm font-medium text-gray-800">Validare automată</p>
                                <p className="text-xs text-gray-600 mt-1">AI verifică documentele în timp real</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                                    <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <p className="text-sm font-medium text-gray-800">Bază de cunoștințe</p>
                                <p className="text-xs text-gray-600 mt-1">Răspunsuri bazate pe legislația în vigoare</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
