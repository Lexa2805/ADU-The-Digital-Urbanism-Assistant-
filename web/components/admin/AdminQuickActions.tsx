'use client'
import React from 'react'

interface QuickAction {
  title: string
  description: string
  icon: React.ReactNode
  color: string
  action: () => void
}

export default function AdminQuickActions() {
  const actions: QuickAction[] = [
    {
      title: 'Validare Manuală Urgent',
      description: 'Validează documente AI pentru cereri urgente',
      color: 'red',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      action: () => alert('Redirecționare către validare urgentă...')
    },
    {
      title: 'Alocare Automată',
      description: 'Distribuie cereri noi către funcționari (AI)',
      color: 'purple',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      action: () => alert('Se alocă automat cereri...')
    },
    {
      title: 'Generare Raport Lunar',
      description: 'Creează raport complet luna curentă',
      color: 'blue',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      action: () => alert('Se generează raport...')
    },
    {
      title: 'Backup Bază Date',
      description: 'Backup complet GDPR-compliant',
      color: 'green',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
      ),
      action: () => alert('Se inițiază backup...')
    },
    {
      title: 'Sincronizare Legislație',
      description: 'Actualizează baza de cunoștințe RAG',
      color: 'orange',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      action: () => alert('Se actualizează legislația...')
    },
    {
      title: 'Email Masiv Cetățeni',
      description: 'Trimite notificări către utilizatori',
      color: 'indigo',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      action: () => alert('Redirecționare către email masiv...')
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      red: 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200',
      purple: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200',
      blue: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200',
      green: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200',
      orange: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200',
      indigo: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
    }
    return colors[color as keyof typeof colors] || colors.purple
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Acțiuni Rapide
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.action}
            className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all ${getColorClasses(
              action.color
            )}`}
          >
            <div className="flex-shrink-0 mt-1">{action.icon}</div>
            <div className="text-left">
              <p className="font-semibold text-sm mb-1">{action.title}</p>
              <p className="text-xs opacity-80">{action.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
