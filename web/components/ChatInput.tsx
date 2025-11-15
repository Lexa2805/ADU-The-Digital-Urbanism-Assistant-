import { useState, KeyboardEvent } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onUploadClick?: () => void;
}

export default function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = "Descrie ce vrei să faci (ex: Vreau să închid balconul)...",
  onUploadClick,
}: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Trimite mesajul cu Enter (fără Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="flex items-end gap-2">
        {onUploadClick && (
          <button
            onClick={onUploadClick}
            disabled={disabled}
            className="rounded-lg bg-purple-100 p-3 text-purple-600 transition-colors hover:bg-purple-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            title="Încarcă documente"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </button>
        )}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-purple-200 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:bg-gray-50 disabled:text-gray-500"
          style={{
            minHeight: "48px",
            maxHeight: "120px",
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !message.trim()}
          className="rounded-lg bg-purple-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Trimite
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Apasă Enter pentru a trimite, Shift+Enter pentru rând nou
      </p>
    </div>
  );
}
