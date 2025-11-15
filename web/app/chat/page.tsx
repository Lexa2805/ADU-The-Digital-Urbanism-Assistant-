"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Message, ChatbotResponse, API_BASE_URL } from "@/types";
import { ChatService } from "@/lib/chatService";
import ChatWindow from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import CitizenPageLayout from "@/components/CitizenPageLayout";
import Link from "next/link";

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [pendingValidation, setPendingValidation] = useState<any[]>([]);
  const [detectedProcedure, setDetectedProcedure] = useState<string | null>(null);
  const [missingDocuments, setMissingDocuments] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Allow access without authentication for demo purposes
      setIsCheckingAuth(false);

      // Try to load messages if authenticated
      if (session) {
        setUserId(session.user.id);
        try {
          const loadedMessages = await ChatService.loadMessages();
          setMessages(loadedMessages);
        } catch (error) {
          console.log('Could not load message history:', error);
          // Continue without history - not critical
        }

        // Load uploaded documents
        await loadUploadedDocuments(session.user.id);
      }
    };
    checkAuth();
  }, [router]);

  // Poll for new uploaded documents every 5 seconds
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(async () => {
      await loadUploadedDocuments(userId);
    }, 5000);

    return () => clearInterval(interval);
  }, [userId]);

  const loadUploadedDocuments = async (uid: string) => {
    try {
      // Get confirmed documents from database (already saved)
      const { data, error } = await supabase
        .from('documents')
        .select('*, requests!inner(user_id)')
        .eq('requests.user_id', uid)
        .gte('uploaded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('uploaded_at', { ascending: false });

      if (!error && data) {
        setUploadedDocs(data);
      }

      // Check for pending validation from sessionStorage
      const pendingStr = sessionStorage.getItem(`pending_docs_${uid}`);
      const procedureStr = sessionStorage.getItem(`procedure_${uid}`);
      const missingStr = sessionStorage.getItem(`missing_docs_${uid}`);

      if (pendingStr) {
        try {
          const pending = JSON.parse(pendingStr);
          const procedure = procedureStr ? JSON.parse(procedureStr) : null;
          const missing = missingStr ? JSON.parse(missingStr) : [];

          if (pending.length > 0 && pendingValidation.length === 0) {
            setPendingValidation(pending);
            setDetectedProcedure(procedure);
            setMissingDocuments(missing);
            // Show validation results in chat
            await showValidationResults(pending, missing, procedure);
            // Clear from storage after showing
            sessionStorage.removeItem(`pending_docs_${uid}`);
            sessionStorage.removeItem(`procedure_${uid}`);
            sessionStorage.removeItem(`missing_docs_${uid}`);
          }
        } catch (e) {
          console.error('Error parsing pending docs:', e);
        }
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  const handleConfirmDocuments = async () => {
    // Check if there are any invalid documents
    const invalid = pendingValidation.filter(d => !d.is_valid);
    if (invalid.length > 0) {
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Nu pot confirma dosarul! Mai există ${invalid.length} document(e) cu probleme.\n\nTe rog corectează-le și încarcă-le din nou.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
      return;
    }

    // Check if there are missing documents
    if (missingDocuments.length > 0) {
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Nu pot confirma dosarul! Lipsesc ${missingDocuments.length} document(e):\n\n${missingDocuments.map(d => `• ${d}`).join('\n')}\n\nTe rog încarcă toate documentele necesare.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
      return;
    }

    setIsLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

      const response = await fetch(`${API_URL}/confirm-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          documents: pendingValidation,
          procedure: detectedProcedure
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.detail || 'Failed to confirm documents');
      }

      const data = await response.json();      // Check if backend returned missing documents error
      if (!data.success && data.error === 'missing_documents') {
        setMissingDocuments(data.missing || []);
        const errorMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `❌ ${data.message}\n\nTe rog încarcă documentele lipsă și apoi scrie din nou "CONFIRM".`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMsg]);
        return;
      }

      // Clear pending validation
      setPendingValidation([]);
      setMissingDocuments([]);
      setDetectedProcedure(null);

      // Show success message
      const successMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ **Dosarul a fost trimis cu succes!**\n\n${data.message || 'Documentele au fost salvate și sunt în așteptarea verificării de către primărie.'}\n\nPoți verifica statusul cererii tale în secțiunea "Cererile Mele".`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, successMsg]);      // Reload documents to show the confirmed ones
      if (userId) {
        await loadUploadedDocuments(userId);
      }
    } catch (err) {
      console.error('Error confirming documents:', err);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ A apărut o eroare la confirmarea documentelor. Te rog încearcă din nou.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const showValidationResults = async (validatedDocs: any[], missing: string[] = [], procedure: string | null = null) => {
    // Separate valid and invalid documents
    const valid = validatedDocs.filter(d => d.is_valid);
    const invalid = validatedDocs.filter(d => !d.is_valid);

    let content = `📊 **Rezultatele validării documentelor:**\n\n`;

    if (procedure) {
      content += `📋 **Procedură detectată:** ${procedure}\n\n`;
    }

    if (valid.length > 0) {
      content += `✅ **Documente valide (${valid.length}):**\n`;
      valid.forEach(d => {
        content += `   • ${d.filename} - ${d.document_type}\n`;
        content += `     ${d.validation_message}\n\n`;
      });
    }

    if (invalid.length > 0) {
      content += `\n❌ **Documente cu probleme (${invalid.length}):**\n`;
      invalid.forEach(d => {
        content += `   • ${d.filename}\n`;
        content += `     ⚠️ ${d.validation_message}\n\n`;
      });
    }

    if (missing && missing.length > 0) {
      content += `\n📋 **Documente lipsă (${missing.length}):**\n`;
      missing.forEach(doc => {
        content += `   • ${doc}\n`;
      });
      content += `\n`;
    }

    if (invalid.length > 0 || (missing && missing.length > 0)) {
      content += `\n💬 **Ce trebuie să faci:**\n`;
      if (invalid.length > 0) {
        content += `1. Corectează documentele cu probleme\n`;
      }
      if (missing && missing.length > 0) {
        content += `${invalid.length > 0 ? '2' : '1'}. Încarcă documentele lipsă\n`;
      }
      content += `${invalid.length > 0 || missing.length > 0 ? (invalid.length > 0 && missing.length > 0 ? '3' : '2') : '1'}. După ce toate sunt complete, confirmă trimiterea\n`;
    } else if (valid.length > 0) {
      content += `\n✅ **Perfect! Toate documentele sunt valide și complete!**\n\n`;
      content += `Dosarul tău este gata de trimis spre verificare la primărie.\n\n`;
      content += `Scrie \"CONFIRM\" pentru a trimite dosarul.`;
    }

    const validationMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, validationMessage]);
  }; if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Se verifică autentificarea...</p>
        </div>
      </div>
    );
  }

  const handleSendMessage = async (messageText: string, silent: boolean = false) => {
    // Check for CONFIRM command
    if (messageText.trim().toUpperCase() === 'CONFIRM' && pendingValidation.length > 0) {
      await handleConfirmDocuments();
      return;
    }

    // Adaugă mesajul utilizatorului (unless silent)
    if (!silent) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: messageText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
    }

    setIsLoading(true);
    setError(null);

    try {
      // Salvează mesajul utilizatorului în Supabase (optional)
      if (!silent) {
        try {
          await ChatService.saveMessage({
            role: 'user',
            content: messageText,
          });
        } catch (saveErr) {
          console.error('Error saving message to Supabase:', saveErr);
          // Continue anyway - saving is optional
        }
      }

      // Apelează API-ul FastAPI chatbot
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

      // Prepare uploaded documents summary
      const docsContext = uploadedDocs.length > 0 ? uploadedDocs.map(d => ({
        type: d.document_type || 'unknown',
        status: d.validation_status,
        filename: d.file_name,
        message: d.validation_message
      })) : [];

      let response;
      try {
        response = await fetch(`${API_URL}/chatbot`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: messageText,
            uploaded_documents_info: docsContext, // Send document context to AI
          }),
        });
      } catch (fetchError) {
        console.error('Network error:', fetchError);
        throw new Error("Nu pot conecta la serverul backend. Asigură-te că serverul FastAPI rulează pe http://127.0.0.1:8000");
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('FastAPI error:', errorText);
        throw new Error("Eroare la comunicarea cu serverul FastAPI");
      }

      const data = await response.json();

      // Adaugă răspunsul AI (FastAPI returns "answer" not "response")
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer || data.response || "Nu am putut genera un răspuns.",
        timestamp: new Date(),
        // FastAPI poate returna informații suplimentare
        checklist: data.detected_procedure ? [
          `📋 Procedură detectată: ${data.detected_procedure}`,
          ...(data.needs_documents ? ['📎 Este nevoie să încarci documente'] : [])
        ] : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Salvează răspunsul AI în Supabase (optional)
      try {
        await ChatService.saveMessage({
          role: 'assistant',
          content: assistantMessage.content,
          checklist: assistantMessage.checklist,
        });
      } catch (saveErr) {
        console.error('Error saving AI response to Supabase:', saveErr);
        // Continue anyway - saving is optional
      }
    } catch (err: any) {
      console.error("Error sending message:", err);
      const errorMsg = err.message || "A apărut o eroare la comunicarea cu asistentul";
      setError(errorMsg);

      // Adaugă mesaj de eroare în chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Îmi pare rău, am întâmpinat o problemă tehnică. \n\n" +
          "**Verifică:**\n" +
          "• Serverul FastAPI rulează pe http://127.0.0.1:8000\n" +
          "• Comanda: `cd backend && uvicorn app.main:app --reload`\n\n" +
          "Apoi încearcă din nou.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CitizenPageLayout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-purple-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-purple-700">
                  ADU - Asistent Digital de Urbanism
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Întreabă-mă despre proceduri și documente necesare
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/upload"
                  className="rounded-lg bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                >
                  Încarcă documente
                </Link>
                <Link
                  href="/citizen/requests"
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
                >
                  Dosarele mele
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Chat Area */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
            <div className="flex flex-col h-full">
              {/* Error Banner */}
              {error && (
                <div className="bg-red-50 border-b border-red-200 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-red-600">⚠️</span>
                    <p className="text-sm text-red-800">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="ml-auto text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Messages */}
              <ChatWindow messages={messages} isLoading={isLoading} />

              {/* Uploaded Documents Status Bar */}
              {uploadedDocs.length > 0 && (
                <div className="border-t border-gray-200 bg-purple-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm font-medium text-purple-900">
                        {uploadedDocs.length} document{uploadedDocs.length > 1 ? 'e' : ''} încărcat{uploadedDocs.length > 1 ? 'e' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {uploadedDocs.filter(d => d.validation_status === 'approved').length > 0 && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          ✓ {uploadedDocs.filter(d => d.validation_status === 'approved').length} aprobat{uploadedDocs.filter(d => d.validation_status === 'approved').length > 1 ? 'e' : ''}
                        </span>
                      )}
                      {uploadedDocs.filter(d => d.validation_status === 'pending').length > 0 && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          ⏳ {uploadedDocs.filter(d => d.validation_status === 'pending').length} în așteptare
                        </span>
                      )}
                      {uploadedDocs.filter(d => d.validation_status === 'rejected').length > 0 && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          ✗ {uploadedDocs.filter(d => d.validation_status === 'rejected').length} respins{uploadedDocs.filter(d => d.validation_status === 'rejected').length > 1 ? 'e' : ''}
                        </span>
                      )}
                      <button
                        onClick={() => handleSendMessage("Verifică statusul documentelor mele și spune-mi dacă sunt complete și valide.", true)}
                        disabled={isLoading}
                        className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-colors disabled:bg-gray-300"
                      >
                        Verifică cu AI
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Input */}
              <ChatInput
                onSendMessage={handleSendMessage}
                disabled={isLoading}
                onUploadClick={() => router.push('/upload')}
              />
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl mb-2">💬</div>
              <h3 className="text-sm font-semibold text-gray-900">Întreabă</h3>
              <p className="text-xs text-gray-600 mt-1">
                Descrie ce lucrare vrei să realizezi
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl mb-2">📋</div>
              <h3 className="text-sm font-semibold text-gray-900">Află</h3>
              <p className="text-xs text-gray-600 mt-1">
                Primești lista documentelor necesare
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl mb-2">📤</div>
              <h3 className="text-sm font-semibold text-gray-900">Trimite</h3>
              <p className="text-xs text-gray-600 mt-1">
                Încarcă documentele și urmărește dosarul
              </p>
            </div>
          </div>
        </main>
      </div>
    </CitizenPageLayout>
  );
}
