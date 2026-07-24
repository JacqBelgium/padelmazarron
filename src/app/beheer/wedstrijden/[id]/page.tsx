'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import type { Wedstrijd, Speler, Deelname } from '@/types/database'

export default function WedstrijdBeheerPage() {
  const [wedstrijd, setWedstrijd] = useState<Wedstrijd | null>(null)
  const [alleSpelers, setAlleSpelers] = useState<Speler[]>([])
  const [deelnames, setDeelnames] = useState<Deelname[]>([])
  const [geselecteerd, setGeselecteerd] = useState<Set<string>>(new Set())
  const [laden, setLaden] = useState(true)
  const [opslaan, setOpslaan] = useState(false)
  const [bericht, setBericht] = useState('')
  const [fout, setFout] = useState('')
  const params = useParams()
  const supabase = createClient()
  const id = params.id as string

  useEffect(() => { laadData() }, [])

  async function laadData() {
    const [{ data: w }, { data: s }, { data: d }] = await Promise.all([
      supabase.from('wedstrijden').select('*').eq('id', id).single(),
      supabase.from('spelers').select('*').eq('status', 'Actief').order('achternaam'),
      supabase.from('deelnames').select('*').eq('wedstrijd_id', id),
    ])
    setWedstrijd(w)
    setAlleSpelers(s ?? [])
    setDeelnames(d ?? [])
    const ids = new Set((d ?? []).map((x: Deelname) => x.speler_id))
    setGeselecteerd(ids)
    setLaden(false)
  }

  function toggleSpeler(sid: string) {
    if (wedstrijd?.status !== 'Concept') return
    setGeselecteerd(prev => {
      const n = new Set(prev)
      if (n.has(sid)) n.delete(sid); else n.add(sid)
      return n
    })
    setFout(''); setBericht('')
  }

  async function handleKlaar() {
    const aantal = geselecteerd.size
    if (aantal === 0) { setFout('Select at least 4 players.'); return }
    if (aantal % 4 !== 0) { setFout(`${aantal} players selected — must be divisible by 4.`); return }
    setOpslaan(true); setFout('')
    await supabase.from('deelnames').delete().eq('wedstrijd_id', id)
    const nieuweDeelnames = [...geselecteerd].map(speler_id => ({
      wedstrijd_id: id, speler_id, uitnodiging_status: 'bevestigd' as const,
    }))
    const { error } = await supabase.from('deelnames').insert(nieuweDeelnames)
    if (error) { setFout(`Error: ${error.message}`) }
    else { setBericht(`✓ ${aantal} participants saved!`); laadData() }
    setOpslaan(false)
  }

  async function activeerWedstrijd() {
    setOpslaan(true)
    const { error } = await supabase.from('wedstrijden').update({ status: 'Actief' }).eq('id', id)
    if (!error) { setWedstrijd(prev => prev ? { ...prev, status: 'Actief' } : null); setBericht('✓ Competition activated!') }
    setOpslaan(false)
  }

  async function genereerSchemaActie() {
    setOpslaan(true); setFout(''); setBericht('')
    const response = await fetch('/api/schema/genereer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wedstrijd_id: id }),
    })
    const data = await response.json()
    if (data.fout) setFout(`Error: ${data.fout}`)
    else setBericht(`✓ Schedule generated! ${data.rondes} rounds for ${data.spelers} players.`)
    setOpslaan(false)
  }

  if (laden) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', background: '#0A1628' }}>
      <div style={{ color: '#E8C547' }}>Loading...</div>
    </div>
  )
  if (!wedstrijd) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>Not found.</div>

  const aantal = geselecteerd.size
  const deelbaarDoor4 = aantal > 0 && aantal % 4 === 0

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>

      <nav style={{ background: '#0A1628', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#E8C547', fontWeight: 900, fontSize: '18px' }}>RacketComp</div>
        <a href="/beheer/wedstrijden" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px' }}>← Competitions</a>
      </nav>

      <div style={{ background: '#0A1628', padding: '32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ color: '#E8C547', fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Admin</p>
            <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 8px 0' }}>{wedstrijd.naam}</h1>
            <span style={{ background: wedstrijd.status === 'Actief' ? '#DCFCE7' : '#FEF9C3', color: wedstrijd.status === 'Actief' ? '#166534' : '#854D0E', padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
              {wedstrijd.status === 'Actief' ? 'Active' : wedstrijd.status === 'Afgesloten' ? 'Closed' : 'Draft'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {wedstrijd.status === 'Concept' && deelbaarDoor4 && deelnames.length === aantal && (
              <button onClick={activeerWedstrijd} disabled={opslaan} style={{ background: '#16A34A', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                ✓ Activate
              </button>
            )}
            {wedstrijd.status === 'Actief' && (
              <button onClick={genereerSchemaActie} disabled={opslaan} style={{ background: '#E8C547', color: '#0A1628', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                ⚡ Generate schedule
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px' }}>

        {/* Info */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Start date', value: wedstrijd.datum_van },
            { label: 'Format', value: 'Mixed rotating' },
            { label: 'Schedule', value: wedstrijd.schema_type === 'volledig' ? '15 rounds' : '5 rounds' },
            { label: 'Participants', value: `${deelnames.length} / ${wedstrijd.max_deelnemers}` },
          ].map(item => (
            <div key={item.label} style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px' }}>
              <p style={{ color: '#9CA3AF', fontSize: '12px', margin: '0 0 4px 0' }}>{item.label}</p>
              <p style={{ color: '#0A1628', fontWeight: 700, fontSize: '15px', margin: 0 }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Navigation */}
        {wedstrijd.status === 'Actief' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { href: `/beheer/wedstrijden/${id}/schema`, icon: '📋', title: 'Schedule', desc: 'View all rounds' },
              { href: `/beheer/wedstrijden/${id}/stand`, icon: '🏆', title: 'Standings', desc: 'Recalculate & view' },
              { href: `/stand/${id}`, icon: '🌐', title: 'Public page', desc: 'Standings + schedule' },
            ].map(item => (
              <a key={item.href} href={item.href} style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '20px', textDecoration: 'none', display: 'block' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
                <div style={{ color: '#0A1628', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{item.title}</div>
                <div style={{ color: '#9CA3AF', fontSize: '12px' }}>{item.desc}</div>
              </a>
            ))}
          </div>
        )}

        {bericht && <div style={{ background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#166534', fontSize: '14px', fontWeight: 600 }}>{bericht}</div>}
        {fout && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#DC2626', fontSize: '14px' }}>⚠ {fout}</div>}

        {/* Participants */}
        <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: '#0A1628', fontWeight: 800, fontSize: '15px', margin: 0 }}>Participants</h2>
            <span style={{ color: deelbaarDoor4 ? '#16A34A' : '#9CA3AF', fontSize: '13px', fontWeight: 600 }}>
              {aantal} selected {deelbaarDoor4 ? '✓' : aantal > 0 ? `(${4 - (aantal % 4)} more needed)` : ''}
            </span>
          </div>
          <div>
            {alleSpelers.map((speler, i) => (
              <label key={speler.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', borderBottom: '1px solid #F9FAFB', background: i % 2 === 0 ? '#ffffff' : '#FAFAFA', cursor: wedstrijd.status === 'Concept' ? 'pointer' : 'default' }}>
                <input type="checkbox" checked={geselecteerd.has(speler.id)} onChange={() => toggleSpeler(speler.id)} disabled={wedstrijd.status !== 'Concept'} style={{ width: '16px', height: '16px', accentColor: '#1F5C99' }} />
                <span style={{ fontWeight: 600, color: '#0A1628', fontSize: '14px', flex: 1 }}>{speler.voornaam} {speler.achternaam}</span>
                <span style={{ color: '#9CA3AF', fontSize: '12px' }}>{speler.geslacht === 'M' ? 'Man' : 'Woman'}</span>
              </label>
            ))}
          </div>
          {wedstrijd.status === 'Concept' && (
            <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: '12px' }}>
              <button onClick={handleKlaar} disabled={opslaan || aantal === 0} style={{ background: '#1F5C99', color: '#ffffff', padding: '10px 24px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                {opslaan ? 'Saving...' : `Save participants (${aantal})`}
              </button>
              <button onClick={() => { setGeselecteerd(new Set()); setFout(''); setBericht('') }} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', fontSize: '14px', cursor: 'pointer' }}>
                Clear all
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}