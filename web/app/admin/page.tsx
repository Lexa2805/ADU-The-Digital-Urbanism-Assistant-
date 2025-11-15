'use client'
import React, { useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import AdminUserManagement from '../../components/admin/AdminUserManagement'
import AdminAnalytics from '../../components/admin/AdminAnalytics'
import AdminQuickActions from '../../components/admin/AdminQuickActions'
import AdminSmartNotifications from '../../components/admin/AdminSmartNotifications'
import AdminCalendar from '../../components/admin/AdminCalendar'
import AdminAdvancedSearch from '../../components/admin/AdminAdvancedSearch'
import AdminSystemSettings from '../../components/admin/AdminSystemSettings'

type AdminTab = 'overview' | 'users' | 'activity' | 'analytics' | 'calendar' | 'search' | 'settings'

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<AdminTab>('overview')

    return (
        <DashboardLayout role="admin">
            <div className="space-y-6">
                {/* Welcome Card */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl shadow-lg p-6 text-white">
                    <h2 className="text-2xl font-semibold mb-2">
                        Panou Administrator ADU
                    </h2>
                    <p className="text-purple-100">
                        Gestionare completă utilizatori, roluri și monitorizare activitate (GDPR Compliant)
                    </p>
                </div>

                {/* Navigation Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="border-b border-gray-200">
                        <nav className="flex -mb-px overflow-x-auto">
                            <TabButton
                                active={activeTab === 'overview'}
                                onClick={() => setActiveTab('overview')}
                                icon={
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                }
                            >
                                Prezentare Generală
                            </TabButton>
                            <TabButton
                                active={activeTab === 'users'}
                                onClick={() => setActiveTab('users')}
                                icon={
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                }
                            >
                                Gestionare Utilizatori
                            </TabButton>
                            <TabButton
                                active={activeTab === 'activity'}
                                onClick={() => setActiveTab('activity')}
                                icon={
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                }
                            >
                                Istoric Activitate
                            </TabButton>
                            <TabButton
                                active={activeTab === 'analytics'}
                                onClick={() => setActiveTab('analytics')}
                                icon={
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                }
                            >
                                Analiză & Rapoarte
                            </TabButton>
                            <TabButton
                                active={activeTab === 'calendar'}
                                onClick={() => setActiveTab('calendar')}
                                icon={
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                }
                            >
                                Calendar Termene
                            </TabButton>
                            <TabButton
                                active={activeTab === 'search'}
                                onClick={() => setActiveTab('search')}
                                icon={
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                }
                            >
                                Căutare Avansată
                            </TabButton>
                            <TabButton
                                active={activeTab === 'settings'}
                                onClick={() => setActiveTab('settings')}
                                icon={
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                }
                            >
                                Configurări
                            </TabButton>
                        </nav>
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'users' && <AdminUserManagement />}
                {activeTab === 'activity' && <ActivityTab />}
                {activeTab === 'analytics' && <AdminAnalytics />}
                {activeTab === 'calendar' && <AdminCalendar />}
                {activeTab === 'search' && <AdminAdvancedSearch />}
                {activeTab === 'settings' && <AdminSystemSettings />}
            </div>
        </DashboardLayout>
    )
}

function TabButton({ 
    active, 
    onClick, 
    icon, 
    children 
}: { 
    active: boolean
    onClick: () => void
    icon: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                active
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
        >
            {icon}
            {children}
        </button>
    )
}

function OverviewTab() {
    return (
        <div className="space-y-6">
            {/* Smart Notifications */}
            <AdminSmartNotifications />

            {/* Quick Actions Panel */}
            <AdminQuickActions />

            {/* System Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <AdminStatCard
                    title="Total Utilizatori"
                    value="247"
                    change="+12%"
                    positive={true}
                />
                <AdminStatCard
                    title="Cereri Luna Aceasta"
                    value="89"
                    change="+8%"
                    positive={true}
                />
                <AdminStatCard
                    title="Timp Mediu Procesare"
                    value="3.2 zile"
                    change="-15%"
                    positive={true}
                />
                <AdminStatCard
                    title="Rata Aprobare"
                    value="87%"
                    change="+2%"
                    positive={true}
                />
            </div>

            {/* Admin Actions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Management */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Gestionare Utilizatori
                    </h3>
                    <div className="space-y-3">
                        <AdminActionButton title="Vezi toți utilizatorii" count="247" />
                        <AdminActionButton title="Funcționari activi" count="12" />
                        <AdminActionButton title="Cereri de acces" count="3" />
                    </div>
                </div>

                {/* System Management */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Configurare Sistem
                    </h3>
                    <div className="space-y-3">
                        <AdminActionButton title="Setări generale" />
                        <AdminActionButton title="Configurare AI" />
                        <AdminActionButton title="Bază de cunoștințe RAG" />
                    </div>
                </div>

                {/* Content Management */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Gestionare Conținut
                    </h3>
                    <div className="space-y-3">
                        <AdminActionButton title="Documente în sistem" count="1,234" />
                        <AdminActionButton title="Șabloane cereri" count="15" />
                        <AdminActionButton title="Legislație actualizată" />
                    </div>
                </div>

                {/* Reports & Analytics */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Rapoarte & Analize
                    </h3>
                    <div className="space-y-3">
                        <AdminActionButton title="Raport lunar" />
                        <AdminActionButton title="Statistici AI" />
                        <AdminActionButton title="Export date" />
                    </div>
                </div>
            </div>
        </div>
    )
}

function ActivityTab() {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Istoric Activitate Sistem (În Dezvoltare)
            </h3>
            <p className="text-gray-600">
                Aici va fi afișat istoricul complet al activității din sistem, cu filtre pentru tipuri de acțiuni și utilizatori.
            </p>
        </div>
    )
}

function AdminStatCard({ title, value, change, positive }: {
    title: string
    value: string
    change: string
    positive: boolean
}) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-gray-800">{value}</p>
                <span className={`text-sm font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
                    {change}
                </span>
            </div>
        </div>
    )
}

function AdminActionButton({ title, count }: { title: string; count?: string }) {
    return (
        <button className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-purple-50 rounded-lg transition-colors group">
            <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">{title}</span>
            {count && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                    {count}
                </span>
            )}
        </button>
    )
}
