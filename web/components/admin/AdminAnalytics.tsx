'use client'
import React, { useState, useEffect } from 'react'

interface AnalyticsData {
  requestsByMonth: { month: string; count: number }[]
  requestsByType: { type: string; count: number; percentage: number }[]
  avgProcessingTime: number
  approvalRate: number
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

  useEffect(() => {
    loadAnalytics()
  }, [timeframe])

  const loadAnalytics = async () => {
    // Mock data - replace with real API call
    const mockData: AnalyticsData = {
      requestsByMonth: [
        { month: 'Ian', count: 45 },
        { month: 'Feb', count: 52 },
        { month: 'Mar', count: 61 },
        { month: 'Apr', count: 58 },
        { month: 'Mai', count: 70 },
        { month: 'Iun', count: 89 }
      ],
      requestsByType: [
        { type: 'Certificat Urbanism', count: 145, percentage: 42 },
        { type: 'Autorizație Construire', count: 98, percentage: 28 },
        { type: 'Autorizație Demolare', count: 67, percentage: 19 },
        { type: 'Altele', count: 38, percentage: 11 }
      ],
      avgProcessingTime: 3.2,
      approvalRate: 87
    }
    setData(mockData)
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  const maxCount = Math.max(...data.requestsByMonth.map(d => d.count))

  return (
    <div className="space-y-6">
      {/* Timeframe Selector */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Analiză & Rapoarte</h3>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', '1y'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tf === '7d' ? '7 Zile' : tf === '30d' ? '30 Zile' : tf === '90d' ? '90 Zile' : '1 An'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Cereri"
          value="348"
          change="+12%"
          trend="up"
          icon="📊"
        />
        <MetricCard
          title="Timp Mediu Procesare"
          value={`${data.avgProcessingTime} zile`}
          change="-15%"
          trend="up"
          icon="⏱️"
        />
        <MetricCard
          title="Rată Aprobare"
          value={`${data.approvalRate}%`}
          change="+2%"
          trend="up"
          icon="✅"
        />
        <MetricCard
          title="Cereri Active"
          value="32"
          change="-8%"
          trend="down"
          icon="⚡"
        />
      </div>

      {/* Chart: Requests by Month */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="font-semibold text-gray-800 mb-6">Evoluție Cereri (Lunar)</h4>
        <div className="flex items-end justify-between h-64 gap-4">
          {data.requestsByMonth.map((item, idx) => {
            const height = (item.count / maxCount) * 100
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative w-full h-full flex items-end">
                  <div
                    className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-lg hover:from-purple-700 hover:to-purple-500 transition-all cursor-pointer group relative"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                        {item.count}
                      </div>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-600">{item.month}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Request Types Distribution */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="font-semibold text-gray-800 mb-4">Distribuție după Tip Cerere</h4>
        <div className="space-y-4">
          {data.requestsByType.map((item, idx) => (
            <div key={idx}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{item.type}</span>
                <span className="text-sm text-gray-500">{item.count} ({item.percentage}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    idx === 0
                      ? 'bg-purple-600'
                      : idx === 1
                      ? 'bg-blue-600'
                      : idx === 2
                      ? 'bg-green-600'
                      : 'bg-orange-600'
                  }`}
                  style={{ width: `${item.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="font-semibold text-gray-800 mb-4">Exportă Rapoarte</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button className="px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium text-sm">
            📄 Export Excel
          </button>
          <button className="px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm">
            📑 Export PDF
          </button>
          <button className="px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm">
            📊 Export CSV
          </button>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  change,
  trend,
  icon
}: {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
  icon: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full ${
            trend === 'up'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {change}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  )
}
