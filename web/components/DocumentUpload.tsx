'use client'
import React, { useState, useRef } from 'react'
import { uploadDocuments, UploadResponse, DocumentResult, getDocumentTypeLabel } from '../lib/aduApi'

interface DocumentUploadProps {
    procedure?: string
    onUploadComplete?: (response: UploadResponse) => void
    onDocumentsChange?: (documentTypes: string[]) => void
}

export default function DocumentUpload({ procedure, onUploadComplete, onDocumentsChange }: DocumentUploadProps) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files)
            setSelectedFiles(files)
            setUploadResult(null)
            setError(null)
        }
    }

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return

        setIsUploading(true)
        setError(null)

        try {
            const response = await uploadDocuments(selectedFiles, procedure)
            setUploadResult(response)

            if (response.success && response.documents_processed) {
                const docTypes = response.documents_processed
                    .map(doc => doc.document_type)
                    .filter(type => type !== 'unknown')

                if (onDocumentsChange) {
                    onDocumentsChange(docTypes)
                }
            }

            if (onUploadComplete) {
                onUploadComplete(response)
            }
        } catch (err) {
            console.error('Upload error:', err)
            setError('Eroare la încărcarea documentelor. Vă rugăm să încercați din nou.')
        } finally {
            setIsUploading(false)
        }
    }

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    }

    const clearAll = () => {
        setSelectedFiles([])
        setUploadResult(null)
        setError(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const getStatusIcon = (isValid: boolean) => {
        return isValid ? (
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ) : (
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )
    }

    return (
        <div className="space-y-4">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                />
                <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-3"
                >
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-lg font-medium text-gray-800">
                            Încarcă documente
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                            Imagini (JPG, PNG) sau PDF
                        </p>
                    </div>
                    <span className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                        Selectează fișiere
                    </span>
                </label>
            </div>

            {procedure && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-sm text-purple-800">
                        <span className="font-medium">📋 Procedură: </span>
                        {procedure}
                    </p>
                </div>
            )}

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-800">
                            Fișiere selectate ({selectedFiles.length})
                        </h4>
                        <button
                            onClick={clearAll}
                            className="text-sm text-red-600 hover:text-red-700"
                        >
                            Șterge tot
                        </button>
                    </div>
                    <div className="space-y-2">
                        {selectedFiles.map((file, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-sm text-gray-700 truncate">
                                        {file.name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        ({(file.size / 1024).toFixed(1)} KB)
                                    </span>
                                </div>
                                <button
                                    onClick={() => removeFile(index)}
                                    className="ml-2 text-red-600 hover:text-red-700"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="mt-4 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {isUploading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Se procesează...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                Încarcă documentele
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {/* Upload Result */}
            {uploadResult && (
                <div className={`border rounded-lg p-4 ${uploadResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                    <div className="flex items-start gap-3">
                        {uploadResult.success ? (
                            <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        <div className="flex-1">
                            <p className={`font-medium ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                {uploadResult.summary || (uploadResult.success ? 'Documente încărcate cu succes!' : 'Eroare la încărcare')}
                            </p>

                            {/* Processed Documents */}
                            {uploadResult.documents_processed && uploadResult.documents_processed.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {uploadResult.documents_processed.map((doc, index) => (
                                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                                            <div className="flex items-start gap-2">
                                                {getStatusIcon(doc.is_valid)}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-gray-800 text-sm">
                                                            {doc.filename}
                                                        </p>
                                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
                                                            {getDocumentTypeLabel(doc.document_type)}
                                                        </span>
                                                    </div>
                                                    <p className={`text-sm mt-1 ${doc.is_valid ? 'text-green-700' : 'text-red-700'}`}>
                                                        {doc.validation_message}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Missing Documents */}
                            {uploadResult.missing_documents && uploadResult.missing_documents.length > 0 && (
                                <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <p className="font-medium text-yellow-800 text-sm mb-2">
                                        📋 Documente lipsă:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1">
                                        {uploadResult.missing_documents.map((doc, index) => (
                                            <li key={index} className="text-sm text-yellow-700">
                                                {doc}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
