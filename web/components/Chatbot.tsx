'use client'
import React, { useState, useRef, useEffect } from 'react'
import { sendChatMessage, ChatRequest, ChatResponse, uploadDocuments, DocumentResult } from '../lib/aduApi'

interface Message {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    detected_procedure?: string
    needs_documents?: boolean
    suggested_action?: string
    documents?: DocumentResult[]
    timestamp: Date
}

interface ChatbotProps {
    procedure?: string
    uploadedDocuments?: string[]
    onProcedureDetected?: (procedure: string) => void
    onDocumentsNeeded?: () => void
    onDocumentsUploaded?: (documentTypes: string[]) => void
}

export default function Chatbot({
    procedure,
    uploadedDocuments,
    onProcedureDetected,
    onDocumentsNeeded,
    onDocumentsUploaded
}: ChatbotProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Bună! Sunt ADU, Asistentul tău Digital de Urbanism. Cum te pot ajuta astăzi?',
            timestamp: new Date(),
        },
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [detectedProcedure, setDetectedProcedure] = useState<string | null>(null)
    const [availableProcedures, setAvailableProcedures] = useState<Array<{ key: string, name: string, description: string }>>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            const request: ChatRequest = {
                question: input,
                procedure,
                uploaded_documents: uploadedDocuments,
            }

            const response: ChatResponse = await sendChatMessage(request)

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.answer,
                detected_procedure: response.detected_procedure,
                needs_documents: response.needs_documents,
                suggested_action: response.suggested_action,
                timestamp: new Date(),
            }

            setMessages((prev) => [...prev, assistantMessage])

            if (response.available_procedures && response.available_procedures.length > 0) {
                setAvailableProcedures(response.available_procedures)
            }

            // Trigger callbacks
            if (response.detected_procedure) {
                setDetectedProcedure(response.detected_procedure)
                if (onProcedureDetected) {
                    onProcedureDetected(response.detected_procedure)
                }
            }

            if (response.needs_documents && onDocumentsNeeded) {
                onDocumentsNeeded()
            }
        } catch (error) {
            console.error('Error sending message:', error)
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Ne cerem scuze, dar a apărut o eroare. Te rugăm să încerci din nou.',
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setIsUploading(true)

        // Add a system message showing upload started
        const uploadStartMessage: Message = {
            id: Date.now().toString(),
            role: 'system',
            content: `Se încarcă ${files.length} document${files.length > 1 ? 'e' : ''}...`,
            timestamp: new Date(),
        }
        setMessages((prev) => [...prev, uploadStartMessage])

        try {
            const result = await uploadDocuments(Array.from(files), detectedProcedure || undefined)

            if (!result.success) {
                throw new Error(result.error || 'Upload failed')
            }

            const docs = result.documents_processed || []

            // Add system message with results
            const resultMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'system',
                content: `✅ Verificare completă!\n\n${docs.map((doc: DocumentResult) =>
                    `• ${doc.filename}: ${doc.document_type}\n  ${doc.is_valid ? '✓ Valid' : '✗ Invalid'}\n  ${doc.validation_message}`
                ).join('\n\n')}${result.missing_documents && result.missing_documents.length > 0 ? '\n\n⚠️ Documente lipsă:\n' + result.missing_documents.map((d: string) => `• ${d}`).join('\n') : ''}`,
                timestamp: new Date(),
                documents: docs,
            }
            setMessages((prev) => [...prev, resultMessage])

            // Notify parent component
            if (onDocumentsUploaded) {
                onDocumentsUploaded(docs.map((d) => d.document_type))
            }
        } catch (error) {
            console.error('Error uploading documents:', error)
            const errorMessage: Message = {
                id: (Date.now() + 2).toString(),
                role: 'system',
                content: '❌ Eroare la încărcarea documentelor. Te rugăm să încerci din nou.',
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, errorMessage])
        } finally {
            setIsUploading(false)
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-200">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-semibold text-gray-800">ADU - Asistent Digital</h3>
                    <p className="text-sm text-gray-500">Ghidul tău pentru urbanism</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-800'
                                }`}
                        >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            {message.detected_procedure && (
                                <div className="mt-2 pt-2 border-t border-purple-500">
                                    <p className="text-xs opacity-75">
                                        📋 Procedură detectată: {message.detected_procedure}
                                    </p>
                                </div>
                            )}
                            {message.needs_documents && (
                                <div className="mt-2 pt-2 border-t border-gray-300">
                                    <p className="text-xs text-purple-600 font-medium">
                                        📎 Este nevoie să încarci documente
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Available Procedures (if shown) */}
            {availableProcedures.length > 0 && !procedure && (
                <div className="p-4 border-t border-gray-200 bg-purple-50">
                    <p className="text-sm font-medium text-purple-800 mb-2">Proceduri disponibile:</p>
                    <div className="space-y-2">
                        {availableProcedures.map((proc) => (
                            <button
                                key={proc.key}
                                onClick={() => {
                                    if (onProcedureDetected) {
                                        onProcedureDetected(proc.key)
                                    }
                                }}
                                className="w-full text-left p-2 bg-white rounded-lg hover:bg-purple-100 transition-colors text-sm"
                            >
                                <p className="font-medium text-purple-900">{proc.name}</p>
                                <p className="text-xs text-gray-600">{proc.description}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                />

                <div className="flex gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || isLoading}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
                        title="Încarcă documente"
                    >
                        {isUploading ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                        )}
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Scrie mesajul tău aici..."
                        disabled={isLoading || isUploading}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading || isUploading}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
                {procedure && (
                    <p className="text-xs text-gray-500 mt-2">
                        📋 Procedură activă: <span className="font-medium">{procedure}</span>
                    </p>
                )}
                {uploadedDocuments && uploadedDocuments.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                        📎 Documente încărcate: {uploadedDocuments.length}
                    </p>
                )}
            </div>
        </div>
    )
}
