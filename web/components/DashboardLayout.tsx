'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'
import AdminNotifications from './admin/AdminNotifications'

type Props = {
    children: React.ReactNode
    role: 'citizen' | 'clerk' | 'admin'
}

export default function DashboardLayout({ children, role }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        checkUser()
    }, [])

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/login')
            return
        }
        setUser(user)
        setLoading(false)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Se încarcă...</p>
                </div>
            </div>
        )
    }

    const getRoleName = () => {
        switch (role) {
            case 'citizen': return 'Cetățean'
            case 'clerk': return 'Funcționar'
            case 'admin': return 'Administrator'
        }
    }

    const getNavigationLinks = () => {
        if (role === 'clerk') {
            return [
                { href: '/clerk', label: 'Dashboard', icon: '📊' },
                { href: '/clerk/queue', label: 'Coada de Cereri', icon: '📋' },
                { href: '/clerk/my-requests', label: 'Cererile Mele', icon: '📌' },
                { href: '/clerk/reports', label: 'Rapoarte', icon: '📈' },
            ]
        }
        if (role === 'admin') {
            return [
                { href: '/admin', label: 'Dashboard', icon: '📊' },
                { href: '/admin/users', label: 'Utilizatori', icon: '👥' },
                { href: '/admin/settings', label: 'Setări', icon: '⚙️' },
            ]
        }
        if (role === 'citizen') {
            return [
                { href: '/citizen', label: 'Dashboard', icon: '🏠' },
                { href: '/citizen/new-request', label: 'Cerere Nouă', icon: '➕' },
                { href: '/citizen/requests', label: 'Cererile Mele', icon: '📋' },
                { href: '/chat', label: 'Chat ADU', icon: '💬' },
            ]
        }
        return []
    }

    const navLinks = getNavigationLinks()

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shadow-md">
                                <span className="text-white font-semibold text-sm">ADU</span>
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-purple-700">ADU — Asistentul Digital de Urbanism</h1>
                                <p className="text-xs text-gray-500">{getRoleName()}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Admin Notifications */}
                            {role === 'admin' && <AdminNotifications />}
                            
                            {/* User Menu */}
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-medium text-gray-700">
                                    {user?.user_metadata?.full_name || user?.email}
                                </p>
                                <p className="text-xs text-gray-500">{user?.email}</p>
                            </div>
                            
                            {/* Profile Link for Admin */}
                            {role === 'admin' && (
                                <Link
                                    href="/admin/profile"
                                    className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                    title="Profil"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </Link>
                            )}
                            
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span className="hidden sm:inline">Deconectare</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs (for Clerk and Admin) */}
            {(role === 'clerk' || role === 'admin' || role === 'citizen') && navLinks.length > 0 && (
                <nav className="bg-white border-b border-gray-200 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex gap-1 overflow-x-auto">
                            {navLinks.map((link) => {
                                const isActive = pathname === link.href
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`
                                            flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                                            border-b-2 transition-colors
                                            ${isActive 
                                                ? 'border-purple-600 text-purple-600 bg-purple-50' 
                                                : 'border-transparent text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                                            }
                                        `}
                                    >
                                        <span>{link.icon}</span>
                                        <span>{link.label}</span>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                </nav>
            )}

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <p className="text-center text-sm text-gray-500">
                        © 2025 ADU - Asistentul Digital de Urbanism. Toate drepturile rezervate.
                    </p>
                </div>
            </footer>
        </div>
    )
}
