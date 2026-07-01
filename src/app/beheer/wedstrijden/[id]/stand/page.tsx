'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'

interface StandRij {
  speler_id: string
  naam: string
  geslacht: string
  totaal_games: number
  totaal_sets: number
  rondes_gespeeld: number
  positie: number
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

  useEffect(() => { laadData() }, [])

  async function laadData() {
    const { data: wedstrijd } = await supabase
      .from('wedstrijden')
      .select('naam')
      .eq('id', params.id)
      .maybeSingle()
    setWedstrijdNaam(wedstrijd?.naam ?? '')

    const { data: punten } = await supabase
      .from('punten')
      .select('speler_id, games_gewonnen, set_gewonnen, ronde_id, is_invaller, spelers(voornaam, achternaam, geslacht)')
      .eq('wedstrijd_id', params.id)
      .eq('is_invaller', false)

    if (!punten || punten.length === 0) {
      setLaden(false)
      return
    }

    // Groepeer per speler
    const map = new Map<string, StandRij>()
    const rondesPerSpeler = new Map<string, Set<string>>()

    for (const p of punten as any[]) {
      if (!map.has(p.speler_id)) {
        map.set(p.speler_id, {
          speler_id: p.speler_id,
          naam: `${p.spelers.voornaam} ${p.spelers.achternaam}`,
          geslacht: p.spelers.geslacht,
          totaal_games: 0,
          totaal_sets: 0,
          rondes_gespeeld: 0,
          positie: 0,
        })
        rondesPerSpeler.set(p.speler_id, new Set())
      }
      const rij = map.get(p.speler_id)!
      rij.totaal_games += p.games_gewonnen
      if (p.set_gewonnen) rij.totaal_sets += 1
      rondesPerSpeler.get(p.speler_id)!.add(p.ronde_id)
    }

    // Rondes gespeeld
    for (const [id, rondes] of rondesPerSpeler) {
      map.get(id)!.rondes_gespeeld = rondes.size
    }

    const sorteer = (a: StandRij, b: StandRij) =>
      b.totaal_games !== a.totaal_games
        ? b.totaal_games - a.totaal_games
        : b.totaal_sets - a.totaal_sets

    const alle = [...map.values()].sort(sorteer).map((r, i) => ({ ...r, positie: i + 1 }))

    setHeren(alle.filter(r => r.geslacht === 'M'))
    setDames(alle.filter(r => r.geslacht === 'V'))
    setLaden(false)
  }

  async function herbereken() {
    setBerekenen(true)
    setBericht('')
    const response = await fetch('/api/punten/bereken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wedstrijd_id: params.id }),
    })
    const data = await response.json()
    if (data.succes) {
      setBericht(`✓ ${data.sets_verwerkt} sets verwerkt, ${data.punten_aangemaakt} punten berekend`)
      laadData()
    } else {
      setBericht(`⚠ ${data.fout}`)
    }
    setBerekenen(false)
  }

  function StandTabel({ rijen, titel }: { rijen: StandRij[], titel: string }) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-800">{titel}</h2>
        </div>
        {rijen.length === 0 ? (
          <p className="px-6 py-4 text-gray-400 text-sm">Nog geen punten</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Speler</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rondes</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Sets gewonnen</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Games</th>
              </tr>
            </thead>
            <tbody>
              {rijen.map(rij => (
                <tr key={rij.speler_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-bold text-gray-400">{rij.positie}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-800">{rij.naam}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600">{rij.rondes_gespeeld}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600">{rij.totaal_sets}</td>
                  <td className="px-4 py-3 text-sm text-center font-semibold text-brand-500">{rij.totaal_games}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  if (laden) return <div className="min-h-screen flex items-center justify-center">Laden...</div>

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href={`/beheer/wedstrijden/${params.id}`} className="text-gray-400 hover:text-gray-600 text-sm">← Beheer</a>
          <h1 className="text-lg font-bold text-brand-500">Puntenstand — {wedstrijdNaam}</h1>
        </div>
        <button
          onClick={herbereken}
          disabled={berekenen}
          className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
        >
          {berekenen ? 'Berekenen...' : '🔄 Stand herberekenen'}
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {bericht && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm">
            {bericht}
          </div>
        )}

        <StandTabel rijen={heren} titel="🏆 Heren" />
        <StandTabel rijen={dames} titel="🏆 Dames" />
      </div>
    </main>
  )
}