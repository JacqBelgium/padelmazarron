'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TenantNav from '@/components/TenantNav'

const fieldStyle = {
  width: '100%',
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

export default function ProfielPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [laden, setLaden] = useState(true)
  const [opslaan, setOpslaan] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [succes, setSucces] = useState('')
  const [fout, setFout] = useState('')

  useEffect(() => {
    async function controleerGebruiker() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          router.replace('/login')
          return
        }
      } catch (error) {
        console.error('Could not verify profile session:', error)
        router.replace('/login')
      } finally {
        setLaden(false)
      }
    }

    void controleerGebruiker()
  }, [router, supabase])

  async function wijzigWachtwoord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFout('')
    setSucces('')

    if (newPassword.length < 8) {
      setFout('Password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setFout('Passwords do not match.')
      return
    }

    setOpslaan(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setSucces('Password updated successfully.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Password update error:', error)
      setFout(error instanceof Error ? error.message : 'Could not update your password. Please try again.')
    } finally {
      setOpslaan(false)
    }
  }

  if (laden) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', background: '#0A1628' }}>
        <div style={{ color: '#E8C547' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>
      <TenantNav back={{ href: '/beheer', label: 'Dashboard' }} />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ background: '#0A1628', borderRadius: '14px', padding: '32px', marginBottom: '24px' }}>
          <p style={{ color: '#E8C547', fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 8px' }}>PROFILE</p>
          <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>Change password</h1>
        </div>

        <section style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '32px', maxWidth: '520px' }}>
          <form onSubmit={wijzigWachtwoord}>
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="new-password" style={{ display: 'block', color: '#4B5563', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>New password</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                style={{ ...fieldStyle, background: '#F9FAFB', border: '1px solid #D1D5DB', color: '#111827' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="confirm-new-password" style={{ display: 'block', color: '#4B5563', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Confirm new password</label>
              <input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                style={{ ...fieldStyle, background: '#F9FAFB', border: '1px solid #D1D5DB', color: '#111827' }}
              />
            </div>

            {fout && (
              <div role="alert" style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#B91C1C', fontSize: '14px' }}>
                {fout}
              </div>
            )}

            {succes && (
              <div role="status" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#15803D', fontSize: '14px' }}>
                {succes}
              </div>
            )}

            <button type="submit" disabled={opslaan} style={{ width: '100%', padding: '14px', background: '#E8C547', color: '#0A1628', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '15px', cursor: opslaan ? 'not-allowed' : 'pointer', opacity: opslaan ? 0.7 : 1 }}>
              {opslaan ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
