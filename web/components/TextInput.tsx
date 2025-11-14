import React from 'react'

type Props = {
    id: string
    label: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
    type?: string
    error?: string | null
    autoComplete?: string
    required?: boolean
}

export default function TextInput({
    id,
    label,
    value,
    onChange,
    placeholder = '',
    type = 'text',
    error = null,
    autoComplete,
    required = false
}: Props) {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-purple-700 mb-1.5">
                {label}{required && <span className="text-purple-600"> *</span>}
            </label>
            <input
                id={id}
                name={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoComplete={autoComplete}
                className={`block w-full rounded-lg border px-3.5 py-2.5 text-sm bg-white transition-colors
                    focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500
                    ${error ? 'border-red-300' : 'border-gray-300 hover:border-purple-300'}`}
            />
            {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
        </div>
    )
}
