'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function NieuweWedstrijdPage() {
  const [naam, setNaam] = useState('')
  const [datumVan, setDatumVan] = useState('')
  const [datumTot, setDatumTot] = useState('')
  const [locatie, setLocatie] = useState('')
  const [aantalBanen, setAantalBanen] = useState(4)
  const [schemaType, setSchemaType] = useState<'volledig' | 'kort'>('volledig')
  const [maxDeelnemers, setMaxDeelnemers] = useState(16)
  const [fout, setFout] = useState('')
  const [laden, setLaden] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleOpslaan(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)
    setFout('')

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
      naam, datum_van: datumVan,
      datum_tot: datumTot || null,
      locatie: locatie || null,
      aantal_banen: aantalBanen,
      speelformaat: 'mixed_roulerend',
      schema_type: schemaType,
      max_deelnemers: maxDeelnemers,
      status: 'Concept',
    })

    if (error) { setFout(`Error: ${error.message}`); setLaden(false) }
    else router.push('/beheer/wedstrijden')
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px',
    border: '1px solid #E5E7EB', borderRadius: '8px',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const,
    background: '#ffffff', color: '#0A1628',
  }
  const labelStyle = { display: 'block', color: '#374151', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>

      <nav style={{ background: '#0A1628', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#E8C547', fontWeight: 900, fontSize: '18px' }}>RacketComp</div>
        <a href="/beheer/wedstrijden" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px' }}>← Competitions</a>
      </nav>

      <div style={{ background: '#0A1628', padding: '32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p style={{ color: '#E8C547', fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Admin</p>
          <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>New competition</h1>
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '32px' }}>
          <form onSubmit={handleOpslaan}>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Competition name</label>
              <input type="text" value={naam} onChange={e => setNaam(e.target.value)} placeholder="e.g. Summer Competition 2026" style={inputStyle} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Start date</label>
                <input type="date" value={datumVan} onChange={e => setDatumVan(e.target.value)} style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>End date <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span></label>
                <input type="date" value={datumTot} onChange={e => setDatumTot(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Location <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span></label>
              <input type="text" value={locatie} onChange={e => setLocatie(e.target.value)} placeholder="e.g. Mazarron Padel Club" style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Number of courts</label>
                <input type="number" value={aantalBanen} onChange={e => setAantalBanen(+e.target.value)} min={1} max={10} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Max participants</label>
                <select value={maxDeelnemers} onChange={e => setMaxDeelnemers(+e.target.value)} style={inputStyle}>
                  {[4,8,12,16,20,24].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={labelStyle}>Schedule type</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { val: 'volledig', title: 'Full (15 rounds)', desc: 'Each pair meets 3 times — longer competition' },
                  { val: 'kort', title: 'Short (5 rounds)', desc: 'Each pair meets once — shorter tournament' },
                ].map(opt => (
                  <label key={opt.val} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '16px', border: `2px solid ${schemaType === opt.val ? '#1F5C99' : '#E5E7EB'}`, borderRadius: '8px', background: schemaType === opt.val ? '#EBF3FB' : '#ffffff' }}>
                    <input type="radio" value={opt.val} checked={schemaType === opt.val} onChange={() => setSchemaType(opt.val as 'volledig' | 'kort')} style={{ marginTop: '2px' }} />
                    <div>
                      <div style={{ fontWeight: 700, color: '#0A1628', fontSize: '14px' }}>{opt.title}</div>
                      <div style={{ color: '#9CA3AF', fontSize: '13px', marginTop: '2px' }}>{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {fout && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#DC2626', fontSize: '14px' }}>
                {fout}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" disabled={laden} style={{ background: '#E8C547', color: '#0A1628', padding: '12px 28px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
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