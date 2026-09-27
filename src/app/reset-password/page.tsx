'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [laden, setLaden] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [succes, setSucces] = useState(false)
  const [fout, setFout] = useState('')

  useEffect(() => {
    let active = true

    async function processRecoveryToken() {
      try {
        const url = new URL(window.location.href)
        const query = url.searchParams
        const hash = new URLSearchParams(url.hash.replace(/^#/, ''))

        let { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          const code = query.get('code')
          const tokenHash = query.get('token_hash')
          const accessToken = hash.get('access_token')
          const refreshToken = hash.get('refresh_token')

          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) throw error
            session = data.session
          } else if (tokenHash && query.get('type') === 'recovery') {
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'recovery',
            })
            if (error) throw error
            session = data.session
          } else if (accessToken && refreshToken && hash.get('type') === 'recovery') {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            if (error) throw error
            session = data.session
          }
        }

        if (!session) {
          throw new Error('This password reset link is invalid or has expired. Request a new one.')
        }

        if (active) setTokenValid(true)
        window.history.replaceState(null, '', '/reset-password')
      } catch (error) {
        console.error('Password reset token error:', error)
        if (active) {
          setFout(error instanceof Error ? error.message : 'This reset link is invalid or has expired.')
        }
      } finally {
        if (active) setLaden(false)
      }
    }

    void processRecoveryToken()
    return () => { active = false }
  }, [supabase])

  async function setPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFout('')

    if (newPassword !== confirmPassword) {
      setFout('The passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setFout('Password must be at least 6 characters long.')
      return
    }

    setLaden(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setSucces(true)
      window.setTimeout(() => router.replace('/login'), 2000)
    } catch (error) {
      console.error('Password update error:', error)
      setFout(error instanceof Error ? error.message : 'Could not update your password. Please try again.')
    } finally {
      setLaden(false)
    }
  }

  return (
    <main style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#0A1628', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <a href="https://racketcomp.eu" aria-label="RacketComp home" style={{ display: 'inline-block', textDecoration: 'none', color: '#fff', fontWeight: 900, fontSize: '28px', letterSpacing: '-1px', marginBottom: '8px' }}>
          RacketComp
        </a>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0 }}>Choose a new password</p>
      </div>

      <section style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px', boxSizing: 'border-box' }}>
        <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, margin: '0 0 24px' }}>Set a new password</h1>

        {laden && !tokenValid && !fout && (
          <p role="status" style={{ color: '#E8C547', fontSize: '14px', margin: 0 }}>Verifying reset link...</p>
        )}

        {fout && (
          <div role="alert" style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#FCA5A5', fontSize: '14px' }}>
            {fout}
          </div>
        )}

        {succes && (
          <div role="status" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#86EFAC', fontSize: '14px' }}>
            Your password has been updated. Redirecting you to sign in...
          </div>
        )}

        {tokenValid && !succes && (
          <form onSubmit={setPassword}>
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="new-password" style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.5px' }}>NEW PASSWORD</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                style={fieldStyle}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="confirm-password" style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.5px' }}>CONFIRM PASSWORD</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                style={fieldStyle}
              />
            </div>

            <button type="submit" disabled={laden} style={{ width: '100%', padding: '14px', background: '#E8C547', color: '#0A1628', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '15px', cursor: laden ? 'not-allowed' : 'pointer', opacity: laden ? 0.7 : 1 }}>
              {laden ? 'Updating...' : 'Set new password'}
            </button>
          </form>
        )}
      </section>

      <a href="/login" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px', marginTop: '24px' }}>
        ← Back to sign in
      </a>
    </main>
  )
}
