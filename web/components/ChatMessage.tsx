import { Message } from "@/types";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-purple-600 text-white rounded-br-sm"
            : "bg-purple-50 text-gray-900 rounded-bl-sm"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        
        {/* Afișează checklist-ul dacă există (doar pentru răspunsurile AI) */}
        {!isUser && message.checklist && message.checklist.length > 0 && (
          <div className="mt-3 pt-3 border-t border-purple-200">
            <p className="text-xs font-semibold mb-2 text-gray-600">
              Documente necesare:
            </p>
            <ul className="space-y-1">
              {message.checklist.map((item, index) => (
                <li key={index} className="flex items-start text-xs">
                  <span className="mr-2 text-green-600">✓</span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {message.timestamp && (
          <p className={`text-xs mt-2 ${isUser ? "text-purple-200" : "text-gray-500"}`}>
            {message.timestamp.toLocaleTimeString("ro-RO", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
