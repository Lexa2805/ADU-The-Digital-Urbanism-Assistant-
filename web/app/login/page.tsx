'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import AuthLayout from '../../components/AuthLayout'
import AuthCard from '../../components/AuthCard'
import TextInput from '../../components/TextInput'
import PasswordInput from '../../components/PasswordInput'

type Errors = {
    email?: string | null
    password?: string | null
    general?: string | null
}

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [remember, setRemember] = useState(true)
    const [errors, setErrors] = useState<Errors>({})
    const [loading, setLoading] = useState(false)

    const validate = (): boolean => {
        const e: Errors = {}
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        if (!email) {
            e.email = 'Email este obligatoriu.'
        } else if (!emailRegex.test(email)) {
            e.email = 'Format email invalid.'
        }

        if (!password) {
            e.password = 'Parola este obligatorie.'
        } else if (password.length < 6) {
            e.password = 'Parola trebuie să aibă cel puțin 6 caractere.'
        }

        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault()
        setErrors({})

        if (!validate()) return

        setLoading(true)
        try {
            console.log('Attempting login for:', email)
            
            // Autentificare cu Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            })

            console.log('Login response:', { data, error })

            if (error) {
                console.error('Login error details:', error)
                
                // Mesaje de eroare mai detaliate
                let errorMessage = 'Autentificare eșuată.'
                
                if (error.message.includes('Invalid login credentials')) {
                    errorMessage = 'Email sau parolă incorectă. Asigură-te că ai creat deja un cont.'
                } else if (error.message.includes('Email not confirmed')) {
                    errorMessage = 'Te rugăm să îți confirmi adresa de email din inbox.'
                } else if (error.message.includes('Email link is invalid')) {
                    errorMessage = 'Link-ul de confirmare a expirat. Încearcă să te înregistrezi din nou.'
                } else {
                    errorMessage = error.message
                }
                
                setErrors({ general: errorMessage })
                return
            }

            if (data.user) {
                console.log('Login success! User:', data.user)
                console.log('Session:', data.session)
                
                // Supabase gestionează automat sesiunea
                // Redirect la dashboard/chat după autentificare
                router.push('/chat')
            }
        } catch (err) {
            console.error('Login error:', err)
            setErrors({ general: 'A apărut o eroare la conectare. Încearcă din nou.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout>
            <AuthCard title="Autentificare în ADU">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <TextInput
                        id="email"
                        label="Email"
                        value={email}
                        onChange={setEmail}
                        placeholder="nume@exemplu.ro"
                        autoComplete="email"
                        error={errors.email ?? null}
                        required
                    />

                    <PasswordInput
                        id="password"
                        label="Parolă"
                        value={password}
                        onChange={setPassword}
                        placeholder="Introdu parola"
                        autoComplete="current-password"
                        error={errors.password ?? null}
                        required
                    />

                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Ține-mă minte</span>
                        </label>
                        <a href="#" className="text-sm text-purple-600 hover:text-purple-700 transition-colors">
                            Am uitat parola
                        </a>
                    </div>

                    {errors.general && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-600">{errors.general}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full inline-flex justify-center items-center rounded-lg bg-purple-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Se autentifică...
                            </>
                        ) : (
                            'Autentificare'
                        )}
                    </button>

                    <p className="text-sm text-center text-gray-600">
                        Nu ai cont?{' '}
                        <a href="/signup" className="text-purple-600 hover:text-purple-700 font-medium transition-colors">
                            Creează unul
                        </a>
                    </p>
                </form>
            </AuthCard>
        </AuthLayout>
    )
}


