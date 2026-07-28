'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useDemo } from '@/lib/useDemo'

export default function NieuweSpelerPage() {
  const [voornaam, setVoornaam] = useState('')
  const [achternaam, setAchternaam] = useState('')
  const [geslacht, setGeslacht] = useState<'M' | 'V'>('M')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [fout, setFout] = useState('')
  const [laden, setLaden] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { isDemo } = useDemo()

  async function handleOpslaan(e: React.FormEvent) {
    e.preventDefault()
    if (isDemo) return
    setLaden(true)
    setFout('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: gebruiker } = await supabase
      .from('gebruikers').select('club_id').eq('auth_id', user.id).single()

    if (!gebruiker?.club_id) {
      setFout('Club not found. Contact the administrator.')
      setLaden(false)
      return
    }

    const { error } = await supabase.from('spelers').insert({
      club_id: gebruiker.club_id,
      voornaam, achternaam, geslacht, email,
      whatsapp: whatsapp || null,
      status: 'Actief',
      gdpr_toestemming: false,
    })

    if (error) { setFout(`Error: ${error.message}`); setLaden(false) }
    else router.push('/beheer/spelers')
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px',
    border: '1px solid #E5E7EB', borderRadius: '8px',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const,
    background: isDemo ? '#F9FAFB' : '#ffffff', color: '#0A1628',
  }
  const labelStyle = { display: 'block', color: '#374151', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>

      <nav style={{ background: '#0A1628', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#E8C547', fontWeight: 900, fontSize: '18px' }}>RacketComp</div>
        <a href="/beheer/spelers" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px' }}>← Players</a>
      </nav>

      {isDemo && (
        <div style={{ background: '#FEF9C3', borderBottom: '1px solid #FDE68A', padding: '10px 32px', textAlign: 'center' }}>
          <span style={{ color: '#854D0E', fontSize: '13px', fontWeight: 600 }}>🔍 Demo mode — read only. Adding players is not available in demo.</span>
        </div>
      )}

      <div style={{ background: '#0A1628', padding: '32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p style={{ color: '#E8C547', fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Admin</p>
          <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>Add player</h1>
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '32px' }}>
          <form onSubmit={handleOpslaan}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>First name</label>
                <input type="text" value={voornaam} onChange={e => setVoornaam(e.target.value)} style={inputStyle} required readOnly={isDemo} />
              </div>
              <div>
                <label style={labelStyle}>Last name</label>
                <input type="text" value={achternaam} onChange={e => setAchternaam(e.target.value)} style={inputStyle} required readOnly={isDemo} />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Gender</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                {[{ val: 'M', label: 'Man' }, { val: 'V', label: 'Woman' }].map(opt => (
                  <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isDemo ? 'not-allowed' : 'pointer', fontSize: '14px', color: '#374151' }}>
                    <input type="radio" value={opt.val} checked={geslacht === opt.val} onChange={() => !isDemo && setGeslacht(opt.val as 'M' | 'V')} disabled={isDemo} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required readOnly={isDemo} />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={labelStyle}>WhatsApp <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span></label>
              <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+32 ..." style={inputStyle} readOnly={isDemo} />
            </div>

            {fout && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#DC2626', fontSize: '14px' }}>
                {fout}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={laden || isDemo}
                style={{ background: isDemo ? '#E5E7EB' : '#E8C547', color: isDemo ? '#9CA3AF' : '#0A1628', padding: '12px 28px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '15px', cursor: isDemo ? 'not-allowed' : 'pointer' }}
              >
                {isDemo ? '🔒 Read only' : laden ? 'Saving...' : 'Save player'}
              </button>
              <a href="/beheer/spelers" style={{ padding: '12px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', color: '#6B7280', background: '#F3F4F6' }}>
                Back
              </a>
            </div>

          </form>
        </div>
      </div>

    </div>
  )
}