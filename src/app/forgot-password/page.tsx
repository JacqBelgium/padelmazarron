'use client'

import { FormEvent, useMemo, useState } from 'react'
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

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState('')
  const [laden, setLaden] = useState(false)
  const [succes, setSucces] = useState(false)
  const [fout, setFout] = useState('')

  async function verstuurResetLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLaden(true)
    setFout('')
    setSucces(false)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://comp.racketcomp.eu/reset-password',
      })

      if (error) throw error
      setSucces(true)
    } catch (error) {
      console.error('Password reset email error:', error)
      setFout(error instanceof Error ? error.message : 'Could not send the reset link. Please try again.')
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
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0 }}>Reset your password</p>
      </div>

      <section style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px', boxSizing: 'border-box' }}>
        <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, margin: '0 0 12px' }}>Forgot password?</h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px' }}>
          Enter your email address and we’ll send you a link to reset your password.
        </p>

        <form onSubmit={verstuurResetLink}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="email" style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.5px' }}>EMAIL</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
              style={fieldStyle}
            />
          </div>

          {fout && (
            <div role="alert" style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#FCA5A5', fontSize: '14px' }}>
              {fout}
            </div>
          )}

          {succes && (
            <div role="status" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#86EFAC', fontSize: '14px' }}>
              Check your email for a password reset link.
            </div>
          )}

          <button type="submit" disabled={laden} style={{ width: '100%', padding: '14px', background: '#E8C547', color: '#0A1628', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '15px', cursor: laden ? 'not-allowed' : 'pointer', opacity: laden ? 0.7 : 1 }}>
            {laden ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      </section>

      <a href="/login" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px', marginTop: '24px' }}>
        ← Back to sign in
      </a>
    </main>
  )
}
