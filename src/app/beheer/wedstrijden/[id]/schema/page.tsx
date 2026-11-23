'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import TenantNav from '@/components/TenantNav'
import { useTenantContext } from '@/lib/TenantContext'
import { laadMatches, periode, rondeStatusLabel, teamsTekst, uitkomstTekst, type MatchInfo } from '@/lib/ronde-weergave'

interface RondeInfo {
  id: string; ronde_nummer: number; status: string
  start_datum: string | null; eind_datum: string | null
  matches: MatchInfo[]
}

export default function SchemaOverzichtPage() {
  const [rondes, setRondes] = useState<RondeInfo[]>([])
  const [wedstrijdNaam, setWedstrijdNaam] = useState('')
  const [laden, setLaden] = useState(true)
  const [alertBezig, setAlertBezig] = useState<string | null>(null)
  const [bericht, setBericht] = useState('')
  const [laadFout, setLaadFout] = useState('')
  const params = useParams()
  const supabase = createClient()
  const { primaryColor, secondaryColor } = useTenantContext()
  const wedstrijdId = params.id as string

  useEffect(() => { laadSchema() }, [])

  async function laadSchema() {
    const { data: wedstrijd } = await supabase.from('wedstrijden').select('naam').eq('id', wedstrijdId).maybeSingle()
    setWedstrijdNaam(wedstrijd?.naam ?? '')
    const { data: rondesData, error: rondesFout } = await supabase
      .from('rondes')
      .select('id, ronde_nummer, status, start_datum, eind_datum')
      .eq('wedstrijd_id', wedstrijdId)
      .order('ronde_nummer')
    if (rondesFout || !rondesData) { setLaadFout('Could not load the schedule.'); setLaden(false); return }

    const { matches, fout } = await laadMatches(supabase, rondesData.map(r => r.id))
    if (fout) setLaadFout('Could not load the matches.')
    setRondes(rondesData.map(r => ({ ...r, matches: matches.filter(m => m.ronde_id === r.id) })))
    setLaden(false)
  }

  async function stuurAlert(rondeId: string, rondeNummer: number) {
    setAlertBezig(rondeId); setBericht('')
    const response = await fetch('/api/alerts/stuur', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wedstrijd_id: wedstrijdId, ronde_id: rondeId }),
    })
    const data = await response.json()
    if (data.succes) setBericht(`✓ Round ${rondeNummer}: ${data.emails_verzonden} reminders sent for ${data.groepen_zonder_uitslag} matches without a result.`)
    else if (data.bericht) setBericht(`✓ Round ${rondeNummer}: ${data.bericht}`)
    else setBericht(`⚠ Error: ${data.fout}`)
    setAlertBezig(null)
  }

  if (laden) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', background: primaryColor }}>
      <div style={{ color: secondaryColor }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>

      <TenantNav back={{ href: `/beheer/wedstrijden/${wedstrijdId}`, label: 'Competition' }} />

      <div style={{ background: primaryColor, padding: '32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <p style={{ color: secondaryColor, fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Admin</p>
          <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>Schedule — {wedstrijdNaam}</h1>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px' }}>
        {bericht && (
          <div style={{ background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#166534', fontSize: '14px', fontWeight: 600 }}>
            {bericht}
          </div>
        )}

        {laadFout && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#DC2626', fontSize: '14px' }}>
            ⚠ {laadFout}
          </div>
        )}

        {rondes.map(ronde => (
          <div key={ronde.id} style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', marginBottom: '16px', overflow: 'hidden' }}>
            <div style={{ background: primaryColor, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                <a href={`/beheer/wedstrijden/${wedstrijdId}/rondes/${ronde.id}`} style={{ color: secondaryColor, fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
                  Round {ronde.ronde_nummer} →
                </a>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{periode(ronde.start_datum, ronde.eind_datum)}</span>
                <span style={{ background: 'rgba(255,255,255,0.12)', color: '#ffffff', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>{rondeStatusLabel(ronde.status)}</span>
              </div>
              <button
                onClick={() => stuurAlert(ronde.id, ronde.ronde_nummer)}
                disabled={alertBezig === ronde.id}
                style={{ background: 'rgba(232,197,71,0.15)', border: '1px solid rgba(232,197,71,0.3)', color: secondaryColor, padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                {alertBezig === ronde.id ? 'Sending...' : '📧 Send reminder'}
              </button>
            </div>
            <div>
              {ronde.matches.map((match, i) => (
                <div key={match.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: '12px', padding: '12px 20px', borderBottom: '1px solid #F9FAFB', background: i % 2 === 0 ? '#ffffff' : '#FAFAFA', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#1F5C99' }}>Match {match.baan_nummer}</span>
                  <span style={{ fontSize: '14px', color: '#374151' }}>{teamsTekst(match)}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: !match.status || match.status === 'gepland' || match.status === 'gespeeld' ? '#166534' : '#9A3412', whiteSpace: 'nowrap' }}>
                    {uitkomstTekst(match)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}