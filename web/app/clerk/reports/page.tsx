'use client'
import React, { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { getClerkStats, type ClerkStats } from '../../../lib/clerkService'
import { supabase } from '../../../lib/supabaseClient'

interface MonthlyStats {
    month: string
    approved: number
    rejected: number
    total: number
}

export default function ReportsPage() {
    const [stats, setStats] = useState<ClerkStats | null>(null)
    const [monthlyData, setMonthlyData] = useState<MonthlyStats[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month')

    useEffect(() => {
        loadReportData()
    }, [selectedPeriod])

    async function loadReportData() {
        try {
            setLoading(true)
            setError(null)

            // Încarcă statistici generale
            const statsData = await getClerkStats()
            setStats(statsData)

            // Încarcă date lunare pentru ultimele 6 luni
            const monthlyStats = await getMonthlyStats()
            setMonthlyData(monthlyStats)

        } catch (err: any) {
            console.error('Error loading report data:', err)
            setError(err.message || 'Eroare la încărcarea raportului')
        } finally {
            setLoading(false)
        }
    }

    async function getMonthlyStats(): Promise<MonthlyStats[]> {
        const months = []
        const today = new Date()
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
            const nextMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1)
            
            const { count: approvedCount } = await supabase
                .from('requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'approved')
                .gte('created_at', date.toISOString())
                .lt('created_at', nextMonth.toISOString())

            const { count: rejectedCount } = await supabase
                .from('requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'rejected')
                .gte('created_at', date.toISOString())
                .lt('created_at', nextMonth.toISOString())

            months.push({
                month: date.toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' }),
                approved: approvedCount || 0,
                rejected: rejectedCount || 0,
                total: (approvedCount || 0) + (rejectedCount || 0)
            })
        }

        return months
    }

    const totalProcessed = monthlyData.reduce((sum, m) => sum + m.total, 0)
    const totalApproved = monthlyData.reduce((sum, m) => sum + m.approved, 0)
    const totalRejected = monthlyData.reduce((sum, m) => sum + m.rejected, 0)
    const approvalRate = totalProcessed > 0 ? ((totalApproved / totalProcessed) * 100).toFixed(1) : '0'

    async function exportToCSV() {
        try {
            // Pregătește datele pentru export
            const csvRows = [
                ['Lună', 'Aprobate', 'Respinse', 'Total', 'Rată Aprobare (%)'].join(',')
            ]

            monthlyData.forEach(month => {
                const rate = month.total > 0 ? ((month.approved / month.total) * 100).toFixed(1) : '0'
                csvRows.push([
                    month.month,
                    month.approved,
                    month.rejected,
                    month.total,
                    rate
                ].join(','))
            })

            // Adaugă totaluri
            csvRows.push([''])
            csvRows.push(['TOTAL', totalApproved, totalRejected, totalProcessed, approvalRate].join(','))

            // Creează și descarcă fișierul
            const csvContent = csvRows.join('\n')
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            
            link.setAttribute('href', url)
            link.setAttribute('download', `raport_cereri_${new Date().toISOString().split('T')[0]}.csv`)
            link.style.visibility = 'hidden'
            
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (error) {
            console.error('Error exporting CSV:', error)
            alert('Eroare la exportul CSV')
        }
    }

    async function exportToPDF() {
        try {
            // Pregătește conținutul HTML pentru PDF
            const content = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Raport Cereri</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; }
                        h1 { color: #7c3aed; margin-bottom: 10px; }
                        .subtitle { color: #666; margin-bottom: 30px; }
                        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
                        .stat-card { background: #f3f4f6; padding: 20px; border-radius: 8px; }
                        .stat-label { font-size: 12px; color: #666; margin-bottom: 5px; }
                        .stat-value { font-size: 32px; font-weight: bold; color: #7c3aed; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                        th { background-color: #7c3aed; color: white; }
                        tr:nth-child(even) { background-color: #f9fafb; }
                        .total-row { font-weight: bold; background-color: #e5e7eb; }
                        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <h1>Raport Statistici Cereri</h1>
                    <p class="subtitle">Generat pe ${new Date().toLocaleDateString('ro-RO', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</p>
                    
                    <div class="stats">
                        <div class="stat-card">
                            <div class="stat-label">Total Procesate</div>
                            <div class="stat-value">${totalProcessed}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Aprobate</div>
                            <div class="stat-value" style="color: #10b981;">${totalApproved}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Respinse</div>
                            <div class="stat-value" style="color: #ef4444;">${totalRejected}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Rată Aprobare</div>
                            <div class="stat-value" style="color: #3b82f6;">${approvalRate}%</div>
                        </div>
                    </div>

                    <h2>Detalii Lunare (Ultimele 6 Luni)</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Lună</th>
                                <th>Aprobate</th>
                                <th>Respinse</th>
                                <th>Total</th>
                                <th>Rată Aprobare</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${monthlyData.map(month => {
                                const rate = month.total > 0 ? ((month.approved / month.total) * 100).toFixed(1) : '0'
                                return `
                                    <tr>
                                        <td>${month.month}</td>
                                        <td>${month.approved}</td>
                                        <td>${month.rejected}</td>
                                        <td>${month.total}</td>
                                        <td>${rate}%</td>
                                    </tr>
                                `
                            }).join('')}
                            <tr class="total-row">
                                <td>TOTAL</td>
                                <td>${totalApproved}</td>
                                <td>${totalRejected}</td>
                                <td>${totalProcessed}</td>
                                <td>${approvalRate}%</td>
                            </tr>
                        </tbody>
                    </table>

                    ${stats ? `
                        <h2 style="margin-top: 40px;">Status Curent</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Categorie</th>
                                    <th>Număr Cereri</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>În Validare</td><td>${stats.pending_validation}</td></tr>
                                <tr><td>În Procesare</td><td>${stats.in_review}</td></tr>
                                <tr><td>Aproape de Termen</td><td>${stats.near_deadline}</td></tr>
                                <tr><td>Finalizate Luna Aceasta</td><td>${stats.completed_this_month}</td></tr>
                                <tr><td>Asignate Mie</td><td>${stats.assigned_to_me}</td></tr>
                            </tbody>
                        </table>
                    ` : ''}

                    <div class="footer">
                        <p>CityFix - Platforma de Gestionare Cereri Urbane</p>
                        <p>Raport generat automat</p>
                    </div>
                </body>
                </html>
            `

            // Creează un blob cu HTML-ul
            const blob = new Blob([content], { type: 'text/html' })
            const url = URL.createObjectURL(blob)
            
            // Deschide într-o fereastră nouă pentru print-to-PDF
            const printWindow = window.open(url, '_blank')
            if (printWindow) {
                printWindow.onload = () => {
                    setTimeout(() => {
                        printWindow.print()
                    }, 250)
                }
            }
        } catch (error) {
            console.error('Error exporting PDF:', error)
            alert('Eroare la exportul PDF')
        }
    }

    return (
        <DashboardLayout role="clerk">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Rapoarte Statistice</h1>
                        <p className="text-gray-600 mt-1">Analiză și statistici pentru cererile procesate</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedPeriod('week')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                selectedPeriod === 'week' 
                                    ? 'bg-purple-600 text-white' 
                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            Săptămână
                        </button>
                        <button
                            onClick={() => setSelectedPeriod('month')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                selectedPeriod === 'month' 
                                    ? 'bg-purple-600 text-white' 
                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            Lună
                        </button>
                        <button
                            onClick={() => setSelectedPeriod('year')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                selectedPeriod === 'year' 
                                    ? 'bg-purple-600 text-white' 
                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            An
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                    </div>
                ) : (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-6 text-white shadow-lg">
                                <p className="text-purple-100 text-sm mb-1">Total Procesate (6 luni)</p>
                                <p className="text-4xl font-bold">{totalProcessed}</p>
                            </div>
                            <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-6 text-white shadow-lg">
                                <p className="text-green-100 text-sm mb-1">Aprobate</p>
                                <p className="text-4xl font-bold">{totalApproved}</p>
                            </div>
                            <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-xl p-6 text-white shadow-lg">
                                <p className="text-red-100 text-sm mb-1">Respinse</p>
                                <p className="text-4xl font-bold">{totalRejected}</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-6 text-white shadow-lg">
                                <p className="text-blue-100 text-sm mb-1">Rată Aprobare</p>
                                <p className="text-4xl font-bold">{approvalRate}%</p>
                            </div>
                        </div>

                        {/* Current Status */}
                        {stats && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h2 className="text-lg font-semibold text-gray-800 mb-4">Status Curent</h2>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                                        <p className="text-sm text-gray-600 mb-1">În Validare</p>
                                        <p className="text-2xl font-bold text-purple-600">{stats.pending_validation}</p>
                                    </div>
                                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                                        <p className="text-sm text-gray-600 mb-1">În Procesare</p>
                                        <p className="text-2xl font-bold text-blue-600">{stats.in_review}</p>
                                    </div>
                                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                                        <p className="text-sm text-gray-600 mb-1">Aproape Termen</p>
                                        <p className="text-2xl font-bold text-orange-600">{stats.near_deadline}</p>
                                    </div>
                                    <div className="text-center p-4 bg-green-50 rounded-lg">
                                        <p className="text-sm text-gray-600 mb-1">Finalizate Luna</p>
                                        <p className="text-2xl font-bold text-green-600">{stats.completed_this_month}</p>
                                    </div>
                                    <div className="text-center p-4 bg-indigo-50 rounded-lg">
                                        <p className="text-sm text-gray-600 mb-1">Asignate Mie</p>
                                        <p className="text-2xl font-bold text-indigo-600">{stats.assigned_to_me}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Monthly Trend */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Tendință Lunară (Ultimele 6 Luni)</h2>
                            <div className="space-y-4">
                                {monthlyData.map((month, index) => {
                                    const maxTotal = Math.max(...monthlyData.map(m => m.total))
                                    const approvedWidth = maxTotal > 0 ? (month.approved / maxTotal) * 100 : 0
                                    const rejectedWidth = maxTotal > 0 ? (month.rejected / maxTotal) * 100 : 0

                                    return (
                                        <div key={index}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium text-gray-700">{month.month}</span>
                                                <span className="text-sm text-gray-600">{month.total} total</span>
                                            </div>
                                            <div className="flex gap-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                                                <div 
                                                    className="bg-green-500 flex items-center justify-center text-white text-xs font-medium transition-all"
                                                    style={{ width: `${approvedWidth}%` }}
                                                >
                                                    {month.approved > 0 && <span>{month.approved}</span>}
                                                </div>
                                                <div 
                                                    className="bg-red-500 flex items-center justify-center text-white text-xs font-medium transition-all"
                                                    style={{ width: `${rejectedWidth}%` }}
                                                >
                                                    {month.rejected > 0 && <span>{month.rejected}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-200">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                                    <span className="text-sm text-gray-600">Aprobate</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                                    <span className="text-sm text-gray-600">Respinse</span>
                                </div>
                            </div>
                        </div>

                        {/* Export Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Export Rapoarte</h2>
                            <p className="text-gray-600 mb-4">Exportă datele pentru analiză externă</p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={exportToCSV}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export CSV
                                </button>
                                <button 
                                    onClick={exportToPDF}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    Export PDF
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    )
}
