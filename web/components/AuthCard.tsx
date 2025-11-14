import React from 'react'

type Props = {
    title?: string
    children: React.ReactNode
    className?: string
}

export default function AuthCard({ title, children, className = '' }: Props) {
    return (
        <div className={`bg-white border border-purple-100 rounded-xl shadow-lg p-8 ${className}`}>
            {title && (
                <h1 className="text-2xl text-purple-700 font-semibold mb-6 text-center">
                    {title}
                </h1>
            )}
            <div className="space-y-4">{children}</div>
        </div>
    )
}
