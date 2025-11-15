'use client'
import React, { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function AdminSystemSettings() {
  const [settings, setSettings] = useState({
    // Email notifications
    email_notifications_enabled: true,
    email_notifications_for_new_requests: true,
    email_notifications_for_urgent_deadlines: true,
    email_reminder_days_before_deadline: 3,

    // AI settings
    ai_auto_validation_enabled: true,
    ai_confidence_threshold: 0.85,
    ai_auto_assignment_enabled: false,

    // System settings
    legal_deadline_default_days: 30,
    max_file_upload_size_mb: 10,
    require_gdpr_consent: true,

    // Backup
    auto_backup_enabled: true,
    backup_frequency_days: 7
  })

  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    try {
      setSaving(true)
      // In production, save to database
      // For now, just simulate
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('✅ Setările au fost salvate cu succes!')
    } catch (error) {
      alert('Eroare la salvarea setărilor')
    } finally {
      setSaving(false)
    }
  }

  const handleBackupNow = async () => {
    if (!confirm('Sigur vrei să faci backup acum? Acest proces poate dura câteva minute.')) return

    try {
      alert('🔄 Backup în curs... (Funcționalitate în dezvoltare)')
      // Implement actual backup logic
    } catch (error) {
      alert('Eroare la backup')
    }
  }

  const handleSyncLegislation = async () => {
    if (!confirm('Vrei să sincronizezi baza de cunoștințe RAG cu ultima legislație?')) return

    try {
      alert('🔄 Sincronizare în curs... (Funcționalitate în dezvoltare)')
      // Implement actual sync logic with backend AI
    } catch (error) {
      alert('Eroare la sincronizare')
    }
  }

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Notificări Email</h3>
        <div className="space-y-4">
          <ToggleSetting
            label="Activează Notificări Email"
            description="Primește notificări pe email pentru evenimente importante"
            checked={settings.email_notifications_enabled}
            onChange={(checked) => setSettings({ ...settings, email_notifications_enabled: checked })}
          />
          <ToggleSetting
            label="Notificări pentru Cereri Noi"
            description="Primește email când este trimisă o cerere nouă"
            checked={settings.email_notifications_for_new_requests}
            onChange={(checked) => setSettings({ ...settings, email_notifications_for_new_requests: checked })}
            disabled={!settings.email_notifications_enabled}
          />
          <ToggleSetting
            label="Notificări pentru Termene Urgente"
            description="Alertează când cereri se apropie de termenul legal"
            checked={settings.email_notifications_for_urgent_deadlines}
            onChange={(checked) => setSettings({ ...settings, email_notifications_for_urgent_deadlines: checked })}
            disabled={!settings.email_notifications_enabled}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reminder Zile Înainte de Termen
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={settings.email_reminder_days_before_deadline}
              onChange={(e) => setSettings({ ...settings, email_reminder_days_before_deadline: parseInt(e.target.value) })}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
              disabled={!settings.email_notifications_enabled}
            />
            <p className="text-xs text-gray-500 mt-1">Primești notificare cu X zile înainte</p>
          </div>
        </div>
      </div>

      {/* AI Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Configurare AI</h3>
        <div className="space-y-4">
          <ToggleSetting
            label="Validare Automată AI"
            description="AI validează automat documentele încărcate (buletin, planuri, etc.)"
            checked={settings.ai_auto_validation_enabled}
            onChange={(checked) => setSettings({ ...settings, ai_auto_validation_enabled: checked })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prag de Încredere AI ({Math.round(settings.ai_confidence_threshold * 100)}%)
            </label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={settings.ai_confidence_threshold}
              onChange={(e) => setSettings({ ...settings, ai_confidence_threshold: parseFloat(e.target.value) })}
              className="w-full"
              disabled={!settings.ai_auto_validation_enabled}
            />
            <p className="text-xs text-gray-500 mt-1">
              AI acceptă documente doar dacă încrederea ≥ {Math.round(settings.ai_confidence_threshold * 100)}%
            </p>
          </div>
          <ToggleSetting
            label="Alocare Automată AI"
            description="AI distribuie automat cererile către funcționari (load balancing)"
            checked={settings.ai_auto_assignment_enabled}
            onChange={(checked) => setSettings({ ...settings, ai_auto_assignment_enabled: checked })}
          />
        </div>
      </div>

      {/* System Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Setări Sistem</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Termen Legal Implicit (zile)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={settings.legal_deadline_default_days}
              onChange={(e) => setSettings({ ...settings, legal_deadline_default_days: parseInt(e.target.value) })}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Termen legal implicit pentru cereri noi</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dimensiune Maximă Upload (MB)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.max_file_upload_size_mb}
              onChange={(e) => setSettings({ ...settings, max_file_upload_size_mb: parseInt(e.target.value) })}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Limită pentru fișiere încărcate de utilizatori</p>
          </div>
          <ToggleSetting
            label="Necesită Consimțământ GDPR"
            description="Utilizatorii trebuie să accepte GDPR la înregistrare"
            checked={settings.require_gdpr_consent}
            onChange={(checked) => setSettings({ ...settings, require_gdpr_consent: checked })}
          />
        </div>
      </div>

      {/* Backup & Maintenance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Backup & Mentenanță</h3>
        <div className="space-y-4">
          <ToggleSetting
            label="Backup Automat"
            description="Creează backup automat al bazei de date"
            checked={settings.auto_backup_enabled}
            onChange={(checked) => setSettings({ ...settings, auto_backup_enabled: checked })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frecvență Backup (zile)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={settings.backup_frequency_days}
              onChange={(e) => setSettings({ ...settings, backup_frequency_days: parseInt(e.target.value) })}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
              disabled={!settings.auto_backup_enabled}
            />
            <p className="text-xs text-gray-500 mt-1">Backup se face automat la fiecare X zile</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleBackupNow}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              💾 Backup Acum
            </button>
            <button
              onClick={handleSyncLegislation}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              🔄 Sincronizare Legislație RAG
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
        >
          {saving ? 'Se salvează...' : '💾 Salvează Toate Setările'}
        </button>
      </div>
    </div>
  )
}

function ToggleSetting({ 
  label, 
  description, 
  checked, 
  onChange,
  disabled = false
}: { 
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className={`font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>{label}</p>
        <p className={`text-sm ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'peer-checked:bg-purple-600'
        }`}></div>
      </label>
    </div>
  )
}
