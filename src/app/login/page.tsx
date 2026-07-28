'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [fout, setFout] = useState('')
  const [laden, setLaden] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    if (searchParams.get('demo') === 'true') {
      setEmail('demo@racketcomp.eu')
      setWachtwoord('Demo2026!')
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)
    setFout('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord })
    if (error) { setFout('Invalid email or password.'); setLaden(false) }
    else { router.refresh(); router.push('/beheer') }
  }

  function vulDemoIn() {
    setEmail('demo@racketcomp.eu')
    setWachtwoord('Demo2026!')
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#0A1628', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>

      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <div style={{ color: '#E8C547', fontWeight: 900, fontSize: '28px', letterSpacing: '-1px', marginBottom: '8px' }}>RacketComp</div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0 }}>Admin login</p>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px' }}>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.5px' }}>EMAIL</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required autoComplete="off"
              style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#ffffff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.5px' }}>PASSWORD</label>
            <input
              type="password" value={wachtwoord} onChange={e => setWachtwoord(e.target.value)}
              placeholder="••••••••" required autoComplete="off"
              style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#ffffff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {fout && (
            <div style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#FCA5A5', fontSize: '14px' }}>
              {fout}
            </div>
          )}

          <button type="submit" disabled={laden} style={{ width: '100%', padding: '14px', background: '#E8C547', color: '#0A1628', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '15px', cursor: laden ? 'not-allowed' : 'pointer', opacity: laden ? 0.7 : 1 }}>
            {laden ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Demo sectie */}
        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', textAlign: 'center', marginBottom: '12px' }}>
            Want to explore the admin panel first?
          </p>
          <button
            onClick={vulDemoIn}
            style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid rgba(232,197,71,0.3)', borderRadius: '8px', color: '#E8C547', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
          >
            🔍 Try demo — fill in credentials
          </button>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', textAlign: 'center', marginTop: '8px' }}>
            demo@racketcomp.eu · Demo2026!
          </p>
        </div>
      </div>

      <a href="/" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: '13px', marginTop: '24px' }}>
        ← Back to RacketComp
      </a>

    </div>
  )
}