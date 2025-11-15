"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FileUploadForm from "@/components/FileUploadForm";
import { UploadResponse } from "@/types";
import Link from "next/link";

export default function UploadPage() {
  const router = useRouter();
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dossierId, setDossierId] = useState<string | null>(null);

  const handleUploadComplete = (response: UploadResponse) => {
    if (response.success) {
      setUploadSuccess(true);
      if (response.dossier_id) {
        setDossierId(response.dossier_id);
      }
    }
  };

  const handleViewStatus = () => {
    if (dossierId) {
      router.push(`/status/${dossierId}`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-purple-700">
                Încărcare documente
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Adaugă documentele necesare pentru dosarul tău
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/chat"
                className="rounded-lg bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"
              >
                Înapoi la chat
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!uploadSuccess ? (
          <>
            {/* Instructions Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">ℹ️</div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Informații importante
                  </h2>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-1">•</span>
                      <span>
                        Asigură-te că toate documentele sunt scanate clar și lizibil
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-1">•</span>
                      <span>
                        Formate acceptate: PDF, JPG, PNG, DOC, DOCX
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-1">•</span>
                      <span>
                        Mărimea maximă per fișier: 10 MB
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-1">•</span>
                      <span>
                        Poți încărca maxim 10 fișiere odată
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Upload Form */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Selectează documentele
              </h2>
              <FileUploadForm onUploadComplete={handleUploadComplete} />
            </div>

            {/* Required Documents Checklist (Example) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Documente uzual necesare
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "Cerere tip (formular completat)",
                  "Act de identitate (buletin/CI)",
                  "Act de proprietate",
                  "Certificat de urbanism (dacă este cazul)",
                  "Plan de situație",
                  "Releveu tehnic",
                  "Memoriu tehnic",
                  "Dovada plății taxelor",
                ].map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <span className="text-blue-600">📄</span>
                    <span>{doc}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-4">
                * Lista poate varia în funcție de tipul autorizației solicitate.
                Consultă chatbot-ul pentru detalii personalizate.
              </p>
            </div>
          </>
        ) : (
          /* Success Message */
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                <svg
                  className="w-10 h-10 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Documentele au fost încărcate cu succes!
              </h2>
              <p className="text-gray-600">
                Dosarul tău a fost înregistrat și va fi procesat în curând.
              </p>
              {dossierId && (
                <p className="text-sm text-gray-500 mt-2">
                  Număr dosar: <span className="font-mono font-semibold">{dossierId}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {dossierId && (
                <button
                  onClick={handleViewStatus}
                  className="rounded-lg bg-purple-600 px-6 py-3 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
                >
                  Vezi statusul dosarului
                </button>
              )}
              <Link
                href="/chat"
                className="rounded-lg bg-purple-50 px-6 py-3 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors inline-block"
              >
                Înapoi la chat
              </Link>
              <button
                onClick={() => {
                  setUploadSuccess(false);
                  setDossierId(null);
                }}
                className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Încarcă alte documente
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
