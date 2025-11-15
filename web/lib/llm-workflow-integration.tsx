/**
 * LLM Workflow Integration Example for Frontend
 * ==============================================
 * 
 * This file demonstrates how to integrate the LLM workflow
 * into a React/Next.js frontend application.
 */

// ============================================
// Type Definitions
// ============================================

interface TextChunk {
    page_url: string;
    text: string;
}

interface LLM1Requirements {
    procedure_name: string;
    sources: Array<{
        page_url: string;
        relevance: 'high' | 'medium' | 'low';
    }>;
    required_documents: Array<{
        id: string;
        name: string;
        mandatory: boolean;
        min_count: number;
        max_count: number;
        details: string;
        conditions: string[];
        source_page_url: string;
    }>;
    other_rules: Array<{
        type: 'deadline' | 'fee' | 'special_condition';
        description: string;
        source_page_url: string;
    }>;
    uncertainties: string[];
}

interface ExistingDocument {
    doc_id: string;
    file_id: string;
    file_name: string;
}

interface LLM2Response {
    assistant_reply: string;
    action: {
        type: 'ask_user_for_more_info' | 'validate_documents' | 'save_dossier';
        missing_documents: Array<{
            doc_id: string;
            name: string;
            explanation: string;
        }>;
        extra_documents: Array<{
            doc_id: string;
            explanation: string;
        }>;
        dossier: {
            procedure_name: string;
            status: string;
            submitted_at: string;
            documents: Array<{
                doc_id: string;
                file_id: string;
            }>;
            notes: string;
        } | null;
    };
}

interface CompleteWorkflowResponse {
    llm1_requirements: LLM1Requirements;
    llm2_guidance: LLM2Response;
}

// ============================================
// API Service Class
// ============================================

class LLMWorkflowService {
    private baseUrl: string;
    private requirementsCache: Map<string, LLM1Requirements>;

    constructor(baseUrl: string = 'http://localhost:8000') {
        this.baseUrl = baseUrl;
        this.requirementsCache = new Map();
    }

    /**
     * LLM1: Extract requirements from official text
     */
    async extractRequirements(
        procedureDescription: string,
        textChunks: TextChunk[]
    ): Promise<LLM1Requirements> {
        // Check cache first
        const cacheKey = procedureDescription.toLowerCase();
        if (this.requirementsCache.has(cacheKey)) {
            console.log('✅ Using cached requirements');
            return this.requirementsCache.get(cacheKey)!;
        }

        console.log('🔄 Calling LLM1...');
        const response = await fetch(`${this.baseUrl}/llm1/extract-requirements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                procedure_description: procedureDescription,
                text_chunks: textChunks,
            }),
        });

        if (!response.ok) {
            throw new Error(`LLM1 API error: ${response.statusText}`);
        }

        const requirements = await response.json();

        // Cache the result
        this.requirementsCache.set(cacheKey, requirements);

        return requirements;
    }

    /**
     * LLM2: Validate dossier and provide guidance
     */
    async validateDossier(
        userMessage: string,
        requirements: LLM1Requirements,
        existingDocuments: ExistingDocument[]
    ): Promise<LLM2Response> {
        console.log('🔄 Calling LLM2...');
        const response = await fetch(`${this.baseUrl}/llm2/validate-dossier`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_message: userMessage,
                llm1_requirements: requirements,
                existing_documents: existingDocuments,
            }),
        });

        if (!response.ok) {
            throw new Error(`LLM2 API error: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Complete workflow: LLM1 → LLM2 in one call
     */
    async completeWorkflow(
        procedureDescription: string,
        textChunks: TextChunk[],
        userMessage: string,
        existingDocuments: ExistingDocument[]
    ): Promise<CompleteWorkflowResponse> {
        console.log('🔄 Calling complete workflow...');
        const response = await fetch(`${this.baseUrl}/llm-workflow/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                procedure_description: procedureDescription,
                text_chunks: textChunks,
                user_message: userMessage,
                existing_documents: existingDocuments,
            }),
        });

        if (!response.ok) {
            throw new Error(`Workflow API error: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Clear requirements cache
     */
    clearCache() {
        this.requirementsCache.clear();
    }
}

// ============================================
// React Hook for LLM Workflow
// ============================================

import { useState, useCallback } from 'react';

interface UseLLMWorkflowReturn {
    requirements: LLM1Requirements | null;
    guidance: LLM2Response | null;
    loading: boolean;
    error: string | null;
    initializeProcedure: (procedure: string, chunks: TextChunk[]) => Promise<void>;
    validateDocuments: (message: string, docs: ExistingDocument[]) => Promise<void>;
    reset: () => void;
}

export function useLLMWorkflow(
    service: LLMWorkflowService
): UseLLMWorkflowReturn {
    const [requirements, setRequirements] = useState<LLM1Requirements | null>(null);
    const [guidance, setGuidance] = useState<LLM2Response | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initializeProcedure = useCallback(
        async (procedure: string, chunks: TextChunk[]) => {
            setLoading(true);
            setError(null);

            try {
                const reqs = await service.extractRequirements(procedure, chunks);
                setRequirements(reqs);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        },
        [service]
    );

    const validateDocuments = useCallback(
        async (message: string, docs: ExistingDocument[]) => {
            if (!requirements) {
                setError('Requirements not loaded. Call initializeProcedure first.');
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const guide = await service.validateDossier(message, requirements, docs);
                setGuidance(guide);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        },
        [service, requirements]
    );

    const reset = useCallback(() => {
        setRequirements(null);
        setGuidance(null);
        setError(null);
    }, []);

    return {
        requirements,
        guidance,
        loading,
        error,
        initializeProcedure,
        validateDocuments,
        reset,
    };
}

// ============================================
// Example React Component
// ============================================

import React, { useEffect } from 'react';

const llmService = new LLMWorkflowService('http://localhost:8000');

export default function DossierChatbot() {
    const {
        requirements,
        guidance,
        loading,
        error,
        initializeProcedure,
        validateDocuments,
    } = useLLMWorkflow(llmService);

    const [userInput, setUserInput] = useState('');
    const [uploadedDocs, setUploadedDocs] = useState<ExistingDocument[]>([]);
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'bot'; text: string }>>([]);

    // Initialize with sample text chunks (in reality, fetch from web scraping)
    useEffect(() => {
        const sampleChunks: TextChunk[] = [
            {
                page_url: 'https://www.primarie.ro/urbanism',
                text: 'Pentru certificatul de urbanism sunt necesare...',
            },
        ];

        initializeProcedure('certificat de urbanism', sampleChunks);
    }, []);

    // Update messages when guidance changes
    useEffect(() => {
        if (guidance) {
            setMessages((prev) => [
                ...prev,
                { role: 'bot', text: guidance.assistant_reply },
            ]);

            // Handle action
            if (guidance.action.type === 'save_dossier' && guidance.action.dossier) {
                handleSaveDossier(guidance.action.dossier);
            }
        }
    }, [guidance]);

    const handleSendMessage = async () => {
        if (!userInput.trim()) return;

        // Add user message to chat
        setMessages((prev) => [...prev, { role: 'user', text: userInput }]);

        // Validate with LLM2
        await validateDocuments(userInput, uploadedDocs);

        setUserInput('');
    };

    const handleFileUpload = (file: File) => {
        // In reality, upload to Supabase first, then add to list
        const newDoc: ExistingDocument = {
            doc_id: 'carte_identitate', // Detect with AI
            file_id: `file_${Date.now()}`,
            file_name: file.name,
        };

        setUploadedDocs((prev) => [...prev, newDoc]);
    };

    const handleSaveDossier = async (dossier: any) => {
        try {
            // Save to Supabase
            const response = await fetch('/api/dossiers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dossier),
            });

            if (response.ok) {
                alert('✅ Dosar trimis cu succes!');
            }
        } catch (err) {
            console.error('Error saving dossier:', err);
            alert('❌ Eroare la salvarea dosarului');
        }
    };

    if (loading && !requirements) {
        return <div>⏳ Se încarcă cerințele...</div>;
    }

    if (error) {
        return <div>❌ Eroare: {error}</div>;
    }

    return (
        <div className="dossier-chatbot">
            <div className="sidebar">
                <h3>Procedură Selectată</h3>
                <p>{requirements?.procedure_name || 'Niciuna'}</p>

                <h3>Documente Necesare</h3>
                {requirements?.required_documents.map((doc) => (
                    <div key={doc.id} className="doc-item">
                        <strong>{doc.name}</strong>
                        {doc.mandatory && <span className="badge">Obligatoriu</span>}
                        <p>{doc.details}</p>
                    </div>
                ))}

                <h3>Documente Încărcate</h3>
                {uploadedDocs.map((doc) => (
                    <div key={doc.file_id} className="uploaded-doc">
                        ✅ {doc.file_name}
                    </div>
                ))}

                <button onClick={() => document.getElementById('file-input')?.click()}>
                    📎 Încarcă Document
                </button>
                <input
                    id="file-input"
                    type="file"
                    hidden
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                />
            </div>

            <div className="chat-window">
                <div className="messages">
                    {messages.map((msg, i) => (
                        <div key={i} className={`message ${msg.role}`}>
                            <strong>{msg.role === 'user' ? 'Tu' : 'ADU'}:</strong>
                            <p>{msg.text}</p>
                        </div>
                    ))}

                    {guidance?.action.missing_documents &&
                        guidance.action.missing_documents.length > 0 && (
                            <div className="missing-docs-alert">
                                <h4>❌ Documente lipsă:</h4>
                                <ul>
                                    {guidance.action.missing_documents.map((doc) => (
                                        <li key={doc.doc_id}>
                                            <strong>{doc.name}</strong>: {doc.explanation}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                </div>

                <div className="input-area">
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Scrie un mesaj..."
                        disabled={loading}
                    />
                    <button onClick={handleSendMessage} disabled={loading}>
                        {loading ? '⏳' : '📤'} Trimite
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// Alternative: Simplified API Calls
// ============================================

/**
 * Use this if you don't need the full hook/service setup
 */
export const simpleLLMAPI = {
    async chat(
        procedureDescription: string,
        userMessage: string,
        uploadedDocs: ExistingDocument[]
    ) {
        // For simplicity, use mock text chunks
        // In production, fetch from actual web scraping
        const mockChunks: TextChunk[] = [
            {
                page_url: 'https://example.com',
                text: 'Documente necesare: carte identitate, act proprietate...',
            },
        ];

        const response = await fetch('http://localhost:8000/llm-workflow/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                procedure_description: procedureDescription,
                text_chunks: mockChunks,
                user_message: userMessage,
                existing_documents: uploadedDocs,
            }),
        });

        if (!response.ok) {
            throw new Error('API error');
        }

        return await response.json();
    },
};

// ============================================
// Usage Example in a Page Component
// ============================================

/*
import { simpleLLMAPI } from '@/lib/llm-workflow-integration';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [uploadedDocs, setUploadedDocs] = useState([]);

  const handleSend = async (userMessage) => {
    const result = await simpleLLMAPI.chat(
      'certificat de urbanism',
      userMessage,
      uploadedDocs
    );

    setMessages((prev) => [
      ...prev,
      { role: 'user', text: userMessage },
      { role: 'bot', text: result.llm2_guidance.assistant_reply },
    ]);

    // Handle action
    if (result.llm2_guidance.action.type === 'save_dossier') {
      await saveDossierToSupabase(result.llm2_guidance.action.dossier);
    }
  };

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>{msg.text}</div>
      ))}
      <input onSubmit={handleSend} />
    </div>
  );
}
*/

// ============================================
// CSS Styles (Tailwind-compatible)
// ============================================

/*
.dossier-chatbot {
  @apply flex h-screen;
}

.sidebar {
  @apply w-80 bg-gray-100 p-4 overflow-y-auto;
}

.chat-window {
  @apply flex-1 flex flex-col;
}

.messages {
  @apply flex-1 overflow-y-auto p-4 space-y-4;
}

.message {
  @apply p-3 rounded-lg;
}

.message.user {
  @apply bg-blue-100 ml-auto max-w-md;
}

.message.bot {
  @apply bg-gray-100 mr-auto max-w-md;
}

.input-area {
  @apply flex gap-2 p-4 border-t;
}

.missing-docs-alert {
  @apply bg-red-50 border border-red-200 p-4 rounded-lg;
}

.doc-item {
  @apply mb-4 pb-4 border-b;
}

.badge {
  @apply inline-block bg-red-500 text-white text-xs px-2 py-1 rounded ml-2;
}

.uploaded-doc {
  @apply bg-green-50 p-2 rounded mb-2;
}
*/

export { };
