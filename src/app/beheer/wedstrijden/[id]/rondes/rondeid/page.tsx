'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'

interface SpelerInfo {
  id: string
  voornaam: string
  achternaam: string
}

interface SetInfo {
  id: string
  set_nummer: number
  team1_speler1_id: string
  team1_speler2_id: string
  team2_speler1_id: string
  team2_speler2_id: string
  games_team1: number | null
  games_team2: number | null
}

interface GroepInfo {
  id: string
  baan_nummer: number
  spelers: SpelerInfo[]
  sets: SetInfo[]
}

export default function RondeUitslagPage() {
  const [groepen, setGroepen] = useState<GroepInfo[]>([])
  const [rondeNummer, setRondeNummer] = useState(0)
  const [laden, setLaden] = useState(true)
  const [opslaan, setOpslaan] = useState<string | null>(null)
  const params = useParams()
  const supabase = createClient()

  useEffect(() => { laadData() }, [])

  async function laadData() {
    const { data: ronde } = await supabase
      .from('rondes')
      .select('ronde_nummer')
      .eq('id', params.rondeId)
      .single()
    setRondeNummer(ronde?.ronde_nummer ?? 0)

    const { data: groepenData } = await supabase
      .from('groepen')
      .select('id, baan_nummer')
      .eq('ronde_id', params.rondeId)
      .order('baan_nummer')

    const volledigeGroepen: GroepInfo[] = []

    for (const groep of groepenData ?? []) {
      const { data: groepSpelers } = await supabase
        .from('groep_spelers')
        .select('spelers(id, voornaam, achternaam)')
        .eq('groep_id', groep.id)

      const spelers = (groepSpelers ?? []).map((gs: any) => gs.spelers).filter(Boolean)

      const { data: setsData } = await supabase
        .from('sets')
        .select('*')
        .eq('groep_id', groep.id)
        .order('set_nummer')

      volledigeGroepen.push({
        id: groep.id,
        baan_nummer: groep.baan_nummer,
        spelers,
        sets: setsData ?? [],
      })
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
    await supabase
      .from('sets')
      .update({ games_team1, games_team2, ingevoerd_op: new Date().toISOString() })
      .eq('id', setId)
    setOpslaan(null)
    laadData()
  }

  if (laden) return <div className="min-h-screen flex items-center justify-center">Laden...</div>

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <a href={`/beheer/wedstrijden/${params.id}/schema`} className="text-gray-400 hover:text-gray-600 text-sm">← Schema</a>
        <h1 className="text-lg font-bold text-brand-500">Ronde {rondeNummer} — Uitslagen</h1>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {groepen.map(groep => (
          <div key={groep.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">
                Baan {groep.baan_nummer} — {groep.spelers.map(s => `${s.voornaam} ${s.achternaam}`).join(', ')}
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {groep.sets.map(set => (
                <SetRij
                  key={set.id}
                  set={set}
                  spelers={groep.spelers}
                  naamVan={naamVan}
                  opslaan={opslaan === set.id}
                  onOpslaan={(g1, g2) => updateSet(set.id, g1, g2)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

function SetRij({
  set, spelers, naamVan, opslaan, onOpslaan,
}: {
  set: SetInfo
  spelers: SpelerInfo[]
  naamVan: (spelers: SpelerInfo[], id: string) => string
  opslaan: boolean
  onOpslaan: (g1: number, g2: number) => void
}) {
  const [g1, setG1] = useState(set.games_team1?.toString() ?? '')
  const [g2, setG2] = useState(set.games_team2?.toString() ?? '')

  const team1Naam = `${naamVan(spelers, set.team1_speler1_id)} & ${naamVan(spelers, set.team1_speler2_id)}`
  const team2Naam = `${naamVan(spelers, set.team2_speler1_id)} & ${naamVan(spelers, set.team2_speler2_id)}`

  return (
    <div className="px-6 py-3 flex items-center gap-4">
      <span className="text-xs font-medium text-gray-400 w-12">Set {set.set_nummer}</span>
      <span className="text-sm text-gray-700 flex-1">{team1Naam}</span>
      <input
        type="number"
        min={0}
        max={7}
        value={g1}
        onChange={e => setG1(e.target.value)}
        className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center"
      />
      <span className="text-gray-400">-</span>
      <input
        type="number"
        min={0}
        max={7}
        value={g2}
        onChange={e => setG2(e.target.value)}
        className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center"
      />
      <span className="text-sm text-gray-700 flex-1 text-right">{team2Naam}</span>
      <button
        onClick={() => onOpslaan(+g1, +g2)}
        disabled={opslaan || g1 === '' || g2 === ''}
        className="bg-brand-500 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-brand-600 disabled:opacity-50"
      >
        {opslaan ? '...' : 'Opslaan'}
      </button>
    </div>
  )
}