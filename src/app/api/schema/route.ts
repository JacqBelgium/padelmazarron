'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'

interface SpelerInfo {
  id: string
  voornaam: string
  achternaam: string
}

interface GroepInfo {
  id: string
  baan_nummer: number
  spelers: SpelerInfo[]
}

interface RondeInfo {
  id: string
  ronde_nummer: number
  status: string
  groepen: GroepInfo[]
}

export default function SchemaOverzichtPage() {
  const [rondes, setRondes] = useState<RondeInfo[]>([])
  const [wedstrijdNaam, setWedstrijdNaam] = useState('')
  const [laden, setLaden] = useState(true)
  const params = useParams()
  const supabase = createClient()

  useEffect(() => { laadSchema() }, [])

  async function laadSchema() {
    const { data: wedstrijd } = await supabase
      .from('wedstrijden')
      .select('naam')
      .eq('id', params.id)
      .single()
    setWedstrijdNaam(wedstrijd?.naam ?? '')

    const { data: rondesData } = await supabase
      .from('rondes')
      .select('id, ronde_nummer, status')
      .eq('wedstrijd_id', params.id)
      .order('ronde_nummer')

    if (!rondesData) { setLaden(false); return }

    const volledigeRondes: RondeInfo[] = []

    for (const ronde of rondesData) {
      const { data: groepenData } = await supabase
        .from('groepen')
        .select('id, baan_nummer')
        .eq('ronde_id', ronde.id)
        .order('baan_nummer')

      const groepen: GroepInfo[] = []

      for (const groep of groepenData ?? []) {
        const { data: groepSpelers } = await supabase
          .from('groep_spelers')
          .select('speler_id, spelers(id, voornaam, achternaam)')
          .eq('groep_id', groep.id)

        const spelers = (groepSpelers ?? []).map((gs: any) => gs.spelers).filter(Boolean)

        groepen.push({ id: groep.id, baan_nummer: groep.baan_nummer, spelers })
      }

      volledigeRondes.push({
        id: ronde.id,
        ronde_nummer: ronde.ronde_nummer,
        status: ronde.status,
        groepen,
      })
    }

    setRondes(volledigeRondes)
    setLaden(false)
  }

  if (laden) return <div className="min-h-screen flex items-center justify-center">Schema laden...</div>

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <a href={`/beheer/wedstrijden/${params.id}`} className="text-gray-400 hover:text-gray-600 text-sm">← Terug</a>
        <h1 className="text-lg font-bold text-brand-500">Schema — {wedstrijdNaam}</h1>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {rondes.map(ronde => (
          <div key={ronde.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Ronde {ronde.ronde_nummer}</h2>
              <span className="text-xs text-gray-500">{ronde.status}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {ronde.groepen.map(groep => (
                <div key={groep.id} className="px-6 py-3 grid grid-cols-[80px_1fr] items-center">
                  <span className="text-sm font-medium text-gray-500">Baan {groep.baan_nummer}</span>
                  <span className="text-sm text-gray-800">
                    {groep.spelers.map(s => `${s.voornaam} ${s.achternaam}`).join('  |  ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}