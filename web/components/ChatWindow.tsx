import { useEffect, useRef } from "react";
import { Message } from "@/types";
import ChatMessage from "./ChatMessage";

interface ChatWindowProps {
  messages: Message[];
  isLoading?: boolean;
}

export default function ChatWindow({ messages, isLoading = false }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll la ultimul mesaj
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md">
            <div className="mb-4 text-4xl">💬</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Bun venit la ADU - Asistentul Digital de Urbanism
            </h3>
            <p className="text-sm text-gray-600">
              Pune o întrebare despre procedurile de urbanism sau descrie ce vrei să realizezi.
              De exemplu: &quot;Vreau să închid balconul&quot; sau &quot;Am nevoie de autorizație pentru extindere&quot;.
            </p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          
          {/* Loading indicator când așteaptă răspuns */}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-3 bg-gray-100">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                  <span className="text-sm text-gray-600">Asistentul scrie...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}
