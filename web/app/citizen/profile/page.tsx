'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

type ProfileData = {
    full_name: string
    email: string
    phone?: string
    address?: string
    city?: string
}

export default function ProfilePage() {
    const router = useRouter()
    const [profile, setProfile] = useState<ProfileData>({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        loadProfile()
    }, [])

    const loadProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            
            if (!user) {
                router.push('/login')
                return
            }

            // Încarcă datele din profiles
            const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading profile:', error)
            }

            setProfile({
                full_name: profileData?.full_name || user.user_metadata?.full_name || '',
                email: user.email || '',
                phone: profileData?.phone || '',
                address: profileData?.address || '',
                city: profileData?.city || '',
            })
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            
            if (!user) {
                router.push('/login')
                return
            }

            // Actualizează profilul
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    full_name: profile.full_name,
                    phone: profile.phone || null,
                    address: profile.address || null,
                    city: profile.city || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id)

            if (updateError) {
                throw updateError
            }

            // Actualizează și metadata user
            const { error: authError } = await supabase.auth.updateUser({
                data: { full_name: profile.full_name }
            })

            if (authError) {
                console.error('Auth update error:', authError)
            }

            setMessage({ type: 'success', text: 'Profilul a fost actualizat cu succes!' })
            
            // Reîncarcă profilul
            await loadProfile()
        } catch (error: any) {
            console.error('Save error:', error)
            setMessage({ type: 'error', text: error.message || 'Eroare la salvarea profilului' })
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteAccount = async () => {
        setDeleting(true)
        
        try {
            const { data: { user } } = await supabase.auth.getUser()
            
            if (!user) {
                router.push('/login')
                return
            }

            // Șterge toate cererile utilizatorului
            await supabase
                .from('requests')
                .delete()
                .eq('citizen_id', user.id)

            // Șterge profilul
            await supabase
                .from('profiles')
                .delete()
                .eq('id', user.id)

            // Logout și redirecționare
            await supabase.auth.signOut()
            router.push('/')
        } catch (error: any) {
            console.error('Delete error:', error)
            setMessage({ type: 'error', text: 'Eroare la ștergerea contului' })
            setDeleting(false)
        }
    }

    if (loading) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Se încarcă...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-purple-700">Profilul Meu</h1>
                    <p className="text-gray-600 mt-1">
                        Gestionează informațiile personale și setările contului tău
                    </p>
                </div>

                {/* Message */}
                {message && (
                    <div className={`rounded-lg p-4 ${
                        message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                        <p className={`text-sm ${
                            message.type === 'success' ? 'text-green-800' : 'text-red-800'
                        }`}>
                            {message.text}
                        </p>
                    </div>
                )}

                {/* Informații Personale */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Informații Personale</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nume Complet <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={profile.full_name}
                                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={profile.email}
                                disabled
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 mt-1">Email-ul nu poate fi modificat</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Telefon
                            </label>
                            <input
                                type="tel"
                                value={profile.phone || ''}
                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                placeholder="+40 123 456 789"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Adresă
                            </label>
                            <input
                                type="text"
                                value={profile.address || ''}
                                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                placeholder="Str. Exemplu nr. 1, Bl. A, Sc. B, Ap. 10"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Oraș
                            </label>
                            <input
                                type="text"
                                value={profile.city || ''}
                                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                                placeholder="Timișoara"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                            {saving ? 'Se salvează...' : 'Salvează Modificările'}
                        </button>
                        <button
                            onClick={loadProfile}
                            disabled={saving}
                            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                            Anulează
                        </button>
                    </div>
                </div>

                {/* Securitate */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Securitate și Confidențialitate</h2>
                    
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                            <svg className="w-5 h-5 text-purple-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <div>
                                <h3 className="font-semibold text-gray-900 text-sm">Schimbă Parola</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Pentru a schimba parola, vei primi un email cu instrucțiuni.
                                </p>
                                <button
                                    onClick={async () => {
                                        try {
                                            await supabase.auth.resetPasswordForEmail(profile.email, {
                                                redirectTo: `${window.location.origin}/reset-password`,
                                            })
                                            setMessage({ type: 'success', text: 'Email trimis! Verifică inbox-ul.' })
                                        } catch (error) {
                                            setMessage({ type: 'error', text: 'Eroare la trimiterea emailului' })
                                        }
                                    }}
                                    className="mt-3 px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors text-sm font-medium"
                                >
                                    Trimite Email pentru Reset Parolă
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Zona Periculoasă */}
                <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
                    <h2 className="text-xl font-semibold text-red-700 mb-4">Zonă Periculoasă</h2>
                    
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
                            <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 text-sm">Șterge Contul</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Odată șters, contul nu poate fi recuperat. Toate datele tale, inclusiv cererile și documentele, vor fi șterse permanent.
                                </p>
                                {!showDeleteConfirm ? (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                                    >
                                        Șterge Contul Meu
                                    </button>
                                ) : (
                                    <div className="mt-3 space-y-3">
                                        <p className="text-sm font-semibold text-red-700">
                                            Ești sigur? Această acțiune este PERMANENTĂ!
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleDeleteAccount}
                                                disabled={deleting}
                                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors text-sm font-medium"
                                            >
                                                {deleting ? 'Se șterge...' : 'Da, șterge definitiv'}
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteConfirm(false)}
                                                disabled={deleting}
                                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                                            >
                                                Anulează
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
