'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'

interface StandRij {
  speler_id: string; naam: string; geslacht: string
  totaal_games: number; totaal_sets: number; rondes_gespeeld: number; positie: number
}

export default function PuntenstandPage() {
  const [heren, setHeren] = useState<StandRij[]>([])
  const [dames, setDames] = useState<StandRij[]>([])
  const [wedstrijdNaam, setWedstrijdNaam] = useState('')
  const [laden, setLaden] = useState(true)
  const [berekenen, setBerekenen] = useState(false)
  const [bericht, setBericht] = useState('')
  const params = useParams()
  const supabase = createClient()
  const id = params.id as string

  useEffect(() => { laadData() }, [])

  async function laadData() {
    const { data: wedstrijd } = await supabase.from('wedstrijden').select('naam').eq('id', id).maybeSingle()
    setWedstrijdNaam(wedstrijd?.naam ?? '')
    const { data: punten } = await supabase
      .from('punten')
      .select('speler_id, games_gewonnen, set_gewonnen, ronde_id, is_invaller, spelers(voornaam, achternaam, geslacht)')
      .eq('wedstrijd_id', id).eq('is_invaller', false)
    if (!punten || punten.length === 0) { setLaden(false); return }
    const map = new Map<string, StandRij>()
    const rondesPerSpeler = new Map<string, Set<string>>()
    for (const p of punten as any[]) {
      if (!map.has(p.speler_id)) {
        map.set(p.speler_id, { speler_id: p.speler_id, naam: `${p.spelers.voornaam} ${p.spelers.achternaam}`, geslacht: p.spelers.geslacht, totaal_games: 0, totaal_sets: 0, rondes_gespeeld: 0, positie: 0 })
        rondesPerSpeler.set(p.speler_id, new Set())
      }
      const rij = map.get(p.speler_id)!
      rij.totaal_games += p.games_gewonnen
      if (p.set_gewonnen) rij.totaal_sets += 1
      rondesPerSpeler.get(p.speler_id)!.add(p.ronde_id)
    }
    for (const [sid, rondes] of rondesPerSpeler) map.get(sid)!.rondes_gespeeld = rondes.size
    const sorteer = (a: StandRij, b: StandRij) => b.totaal_games !== a.totaal_games ? b.totaal_games - a.totaal_games : b.totaal_sets - a.totaal_sets
    const alle = [...map.values()].sort(sorteer).map((r, i) => ({ ...r, positie: i + 1 }))
    setHeren(alle.filter(r => r.geslacht === 'M'))
    setDames(alle.filter(r => r.geslacht === 'V'))
    setLaden(false)
  }

  async function herbereken() {
    setBerekenen(true); setBericht('')
    const response = await fetch('/api/punten/bereken', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wedstrijd_id: id }),
    })
    const data = await response.json()
    if (data.succes) { setBericht(`✓ ${data.sets_verwerkt} sets processed, ${data.punten_aangemaakt} points calculated.`); laadData() }
    else setBericht(`⚠ ${data.fout}`)
    setBerekenen(false)
  }

  function StandTabel({ rijen, titel }: { rijen: StandRij[], titel: string }) {
    return (
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ color: '#0A1628', fontWeight: 800, fontSize: '16px', marginBottom: '12px' }}>{titel}</h2>
        {rijen.length === 0 ? (
          <p style={{ color: '#9CA3AF', fontSize: '14px' }}>No results yet.</p>
        ) : (
          <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0A1628' }}>
                  {['#', 'Player', 'Rounds', 'Sets won', 'Games'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: h === '#' || h === 'Rounds' || h === 'Sets won' || h === 'Games' ? 'center' : 'left', color: '#E8C547', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rijen.map((rij, i) => (
                  <tr key={rij.speler_id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#ffffff' : '#F9FAFB' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#9CA3AF', fontSize: '14px' }}>{rij.positie}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0A1628', fontSize: '14px' }}>{rij.naam}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>{rij.rondes_gespeeld}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>{rij.totaal_sets}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#1F5C99', fontSize: '16px' }}>{rij.totaal_games}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
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
        <a href={`/beheer/wedstrijden/${id}`} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px' }}>← Competition</a>
      </nav>

      <div style={{ background: '#0A1628', padding: '32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ color: '#E8C547', fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Admin</p>
            <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>Standings — {wedstrijdNaam}</h1>
          </div>
          <button onClick={herbereken} disabled={berekenen} style={{ background: '#E8C547', color: '#0A1628', padding: '10px 24px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
            {berekenen ? 'Calculating...' : '🔄 Recalculate'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px' }}>
        {bericht && (
          <div style={{ background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', color: '#166534', fontSize: '14px', fontWeight: 600 }}>
            {bericht}
          </div>
        )}
        <StandTabel rijen={heren} titel="🏆 Men" />
        <StandTabel rijen={dames} titel="🏆 Women" />
      </div>

    </div>
  )
}