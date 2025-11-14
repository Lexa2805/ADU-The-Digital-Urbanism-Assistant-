'use client'
import React from 'react'

type Props = {
    children: React.ReactNode
}

export default function AuthLayout({ children }: Props) {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
            <div className="absolute top-8 left-8 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shadow-md">
                    <span className="text-white font-semibold text-sm">ADU</span>
                </div>
                <span className="text-purple-700 font-semibold text-lg hidden md:inline">
                    ADU — Asistentul Digital de Urbanism
                </span>
            </div>

            <main className="w-full max-w-md">
                {children}
            </main>
        </div>
    )
}
