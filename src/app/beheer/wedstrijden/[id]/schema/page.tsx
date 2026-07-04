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
  const [alertBezig, setAlertBezig] = useState<string | null>(null)
  const [bericht, setBericht] = useState('')
  const params = useParams()
  const supabase = createClient()
  const wedstrijdId = params.id as string

  useEffect(() => { laadSchema() }, [])

  async function laadSchema() {
    const { data: wedstrijd } = await supabase
      .from('wedstrijden')
      .select('naam')
      .eq('id', wedstrijdId)
      .maybeSingle()
    setWedstrijdNaam(wedstrijd?.naam ?? '')

    const { data: rondesData } = await supabase
      .from('rondes')
      .select('id, ronde_nummer, status')
      .eq('wedstrijd_id', wedstrijdId)
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

  async function stuurAlert(rondeId: string, rondeNummer: number) {
    setAlertBezig(rondeId)
    setBericht('')

    const response = await fetch('/api/alerts/stuur', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wedstrijd_id: wedstrijdId, ronde_id: rondeId }),
    })

    const data = await response.json()

    if (data.succes) {
      setBericht(`✓ Ronde ${rondeNummer}: ${data.emails_verzonden} herinneringen verstuurd voor ${data.groepen_zonder_uitslag} groepen.`)
    } else if (data.bericht) {
      setBericht(`✓ Ronde ${rondeNummer}: ${data.bericht}`)
    } else {
      setBericht(`⚠ Fout: ${data.fout}`)
    }

    setAlertBezig(null)
  }

  if (laden) return <div className="min-h-screen flex items-center justify-center">Schema laden...</div>

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href={`/beheer/wedstrijden/${wedstrijdId}`} className="text-gray-400 hover:text-gray-600 text-sm">← Terug</a>
          <h1 className="text-lg font-bold text-brand-500">Schema — {wedstrijdNaam}</h1>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {bericht && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm font-medium">
            {bericht}
          </div>
        )}

        {rondes.map(ronde => (
          <div key={ronde.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex items-center justify-between">
              
               <a href={`/beheer/wedstrijden/${wedstrijdId}/rondes/${ronde.id}`}
                className="font-semibold text-gray-800 hover:text-brand-500"
              >
                Ronde {ronde.ronde_nummer} →
              </a>
              <button
                onClick={() => stuurAlert(ronde.id, ronde.ronde_nummer)}
                disabled={alertBezig === ronde.id}
                className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-1 rounded-lg hover:bg-yellow-100 disabled:opacity-50"
              >
                {alertBezig === ronde.id ? 'Versturen...' : '📧 Herinnering sturen'}
              </button>
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