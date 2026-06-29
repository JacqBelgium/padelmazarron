'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import type { Wedstrijd, Speler, Deelname } from '@/types/database'

export default function WedstrijdBeheerPage() {
  const [wedstrijd, setWedstrijd] = useState<Wedstrijd | null>(null)
  const [alleSpelers, setAlleSpelers] = useState<Speler[]>([])
  const [deelnames, setDeelnames] = useState<Deelname[]>([])
  const [laden, setLaden] = useState(true)
  const [opslaan, setOpslaan] = useState(false)
  const [bericht, setBericht] = useState('')
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    laadData()
  }, [])

  async function laadData() {
    const [{ data: w }, { data: s }, { data: d }] = await Promise.all([
      supabase.from('wedstrijden').select('*').eq('id', params.id).single(),
      supabase.from('spelers').select('*').eq('status', 'Actief').order('achternaam'),
      supabase.from('deelnames').select('*').eq('wedstrijd_id', params.id),
    ])
    setWedstrijd(w)
    setAlleSpelers(s ?? [])
    setDeelnames(d ?? [])
    setLaden(false)
  }

  const isDeelnemer = (spelerId: string) =>
    deelnames.some(d => d.speler_id === spelerId)

  async function toggleDeelnemer(speler: Speler) {
    const bestaand = deelnames.find(d => d.speler_id === speler.id)

    if (bestaand) {
      // Verwijderen
      await supabase.from('deelnames').delete().eq('id', bestaand.id)
      setDeelnames(prev => prev.filter(d => d.id !== bestaand.id))
    } else {
      // Toevoegen
      const { data } = await supabase.from('deelnames').insert({
        wedstrijd_id: params.id,
        speler_id: speler.id,
        uitnodiging_status: 'bevestigd',
      }).select().single()
      if (data) setDeelnames(prev => [...prev, data])
    }
  }

  async function activeerWedstrijd() {
    setOpslaan(true)
    const { error } = await supabase
      .from('wedstrijden')
      .update({ status: 'Actief' })
      .eq('id', params.id)

    if (!error) {
      setWedstrijd(prev => prev ? { ...prev, status: 'Actief' } : null)
      setBericht('Wedstrijd geactiveerd!')
    }
    setOpslaan(false)
  }

  if (laden) return <div className="min-h-screen flex items-center justify-center">Laden...</div>
  if (!wedstrijd) return <div className="min-h-screen flex items-center justify-center">Wedstrijd niet gevonden</div>

  const aantalDeelnemers = deelnames.length
  const deelbaarDoor4 = aantalDeelnemers > 0 && aantalDeelnemers % 4 === 0

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/beheer/wedstrijden" className="text-gray-400 hover:text-gray-600 text-sm">← Wedstrijden</a>
          <h1 className="text-lg font-bold text-brand-500">{wedstrijd.naam}</h1>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            wedstrijd.status === 'Actief' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>{wedstrijd.status}</span>
        </div>
        {wedstrijd.status === 'Concept' && deelbaarDoor4 && (
          <button
            onClick={activeerWedstrijd}
            disabled={opslaan}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            ✓ Wedstrijd activeren
          </button>
        )}
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Info */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Startdatum', waarde: wedstrijd.datum_van },
            { label: 'Speelformaat', waarde: 'Mixed roulerend' },
            { label: 'Schema', waarde: wedstrijd.schema_type === 'volledig' ? '15 rondes' : '5 rondes' },
            { label: 'Deelnemers', waarde: `${aantalDeelnemers} / ${wedstrijd.max_deelnemers}` },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className="font-semibold text-gray-800">{item.waarde}</p>
            </div>
          ))}
        </div>

        {bericht && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm">
            {bericht}
          </div>
        )}

        {!deelbaarDoor4 && aantalDeelnemers > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-yellow-700 text-sm">
            ⚠ {aantalDeelnemers} deelnemers — moet deelbaar zijn door 4 om te activeren
          </div>
        )}

        {/* Deelnemers selecteren */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Deelnemers selecteren</h2>
            <span className="text-sm text-gray-500">{aantalDeelnemers} geselecteerd</span>
          </div>
          <div className="divide-y divide-gray-50">
            {alleSpelers.map(speler => (
              <div
                key={speler.id}
                onClick={() => wedstrijd.status === 'Concept' && toggleDeelnemer(speler)}
                className={`px-6 py-3 flex items-center justify-between ${
                  wedstrijd.status === 'Concept' ? 'cursor-pointer hover:bg-gray-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    isDeelnemer(speler.id) ? 'bg-brand-500 border-brand-500' : 'border-gray-300'
                  }`}>
                    {isDeelnemer(speler.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="font-medium text-gray-800">{speler.voornaam} {speler.achternaam}</span>
                </div>
                <span className="text-xs text-gray-400">{speler.geslacht}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}
