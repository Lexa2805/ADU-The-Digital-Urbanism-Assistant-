'use client'
import React, { useState } from 'react'

type Props = {
    id: string
    label: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
    error?: string | null
    required?: boolean
    autoComplete?: string
}

export default function PasswordInput({
    id,
    label,
    value,
    onChange,
    placeholder = '',
    error = null,
    required = false,
    autoComplete
}: Props) {
    const [visible, setVisible] = useState(false)

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-purple-700 mb-1.5">
                {label}{required && <span className="text-purple-600"> *</span>}
            </label>
            <div className="relative">
                <input
                    id={id}
                    name={id}
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    className={`block w-full rounded-lg border px-3.5 py-2.5 text-sm bg-white transition-colors pr-10
                        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500
                        ${error ? 'border-red-300' : 'border-gray-300 hover:border-purple-300'}`}
                />
                <button
                    type="button"
                    onClick={() => setVisible(v => !v)}
                    aria-label={visible ? 'Ascunde parola' : 'Arată parola'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-purple-600 hover:text-purple-700 transition-colors"
                >
                    {visible ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.418 0-8-3.582-8-8 0-1.064.208-2.08.586-3.008m12.828 0A7.966 7.966 0 0112 5c-1.657 0-3.157.506-4.414 1.366M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    )}
                </button>
            </div>
            {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
        </div>
    )
}
