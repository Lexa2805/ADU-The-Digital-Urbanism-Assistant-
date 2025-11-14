'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import AuthLayout from '../../components/AuthLayout'
import AuthCard from '../../components/AuthCard'
import TextInput from '../../components/TextInput'
import PasswordInput from '../../components/PasswordInput'

type Errors = {
    name?: string | null
    email?: string | null
    password?: string | null
    confirm?: string | null
    terms?: string | null
    general?: string | null
}

export default function SignupPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [terms, setTerms] = useState(false)
    const [errors, setErrors] = useState<Errors>({})
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const validate = (): boolean => {
        const e: Errors = {}
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        if (!name.trim()) {
            e.name = 'Numele complet este obligatoriu.'
        }

        if (!email) {
            e.email = 'Email-ul este obligatoriu.'
        } else if (!emailRegex.test(email)) {
            e.email = 'Format email invalid.'
        }

        if (!password) {
            e.password = 'Parola este obligatorie.'
        } else if (password.length < 8) {
            e.password = 'Parola trebuie să aibă cel puțin 8 caractere.'
        }

        if (!confirm) {
            e.confirm = 'Confirmarea parolei este obligatorie.'
        } else if (password !== confirm) {
            e.confirm = 'Parolele nu sunt identice.'
        }

        if (!terms) {
            e.terms = 'Trebuie să accepți termenii și condițiile.'
        }

        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault()
        setErrors({})
        setSuccess(false)

        if (!validate()) return

        setLoading(true)
        try {
            // Înregistrare cu Supabase
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                    },
                }
            })

            console.log('Signup response:', { data, error })

            if (error) {
                console.error('Signup error:', error)
                let errorMessage = 'Înregistrare eșuată. Încearcă din nou.'
                
                if (error.message.includes('User already registered')) {
                    errorMessage = 'Acest email este deja înregistrat. Te rugăm să te autentifici.'
                } else if (error.message.includes('Password should be')) {
                    errorMessage = 'Parola nu îndeplinește cerințele. Minim 8 caractere.'
                } else {
                    errorMessage = error.message
                }
                
                setErrors({ general: errorMessage })
                return
            }

            if (data.user) {
                // Verifică dacă emailul este deja înregistrat
                if (data.user.identities && data.user.identities.length === 0) {
                    setErrors({ general: 'Acest email este deja înregistrat. Te rugăm să te autentifici.' })
                    return
                }

                console.log('Signup success! User:', data.user)
                console.log('Email confirmed:', data.user.email_confirmed_at)
                
                setSuccess(true)
                
                // Redirect la login după 2 secunde
                setTimeout(() => {
                    router.push('/login')
                }, 2000)
            }
        } catch (err) {
            console.error('Signup error:', err)
            setErrors({ general: 'A apărut o eroare la înregistrare. Încearcă din nou.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout>
            <AuthCard title="Creați un cont nou">
                {success ? (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                        <div className="flex justify-center mb-3">
                            <svg className="h-12 w-12 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-purple-700 mb-2">
                            Cont creat cu succes!
                        </h2>
                        <p className="text-sm text-purple-600 mb-2">
                            Poți să te autentifici imediat.
                        </p>
                        <p className="text-xs text-purple-500">
                            Redirecționare automată în 2 secunde...
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <TextInput
                            id="name"
                            label="Nume complet"
                            value={name}
                            onChange={setName}
                            placeholder="Ion Popescu"
                            autoComplete="name"
                            error={errors.name ?? null}
                            required
                        />

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
                            placeholder="Minim 8 caractere"
                            autoComplete="new-password"
                            error={errors.password ?? null}
                            required
                        />

                        <PasswordInput
                            id="confirm"
                            label="Confirmare parolă"
                            value={confirm}
                            onChange={setConfirm}
                            placeholder="Reintrodu parola"
                            autoComplete="new-password"
                            error={errors.confirm ?? null}
                            required
                        />

                        <div>
                            <label className="flex items-start gap-2.5 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={terms}
                                    onChange={(e) => setTerms(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer mt-0.5"
                                />
                                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                                    Accept{' '}
                                    <a href="#" className="text-purple-600 hover:text-purple-700 underline">
                                        termenii și condițiile
                                    </a>
                                </span>
                            </label>
                            {errors.terms && <p className="mt-1.5 text-sm text-red-500 ml-6">{errors.terms}</p>}
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
                                    Se înregistrează...
                                </>
                            ) : (
                                'Creează cont'
                            )}
                        </button>

                        <p className="text-sm text-center text-gray-600">
                            Ai deja cont?{' '}
                            <a href="/login" className="text-purple-600 hover:text-purple-700 font-medium transition-colors">
                                Autentifică-te
                            </a>
                        </p>
                    </form>
                )}
            </AuthCard>
        </AuthLayout>
    )
}


