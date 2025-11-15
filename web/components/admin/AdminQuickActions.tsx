'use client'
import React, { useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getUrgentRequests, autoAssignRequests, getAllRequests, getRequestsStatistics } from '@/lib/api/requestsApi'
import { getRejectedDocuments } from '@/lib/api/documentsApi'

interface QuickActionConfig {
  key: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  action: () => Promise<void> | void
}

type AdminTabNav = 'overview' | 'users' | 'activity' | 'analytics' | 'calendar' | 'search' | 'settings'

interface AdminQuickActionsProps {
  onNavigate?: (tab: AdminTabNav) => void
}

const downloadBlob = (content: BlobPart, filename: string, type: string) => {
  const blob = new Blob([content], { type })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'A apărut o eroare neașteptată')

interface CitizenEmail {
  full_name: string | null
  email: string
}

export default function AdminQuickActions({ onNavigate }: AdminQuickActionsProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null)

  const handleManualValidation = async () => {
    setActiveAction('manual')
    toast.loading('Generez raportul pentru validare...', { id: 'manual-action' })
    try {
      const [urgent, rejected] = await Promise.all([
        getUrgentRequests(10),
        getRejectedDocuments(25)
      ])

      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.text('Validare Manuală Urgentă', 14, 18)
      doc.setFontSize(11)
      doc.text('Cereri cu termen critic', 14, 26)

      autoTable(doc, {
        startY: 32,
        head: [['Tip cerere', 'Cetățean', 'Termen legal', 'Status']],
        body: urgent.map(item => [
          item.request_type,
          item.user.full_name || item.user.email,
          item.legal_deadline ? new Date(item.legal_deadline).toLocaleDateString('ro-RO') : '-',
          item.status
        ]),
        styles: { fontSize: 9 }
      })

      const startY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10 : 32
      doc.setFontSize(11)
      doc.text('Documente respinse de AI', 14, startY)
      autoTable(doc, {
        startY: startY + 4,
        head: [['Document', 'Cerere', 'Cetățean', 'Motiv respingere']],
        body: rejected.map(docItem => [
          docItem.file_name,
          docItem.request?.request_type || 'N/A',
          docItem.request?.user?.full_name || docItem.request?.user?.email || 'N/A',
          docItem.validation_message || 'Fără detalii'
        ]),
        styles: { fontSize: 9 }
      })

      doc.save(`validare-urgenta-${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('Raportul PDF a fost descărcat', { id: 'manual-action' })
      onNavigate?.('analytics')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error), { id: 'manual-action' })
    } finally {
      setActiveAction(null)
    }
  }

  const handleAutoAssign = async () => {
    setActiveAction('auto-assign')
    toast.loading('Distribui cererile către funcționari...', { id: 'auto-assign' })
    try {
      const result = await autoAssignRequests()
      toast.success(`${result.assigned_count} cereri alocate.`, { id: 'auto-assign' })
      onNavigate?.('analytics')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error), { id: 'auto-assign' })
    } finally {
      setActiveAction(null)
    }
  }

  const handleMonthlyReport = async () => {
    setActiveAction('monthly-report')
    toast.loading('Pregătesc raportul lunar...', { id: 'monthly-report' })
    try {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const stats = await getRequestsStatistics('30d')
      const requests = await getAllRequests({ from_date: start, to_date: now.toISOString() })

      const header = ['Tip cerere', 'Status', 'Cetățean', 'Creat la']
      const rows = requests.slice(0, 200).map(req => [
        req.request_type,
        req.status,
        req.user.full_name || req.user.email,
        new Date(req.created_at).toLocaleDateString('ro-RO')
      ])

      const statsBlock = [
        `Total cereri: ${stats.total}`,
        `În lucru: ${stats.pending}`,
        `Aprobate: ${stats.approved}`,
        `Respise: ${stats.rejected}`,
        `Rată aprobare: ${stats.approval_rate}%`
      ].join('\n')

      const csv = [
        statsBlock,
        '',
        header.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      downloadBlob(csv, `raport-lunar-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;')
      toast.success('Raportul lunar a fost generat', { id: 'monthly-report' })
    } catch (error: unknown) {
      toast.error(getErrorMessage(error), { id: 'monthly-report' })
    } finally {
      setActiveAction(null)
    }
  }

  const handleBackup = async () => {
    setActiveAction('backup')
    toast.loading('Generez fișierul de backup...', { id: 'backup' })
    try {
      const response = await fetch('/api/admin/backup')
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Backup indisponibil')
      }

      downloadBlob(
        JSON.stringify(result.data, null, 2),
        `cityfix-backup-${new Date().toISOString()}.json`,
        'application/json'
      )
      toast.success('Backup descărcat.', { id: 'backup' })
    } catch (error: unknown) {
      toast.error(getErrorMessage(error), { id: 'backup' })
    } finally {
      setActiveAction(null)
    }
  }

  const handleLegislationSync = async () => {
    setActiveAction('legislation')
    toast.loading('Pornesc sincronizarea legislației...', { id: 'legislation' })
    try {
      const response = await fetch('/api/admin/knowledge/sync', { method: 'POST' })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Operațiune eșuată')
      }
      toast.success(result.message || 'Sincronizare în curs', { id: 'legislation' })
    } catch (error: unknown) {
      toast.error(getErrorMessage(error), { id: 'legislation' })
    } finally {
      setActiveAction(null)
    }
  }

  const handleBulkEmail = async () => {
    setActiveAction('bulk-email')
    toast.loading('Pregătesc lista de emailuri...', { id: 'bulk-email' })
    try {
      const response = await fetch('/api/admin/emails/citizens')
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Nu s-au putut încărca emailurile')
      }

      const csv = [
        'Nume,Email',
        ...result.data.map((user: CitizenEmail) => `${user.full_name || ''},${user.email}`)
      ].join('\n')

      downloadBlob(csv, 'lista-emailuri-cetateni.csv', 'text/csv;charset=utf-8;')
      toast.success('Lista de emailuri a fost exportată', { id: 'bulk-email' })
    } catch (error: unknown) {
      toast.error(getErrorMessage(error), { id: 'bulk-email' })
    } finally {
      setActiveAction(null)
    }
  }

  const actions: QuickActionConfig[] = [
    {
      key: 'manual',
      title: 'Validare Manuală Urgent',
      description: 'PDF cu cererile critice și documentele respinse',
      color: 'red',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      action: handleManualValidation
    },
    {
      key: 'auto-assign',
      title: 'Alocare Automată',
      description: 'Distribuie cereri noi către funcționari (AI)',
      color: 'purple',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      action: handleAutoAssign
    },
    {
      key: 'monthly-report',
      title: 'Generare Raport Lunar',
      description: 'CSV cu statistici și primele 200 de cereri',
      color: 'blue',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      action: handleMonthlyReport
    },
    {
      key: 'backup',
      title: 'Backup Bază Date',
      description: 'Export JSON cu ultimele 250 cereri & documente',
      color: 'green',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
      ),
      action: handleBackup
    },
    {
      key: 'legislation',
      title: 'Sincronizare Legislație',
      description: 'Înregistrează o actualizare în baza RAG',
      color: 'orange',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      action: handleLegislationSync
    },
    {
      key: 'bulk-email',
      title: 'Email Masiv Cetățeni',
      description: 'Exportă lista de emailuri active',
      color: 'indigo',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      action: handleBulkEmail
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
      <Toaster position="top-right" />
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Acțiuni Rapide
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {actions.map(action => (
          <button
            key={action.key}
            onClick={() => action.action()}
            disabled={activeAction === action.key}
            className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all ${getColorClasses(
              action.color
            )} ${activeAction === action.key ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <div className="flex-shrink-0 mt-1">{action.icon}</div>
            <div className="text-left">
              <p className="font-semibold text-sm mb-1">{action.title}</p>
              <p className="text-xs opacity-80">
                {activeAction === action.key ? 'Se procesează…' : action.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
