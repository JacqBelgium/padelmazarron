'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'

interface SpelerInfo { id: string; voornaam: string; achternaam: string }
interface GroepInfo { id: string; baan_nummer: number; spelers: SpelerInfo[] }
interface RondeInfo { id: string; ronde_nummer: number; status: string; groepen: GroepInfo[] }

export default function SchemaOverzichtPage() {
  const [rondes, setRondes] = useState<RondeInfo[]>([])
  const [wedstrijdNaam, setWedstrijdNaam] = useState('')
  const [laden, setLaden] = useState(true)
  const [alertBezig, setAlertBezig] = useState<string | null>(null)
  const [bericht, setBericht] = useState('')
  const params = useParams()
  const supabase = createClient()
  const wedstrijdId = params.id as string

  useEffect(() => { laadSchema() }, [])

  async function laadSchema() {
    const { data: wedstrijd } = await supabase.from('wedstrijden').select('naam').eq('id', wedstrijdId).maybeSingle()
    setWedstrijdNaam(wedstrijd?.naam ?? '')
    const { data: rondesData } = await supabase.from('rondes').select('id, ronde_nummer, status').eq('wedstrijd_id', wedstrijdId).order('ronde_nummer')
    if (!rondesData) { setLaden(false); return }
    const volledigeRondes: RondeInfo[] = []
    for (const ronde of rondesData) {
      const { data: groepenData } = await supabase.from('groepen').select('id, baan_nummer').eq('ronde_id', ronde.id).order('baan_nummer')
      const groepen: GroepInfo[] = []
      for (const groep of groepenData ?? []) {
        const { data: groepSpelers } = await supabase.from('groep_spelers').select('speler_id, spelers(id, voornaam, achternaam)').eq('groep_id', groep.id)
        const spelers = (groepSpelers ?? []).map((gs: any) => gs.spelers).filter(Boolean)
        groepen.push({ id: groep.id, baan_nummer: groep.baan_nummer, spelers })
      }
      volledigeRondes.push({ id: ronde.id, ronde_nummer: ronde.ronde_nummer, status: ronde.status, groepen })
    }
    setRondes(volledigeRondes)
    setLaden(false)
  }

  async function stuurAlert(rondeId: string, rondeNummer: number) {
    setAlertBezig(rondeId); setBericht('')
    const response = await fetch('/api/alerts/stuur', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wedstrijd_id: wedstrijdId, ronde_id: rondeId }),
    })
    const data = await response.json()
    if (data.succes) setBericht(`✓ Round ${rondeNummer}: ${data.emails_verzonden} reminders sent for ${data.groepen_zonder_uitslag} groups.`)
    else if (data.bericht) setBericht(`✓ Round ${rondeNummer}: ${data.bericht}`)
    else setBericht(`⚠ Error: ${data.fout}`)
    setAlertBezig(null)
  }

  if (laden) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', background: '#0A1628' }}>
      <div style={{ color: '#E8C547' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>

      <nav style={{ background: '#0A1628', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#E8C547', fontWeight: 900, fontSize: '18px' }}>RacketComp</div>
        <a href={`/beheer/wedstrijden/${wedstrijdId}`} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px' }}>← Competition</a>
      </nav>

      <div style={{ background: '#0A1628', padding: '32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <p style={{ color: '#E8C547', fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Admin</p>
          <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>Schedule — {wedstrijdNaam}</h1>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px' }}>
        {bericht && (
          <div style={{ background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#166534', fontSize: '14px', fontWeight: 600 }}>
            {bericht}
          </div>
        )}

        {rondes.map(ronde => (
          <div key={ronde.id} style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', marginBottom: '16px', overflow: 'hidden' }}>
            <div style={{ background: '#0A1628', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a href={`/beheer/wedstrijden/${wedstrijdId}/rondes/${ronde.id}`} style={{ color: '#E8C547', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
                Round {ronde.ronde_nummer} →
              </a>
              <button
                onClick={() => stuurAlert(ronde.id, ronde.ronde_nummer)}
                disabled={alertBezig === ronde.id}
                style={{ background: 'rgba(232,197,71,0.15)', border: '1px solid rgba(232,197,71,0.3)', color: '#E8C547', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                {alertBezig === ronde.id ? 'Sending...' : '📧 Send reminder'}
              </button>
            </div>
            <div>
              {ronde.groepen.map((groep, i) => (
                <div key={groep.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', padding: '12px 20px', borderBottom: '1px solid #F9FAFB', background: i % 2 === 0 ? '#ffffff' : '#FAFAFA', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#1F5C99' }}>Court {groep.baan_nummer}</span>
                  <span style={{ fontSize: '14px', color: '#374151' }}>
                    {groep.spelers.map(s => `${s.voornaam} ${s.achternaam}`).join('  ·  ')}
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