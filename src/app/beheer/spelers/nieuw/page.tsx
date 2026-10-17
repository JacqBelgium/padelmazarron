'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import TenantNav from '@/components/TenantNav'
import { useTenantContext } from '@/lib/TenantContext'

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
  const { primaryColor, secondaryColor } = useTenantContext()

  async function handleOpslaan(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)
    setFout('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: gebruiker } = await supabase
      .from('gebruikers')
      .select('club_id')
      .eq('auth_id', user.id)
      .single()

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

    if (error) {
      setFout(`Error: ${error.message}`)
      setLaden(false)
    } else {
      router.push('/beheer/spelers')
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px',
    border: '1px solid #E5E7EB', borderRadius: '8px',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const,
    background: '#ffffff', color: primaryColor,
  }

  const labelStyle = {
    display: 'block', color: '#374151', fontSize: '13px',
    fontWeight: 600, marginBottom: '6px',
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>

      {/* Nav */}
      <TenantNav back={{ href: '/beheer/spelers', label: 'Players' }} />

      {/* Header */}
      <div style={{ background: primaryColor, padding: '32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p style={{ color: secondaryColor, fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Admin</p>
          <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>Add player</h1>
        </div>
      </div>

      {/* Form */}
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '32px' }}>
          <form onSubmit={handleOpslaan}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>First name</label>
                <input type="text" value={voornaam} onChange={e => setVoornaam(e.target.value)} style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Last name</label>
                <input type="text" value={achternaam} onChange={e => setAchternaam(e.target.value)} style={inputStyle} required />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Gender</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                {[{ val: 'M', label: 'Man' }, { val: 'V', label: 'Woman' }].map(opt => (
                  <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
                    <input type="radio" value={opt.val} checked={geslacht === opt.val} onChange={() => setGeslacht(opt.val as 'M' | 'V')} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={labelStyle}>WhatsApp <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span></label>
              <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+32 ..." style={inputStyle} />
            </div>

            {fout && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#DC2626', fontSize: '14px' }}>
                {fout}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={laden}
                style={{ background: secondaryColor, color: primaryColor, padding: '12px 28px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
              >
                {laden ? 'Saving...' : 'Save player'}
              </button>
              <a href="/beheer/spelers" style={{ padding: '12px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', color: '#6B7280', background: '#F3F4F6' }}>
                Cancel
              </a>
            </div>

          </form>
        </div>
      </div>

    </div>
  )
}