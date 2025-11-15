'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { getUserProfile } from '../../lib/profileService'
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
            console.log('🔐 Attempting login for:', email.trim())
            console.log('📧 Email length:', email.trim().length)
            console.log('🔑 Password length:', password.length)

            // Autentificare cu Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            })

            console.log('📬 Login response:', { data, error })

            if (error) {
                console.error('Login error details:', error)

                // Mesaje de eroare mai detaliate
                let errorMessage = 'Autentificare eșuată.'

                if (error.message.includes('Invalid login credentials')) {
                    errorMessage = 'Email sau parolă incorectă.'
                } else if (error.message.includes('Email not confirmed')) {
                    errorMessage = 'Te rugăm să îți confirmi adresa de email din inbox.'
                } else if (error.message.includes('Email link is invalid')) {
                    errorMessage = 'Link-ul de confirmare a expirat. Încearcă să te înregistrezi din nou.'
                } else if (error.message.includes('User not found')) {
                    errorMessage = 'Nu există un cont cu acest email.'
                } else {
                    errorMessage = error.message
                }

                setErrors({ general: errorMessage })
                setLoading(false)
                return
            }

            if (data.user) {
                console.log('Login success! User:', data.user)
                console.log('User ID:', data.user.id)
                console.log('Session:', data.session)

                // Așteaptă pentru stabilizarea sesiunii
                await new Promise(resolve => setTimeout(resolve, 1000))

                // Încearcă să obții profilul de 3 ori (workaround pentru RLS timing issues)
                let profile = null
                let profileError = null

                for (let attempt = 1; attempt <= 3; attempt++) {
                    console.log(`Attempt ${attempt} to fetch profile...`)

                    const { data: profileData, error: err } = await supabase
                        .from('profiles')
                        .select('id, full_name, role, created_at')
                        .eq('id', data.user.id)
                        .maybeSingle()  // Folosește maybeSingle în loc de single

                    if (profileData) {
                        profile = profileData
                        break
                    }

                    profileError = err

                    if (attempt < 3) {
                        await new Promise(resolve => setTimeout(resolve, 500))
                    }
                }

                console.log('Profile query result:', { profile, profileError })

                // Redirect bazat pe rol
                if (profile && profile.role) {
                    console.log('Redirecting based on role:', profile.role)

                    // Salvează rolul în localStorage pentru verificări ulterioare
                    localStorage.setItem('user_role', profile.role)

                    switch (profile.role) {
                        case 'admin':
                            router.push('/admin')
                            break
                        case 'clerk':
                            router.push('/clerk')
                            break
                        case 'citizen':
                        default:
                            router.push('/citizen')
                            break
                    }
                } else {
                    // Dacă nu există profil după 3 încercări
                    console.error('No profile found after 3 attempts!')
                    console.error('Profile error:', profileError)

                    // Încearcă să creezi profilul
                    try {
                        console.log('Attempting to create profile...')
                        const { data: newProfile, error: createError } = await supabase
                            .from('profiles')
                            .insert({
                                id: data.user.id,
                                full_name: data.user.user_metadata?.full_name || '',
                                role: 'citizen'
                            })
                            .select()
                            .single()

                        console.log('Profile creation result:', { newProfile, createError })

                        if (newProfile) {
                            console.log('Profile created successfully, redirecting to citizen')
                            localStorage.setItem('user_role', 'citizen')
                            router.push('/citizen')
                        } else {
                            setErrors({
                                general: `Eroare la crearea profilului: ${createError?.message || 'Unknown error'}`
                            })
                        }
                    } catch (createError) {
                        console.error('Failed to create profile:', createError)
                        setErrors({
                            general: 'Nu s-a putut crea profilul. Verifică politicile RLS în Supabase.'
                        })
                    }
                }
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
                {/* Buton înapoi */}
                <div className="mb-4">
                    <button
                        type="button"
                        onClick={() => router.push('/')}
                        className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Înapoi
                    </button>
                </div>

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
                            {errors.general.includes('Email sau parolă incorectă') && (
                                <p className="text-sm text-gray-600 mt-2">
                                    Nu ai cont încă?{' '}
                                    <a href="/signup" className="text-purple-600 hover:text-purple-700 font-medium">
                                        Creează unul aici
                                    </a>
                                </p>
                            )}
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


