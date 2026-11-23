'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import TenantNav from '@/components/TenantNav'
import { useTenantContext } from '@/lib/TenantContext'
import WedstrijdInstellingenVelden from '@/components/WedstrijdInstellingenVelden'
import { legeInstellingen, naarPayload, type InstellingenWaarden } from '@/lib/wedstrijd-instellingen'

export default function NieuweWedstrijdPage() {
  const [naam, setNaam] = useState('')
  const [locatie, setLocatie] = useState('')
  const [instellingen, setInstellingen] = useState<InstellingenWaarden>(legeInstellingen)
  const [fout, setFout] = useState('')
  const [laden, setLaden] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { primaryColor, secondaryColor } = useTenantContext()

  async function handleOpslaan(e: React.FormEvent) {
    e.preventDefault()
    setFout('')
    const resultaat = naarPayload(instellingen)
    if ('fout' in resultaat) { setFout(resultaat.fout); return }
    setLaden(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: gebruiker } = await supabase
      .from('gebruikers').select('club_id').eq('auth_id', user.id).single()

    if (!gebruiker?.club_id) {
      setFout('Club not found.')
      setLaden(false)
      return
    }

    const { error } = await supabase.from('wedstrijden').insert({
      club_id: gebruiker.club_id,
      naam,
      locatie: locatie || null,
      speelformaat: 'mixed_roulerend',
      ...resultaat.payload,
      status: 'Concept',
    })

    if (error) { setFout(`Error: ${error.message}`); setLaden(false) }
    else router.push('/beheer/wedstrijden')
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px',
    border: '1px solid #E5E7EB', borderRadius: '8px',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const,
    background: '#ffffff', color: primaryColor,
  }
  const labelStyle = { display: 'block', color: '#374151', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>

      <TenantNav back={{ href: '/beheer/wedstrijden', label: 'Competitions' }} />

      <div style={{ background: primaryColor, padding: '32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ color: secondaryColor, fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Admin</p>
          <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>New competition</h1>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '32px' }}>
          <form onSubmit={handleOpslaan}>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Competition name</label>
              <input type="text" value={naam} onChange={e => setNaam(e.target.value)} placeholder="e.g. Summer Competition 2026" style={inputStyle} required />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Location <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span></label>
              <input type="text" value={locatie} onChange={e => setLocatie(e.target.value)} placeholder="e.g. Mazarron Padel Club" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <WedstrijdInstellingenVelden
                waarden={instellingen}
                onChange={(veld, waarde) => setInstellingen(prev => ({ ...prev, [veld]: waarde }))}
                primaryColor={primaryColor}
              />
            </div>

            {fout && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#DC2626', fontSize: '14px' }}>
                {fout}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" disabled={laden} style={{ background: secondaryColor, color: primaryColor, padding: '12px 28px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
                {laden ? 'Creating...' : 'Create competition'}
              </button>
              <a href="/beheer/wedstrijden" style={{ padding: '12px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', color: '#6B7280', background: '#F3F4F6' }}>
                Cancel
              </a>
            </div>

          </form>
        </div>
      </div>

    </div>
  )
}