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

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setIsCheckingAuth(false);
        // Încarcă mesajele din Supabase
        loadMessages();
      }
    };
    checkAuth();
  }, [router]);

  const loadMessages = async () => {
    try {
      const loadedMessages = await ChatService.loadMessages();
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Se verifică autentificarea...</p>
        </div>
      </div>
    );
  }

  const handleSendMessage = async (messageText: string) => {
    // Adaugă mesajul utilizatorului
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Salvează mesajul utilizatorului în Supabase
      await ChatService.saveMessage({
        role: 'user',
        content: messageText,
      });

      // Apelează API-ul chatbot
      const response = await fetch(`${API_BASE_URL}/chatbot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText,
          // dossier_id poate fi adăugat ulterior când este disponibil
        }),
      });

      if (!response.ok) {
        throw new Error("Eroare la comunicarea cu serverul");
      }

      const data: ChatbotResponse = await response.json();

      // Adaugă răspunsul AI
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        timestamp: new Date(),
        checklist: data.checklist,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Salvează răspunsul AI în Supabase
      await ChatService.saveMessage({
        role: 'assistant',
        content: data.answer,
        checklist: data.checklist,
      });
    } catch (err) {
      console.error("Error sending message:", err);
      setError(
        "A apărut o eroare la comunicarea cu asistentul. Te rog să încerci din nou."
      );

      // Adaugă mesaj de eroare în chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Îmi pare rău, am întâmpinat o problemă tehnică. Te rog să încerci din nou.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);

      // Salvează mesajul de eroare
      await ChatService.saveMessage({
        role: 'assistant',
        content: 'Îmi pare rău, am întâmpinat o problemă tehnică. Te rog să încerci din nou.',
      }).catch(console.error);
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

            {/* Input */}
            <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
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
