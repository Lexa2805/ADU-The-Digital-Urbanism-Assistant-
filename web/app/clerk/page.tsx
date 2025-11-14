'use client'
import React from 'react'
import DashboardLayout from '../../components/DashboardLayout'

export default function ClerkDashboard() {
    return (
        <DashboardLayout role="clerk">
            <div className="space-y-6">
                {/* Welcome Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-2xl font-semibold text-purple-700 mb-2">
                        Panou Funcționar
                    </h2>
                    <p className="text-gray-600">
                        Gestionează și procesează cererile de urbanism.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard
                        title="Cereri Noi"
                        value="12"
                        color="purple"
                        icon={
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="În Procesare"
                        value="8"
                        color="blue"
                        icon={
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Aprobare Termen"
                        value="3"
                        color="orange"
                        icon={
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Finalizate Luna"
                        value="45"
                        color="green"
                        icon={
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                </div>

                {/* Priority Queue */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Coada de Priorități</h3>
                        <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                            Vezi toate →
                        </button>
                    </div>
                    <div className="text-center py-8 text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-lg font-medium">Nu sunt cereri în așteptare</p>
                        <p className="text-sm mt-1">Toate cererile au fost procesate</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <QuickAction
                        title="Validare Documente AI"
                        description="Revizuiește validările automate"
                        icon="📄"
                    />
                    <QuickAction
                        title="Hartă Cereri"
                        description="Vezi cererile pe hartă (GIS)"
                        icon="🗺️"
                    />
                    <QuickAction
                        title="Rapoarte"
                        description="Generează rapoarte statistice"
                        icon="📊"
                    />
                </div>
            </div>
        </DashboardLayout>
    )
}

function StatCard({ title, value, color, icon }: {
    title: string
    value: string
    color: 'purple' | 'blue' | 'orange' | 'green'
    icon: React.ReactNode
}) {
    const colors = {
        purple: 'bg-purple-50 text-purple-600 border-purple-200',
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        orange: 'bg-orange-50 text-orange-600 border-orange-200',
        green: 'bg-green-50 text-green-600 border-green-200',
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className={`w-12 h-12 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
                {icon}
            </div>
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
    )
}

function QuickAction({ title, description, icon }: {
    title: string
    description: string
    icon: string
}) {
    return (
        <button className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left">
            <div className="text-4xl mb-3">{icon}</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
        </button>
    )
}
