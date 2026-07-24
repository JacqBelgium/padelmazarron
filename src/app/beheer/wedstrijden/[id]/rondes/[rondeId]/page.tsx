'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'

interface SpelerInfo { id: string; voornaam: string; achternaam: string }
interface SetInfo {
  id: string; set_nummer: number
  team1_speler1_id: string; team1_speler2_id: string
  team2_speler1_id: string; team2_speler2_id: string
  games_team1: number | null; games_team2: number | null
}
interface GroepInfo { id: string; baan_nummer: number; spelers: SpelerInfo[]; sets: SetInfo[] }

export default function RondeUitslagPage() {
  const [groepen, setGroepen] = useState<GroepInfo[]>([])
  const [rondeNummer, setRondeNummer] = useState(0)
  const [laden, setLaden] = useState(true)
  const [opslaan, setOpslaan] = useState<string | null>(null)
  const params = useParams()
  const supabase = createClient()

  useEffect(() => { laadData() }, [])

  async function laadData() {
    const { data: ronde } = await supabase.from('rondes').select('ronde_nummer').eq('id', params.rondeId).single()
    setRondeNummer(ronde?.ronde_nummer ?? 0)
    const { data: groepenData } = await supabase.from('groepen').select('id, baan_nummer').eq('ronde_id', params.rondeId).order('baan_nummer')
    const volledigeGroepen: GroepInfo[] = []
    for (const groep of groepenData ?? []) {
      const { data: groepSpelers } = await supabase.from('groep_spelers').select('spelers(id, voornaam, achternaam)').eq('groep_id', groep.id)
      const spelers = (groepSpelers ?? []).map((gs: any) => gs.spelers).filter(Boolean)
      const { data: setsData } = await supabase.from('sets').select('*').eq('groep_id', groep.id).order('set_nummer')
      volledigeGroepen.push({ id: groep.id, baan_nummer: groep.baan_nummer, spelers, sets: setsData ?? [] })
    }
    setGroepen(volledigeGroepen)
    setLaden(false)
  }

  function naamVan(spelers: SpelerInfo[], id: string) {
    const s = spelers.find(sp => sp.id === id)
    return s ? `${s.voornaam} ${s.achternaam}` : '?'
  }

  async function updateSet(setId: string, games_team1: number, games_team2: number) {
    setOpslaan(setId)
    await supabase.from('sets').update({ games_team1, games_team2, ingevoerd_op: new Date().toISOString() }).eq('id', setId)
    setOpslaan(null)
    laadData()
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
        <a href={`/beheer/wedstrijden/${params.id}/schema`} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px' }}>← Schedule</a>
      </nav>

      <div style={{ background: '#0A1628', padding: '32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <p style={{ color: '#E8C547', fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Admin</p>
          <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>Round {rondeNummer} — Enter results</h1>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {groepen.map(groep => (
          <div key={groep.id} style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ background: '#0A1628', padding: '12px 20px' }}>
              <span style={{ color: '#E8C547', fontWeight: 700, fontSize: '13px' }}>Court {groep.baan_nummer}</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginLeft: '12px' }}>
                {groep.spelers.map(s => `${s.voornaam} ${s.achternaam}`).join(' · ')}
              </span>
            </div>
            <div>
              {groep.sets.map((set, i) => (
                <SetRij
                  key={set.id}
                  set={set}
                  spelers={groep.spelers}
                  naamVan={naamVan}
                  opslaan={opslaan === set.id}
                  isEven={i % 2 === 0}
                  onOpslaan={(g1, g2) => updateSet(set.id, g1, g2)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}

function SetRij({ set, spelers, naamVan, opslaan, isEven, onOpslaan }: {
  set: SetInfo; spelers: SpelerInfo[]
  naamVan: (spelers: SpelerInfo[], id: string) => string
  opslaan: boolean; isEven: boolean
  onOpslaan: (g1: number, g2: number) => void
}) {
  const [g1, setG1] = useState(set.games_team1?.toString() ?? '')
  const [g2, setG2] = useState(set.games_team2?.toString() ?? '')
  const team1 = `${naamVan(spelers, set.team1_speler1_id)} & ${naamVan(spelers, set.team1_speler2_id)}`
  const team2 = `${naamVan(spelers, set.team2_speler1_id)} & ${naamVan(spelers, set.team2_speler2_id)}`
  const opgeslagen = set.games_team1 !== null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: '1px solid #F9FAFB', background: isEven ? '#ffffff' : '#FAFAFA', flexWrap: 'wrap' }}>
      <span style={{ color: '#9CA3AF', fontSize: '12px', fontWeight: 700, minWidth: '45px' }}>Set {set.set_nummer}</span>
      <span style={{ fontSize: '13px', color: '#374151', flex: 1, minWidth: '120px' }}>{team1}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input type="number" min={0} max={7} value={g1} onChange={e => setG1(e.target.value)}
          style={{ width: '52px', padding: '6px 8px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '15px', textAlign: 'center', fontWeight: 700 }} />
        <span style={{ color: '#9CA3AF', fontWeight: 700 }}>—</span>
        <input type="number" min={0} max={7} value={g2} onChange={e => setG2(e.target.value)}
          style={{ width: '52px', padding: '6px 8px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '15px', textAlign: 'center', fontWeight: 700 }} />
      </div>
      <span style={{ fontSize: '13px', color: '#374151', flex: 1, minWidth: '120px', textAlign: 'right' }}>{team2}</span>
      <button
        onClick={() => onOpslaan(+g1, +g2)}
        disabled={opslaan || g1 === '' || g2 === ''}
        style={{
          background: opgeslagen ? '#DCFCE7' : '#E8C547',
          color: opgeslagen ? '#166534' : '#0A1628',
          padding: '6px 16px', borderRadius: '6px', border: 'none',
          fontWeight: 700, fontSize: '12px', cursor: 'pointer',
          opacity: opslaan ? 0.7 : 1,
        }}
      >
        {opslaan ? '...' : opgeslagen ? '✓ Saved' : 'Save'}
      </button>
    </div>
  )
}