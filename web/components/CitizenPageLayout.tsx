'use client'
import React from 'react'
import CitizenSidebar from './CitizenSidebar'

interface CitizenPageLayoutProps {
    children: React.ReactNode
    showSidebar?: boolean
}

export default function CitizenPageLayout({ children, showSidebar = true }: CitizenPageLayoutProps) {
    if (!showSidebar) {
        return <>{children}</>
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <CitizenSidebar />
            <div className="flex-1">
                {children}
            </div>
        </div>
    )
}
