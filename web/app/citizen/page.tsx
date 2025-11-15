'use client'
import React from 'react'
import DashboardLayout from '../../components/DashboardLayout'

export default function CitizenDashboard() {
    return (
        <DashboardLayout role="citizen">
            <div className="space-y-6">
                {/* Welcome Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-2xl font-semibold text-purple-700 mb-2">
                        Bun venit în ADU!
                    </h2>
                    <p className="text-gray-600">
                        Portalul tău digital pentru solicitări de urbanism și autorizații.
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ActionCard
                        title="Cerere Nouă"
                        description="Discută cu asistentul AI despre cererea ta"
                        icon={
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        }
                        color="purple"
                        href="/chat"
                    />
                    <ActionCard
                        title="Încarcă Documente"
                        description="Adaugă documente pentru dosarul tău"
                        icon={
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        }
                        color="purple"
                        href="/upload"
                    />
                    <ActionCard
                        title="Cererile Mele"
                        description="Vizualizează și gestionează cererile tale"
                        icon={
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        }
                        color="purple"
                        href="/citizen/requests"
                    />
                </div>

                {/* Status Overview */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Status Cereri Recente</h3>
                    <div className="text-center py-8 text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-lg font-medium">Nu ai cereri active</p>
                        <p className="text-sm mt-1">Creează prima ta cerere pentru a începe</p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}

function ActionCard({ title, description, icon, color, href }: {
    title: string
    description: string
    icon: React.ReactNode
    color: 'purple' | 'blue' | 'green'
    href?: string
}) {
    const colors = {
        purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
        blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
        green: 'bg-green-50 text-green-600 hover:bg-green-100',
    }

    const content = (
        <>
            <div className={`w-16 h-16 rounded-lg ${colors[color]} flex items-center justify-center mb-4`}>
                {icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
        </>
    )

    if (href) {
        return (
            <a 
                href={href}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left block"
            >
                {content}
            </a>
        )
    }

    return (
        <button className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left block w-full">
            {content}
        </button>
    )
}
