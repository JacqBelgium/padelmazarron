'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
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
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { laadData() }, [])

  async function laadData() {
    const [{ data: w }, { data: s }, { data: d }] = await Promise.all([
      supabase.from('wedstrijden').select('*').eq('id', params.id).single(),
      supabase.from('spelers').select('*').eq('status', 'Actief').order('achternaam'),
      supabase.from('deelnames').select('*').eq('wedstrijd_id', params.id),
    ])
    setWedstrijd(w)
    setAlleSpelers(s ?? [])
    setDeelnames(d ?? [])
    const ids = new Set((d ?? []).map((x: Deelname) => x.speler_id))
    setGeselecteerd(ids)
    setLaden(false)
  }

  function toggleSpeler(id: string) {
    if (wedstrijd?.status !== 'Concept') return
    setGeselecteerd(prev => {
      const nieuw = new Set(prev)
      if (nieuw.has(id)) nieuw.delete(id)
      else nieuw.add(id)
      return nieuw
    })
    setFout('')
    setBericht('')
  }

  async function handleKlaar() {
    const aantal = geselecteerd.size
    if (aantal === 0) { setFout('Selecteer minstens 4 spelers.'); return }
    if (aantal % 4 !== 0) { setFout(`${aantal} spelers geselecteerd — moet deelbaar zijn door 4.`); return }
    setOpslaan(true)
    setFout('')
    await supabase.from('deelnames').delete().eq('wedstrijd_id', params.id)
    const nieuweDeelnames = [...geselecteerd].map(speler_id => ({
      wedstrijd_id: params.id as string,
      speler_id,
      uitnodiging_status: 'bevestigd' as const,
    }))
    const { error } = await supabase.from('deelnames').insert(nieuweDeelnames)
    if (error) {
      setFout(`Fout: ${error.message}`)
    } else {
      setBericht(`✓ ${aantal} deelnemers opgeslagen!`)
      laadData()
    }
    setOpslaan(false)
  }

  async function activeerWedstrijd() {
    if (geselecteerd.size === 0 || geselecteerd.size % 4 !== 0) {
      setFout('Sla eerst de deelnemers op.')
      return
    }
    setOpslaan(true)
    const { error } = await supabase
      .from('wedstrijden').update({ status: 'Actief' }).eq('id', params.id)
    if (!error) {
      setWedstrijd(prev => prev ? { ...prev, status: 'Actief' } : null)
      setBericht('✓ Wedstrijd geactiveerd!')
    }
    setOpslaan(false)
  }

  async function genereerSchemaActie() {
    setOpslaan(true)
    setFout('')
    setBericht('')
    const response = await fetch('/api/schema/genereer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wedstrijd_id: params.id }),
    })
    const data = await response.json()
    if (data.fout) {
      setFout(`Schema fout: ${data.fout}`)
    } else {
      setBericht(`✓ Schema gegenereerd! ${data.rondes} rondes voor ${data.spelers} spelers.`)
    }
    setOpslaan(false)
  }

  if (laden) return <div className="min-h-screen flex items-center justify-center">Laden...</div>
  if (!wedstrijd) return <div className="min-h-screen flex items-center justify-center">Wedstrijd niet gevonden</div>

  const aantal = geselecteerd.size
  const deelbaarDoor4 = aantal > 0 && aantal % 4 === 0

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/beheer/wedstrijden" className="text-gray-400 hover:text-gray-600 text-sm">← Wedstrijden</a>
          <h1 className="text-lg font-bold text-brand-500">{wedstrijd.naam}</h1>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${wedstrijd.status === 'Actief' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{wedstrijd.status}</span>
        </div>
        <div className="flex gap-2">
          {wedstrijd.status === 'Concept' && deelbaarDoor4 && deelnames.length === aantal && (
            <button onClick={activeerWedstrijd} disabled={opslaan} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              ✓ Wedstrijd activeren
            </button>
          )}
          {wedstrijd.status === 'Actief' && (
            <button onClick={genereerSchemaActie} disabled={opslaan} className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
              ⚡ Schema genereren
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Startdatum', waarde: wedstrijd.datum_van },
            { label: 'Speelformaat', waarde: 'Mixed roulerend' },
            { label: 'Schema', waarde: wedstrijd.schema_type === 'volledig' ? '15 rondes' : '5 rondes' },
            { label: 'Deelnemers', waarde: `${deelnames.length} / ${wedstrijd.max_deelnemers}` },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className="font-semibold text-gray-800">{item.waarde}</p>
            </div>
          ))}
        </div>

        {bericht && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm font-medium">{bericht}</div>}
        {fout && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm font-medium">⚠ {fout}</div>}

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Deelnemers</h2>
            <span className={`text-sm font-medium ${deelbaarDoor4 ? 'text-green-600' : 'text-gray-500'}`}>
              {aantal} geselecteerd {deelbaarDoor4 ? '✓' : aantal > 0 ? `(${4 - (aantal % 4)} te gaan)` : ''}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {alleSpelers.map(speler => (
              <label key={speler.id} className={`px-6 py-3 flex items-center gap-3 ${wedstrijd.status === 'Concept' ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
                <input type="checkbox" checked={geselecteerd.has(speler.id)} onChange={() => toggleSpeler(speler.id)} disabled={wedstrijd.status !== 'Concept'} className="w-4 h-4 accent-blue-600" />
                <span className="font-medium text-gray-800 flex-1">{speler.voornaam} {speler.achternaam}</span>
                <span className="text-xs text-gray-400">{speler.geslacht}</span>
              </label>
            ))}
          </div>
          {wedstrijd.status === 'Concept' && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
              <button onClick={handleKlaar} disabled={opslaan || aantal === 0} className="bg-brand-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                {opslaan ? 'Opslaan...' : `Deelnemers opslaan (${aantal})`}
              </button>
              <button onClick={() => { setGeselecteerd(new Set()); setFout(''); setBericht('') }} className="text-gray-500 text-sm hover:text-gray-700">
                Alles wissen
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}