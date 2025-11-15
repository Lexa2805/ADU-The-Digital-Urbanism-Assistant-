'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function CitizenSidebar() {
    const pathname = usePathname()

    const menuItems = [
        {
            name: 'Dashboard',
            href: '/citizen',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
        },
        {
            name: 'Chat cu AI',
            href: '/chat',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            ),
        },
        {
            name: 'Încarcă Documente',
            href: '/upload',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
            ),
        },
        {
            name: 'Cererile Mele',
            href: '/citizen/requests',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
        },
        {
            name: 'Profil',
            href: '/citizen/profile',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            ),
        },
    ]

    const isActive = (href: string) => {
        if (href === '/citizen') {
            return pathname === href
        }
        return pathname?.startsWith(href)
    }

    return (
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen p-4">
            <Link href="/citizen" className="mb-8 block">
                <div className="flex items-center gap-3 px-3 py-2 hover:bg-purple-50 rounded-lg transition-colors">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shadow-md">
                        <span className="text-white font-semibold text-sm">ADU</span>
                    </div>
                    <div className="hidden lg:block">
                        <h2 className="text-sm font-semibold text-purple-700">ADU</h2>
                        <p className="text-xs text-gray-500">Portal Cetățean</p>
                    </div>
                </div>
            </Link>

            <nav className="space-y-1">
                {menuItems.map((item) => {
                    const active = isActive(item.href)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                active
                                    ? 'bg-purple-50 text-purple-700'
                                    : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <span className={active ? 'text-purple-600' : 'text-gray-400'}>
                                {item.icon}
                            </span>
                            <span>{item.name}</span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
