'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function NieuweWedstrijdPage() {
  const [naam, setNaam] = useState('')
  const [datumVan, setDatumVan] = useState('')
  const [datumTot, setDatumTot] = useState('')
  const [locatie, setLocatie] = useState('')
  const [aantalBanen, setAantalBanen] = useState(4)
  const [schemaType, setSchemaType] = useState<'volledig' | 'kort'>('volledig')
  const [maxDeelnemers, setMaxDeelnemers] = useState(16)
  const [fout, setFout] = useState('')
  const [laden, setLaden] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleOpslaan(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)
    setFout('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: gebruiker } = await supabase
      .from('gebruikers')
      .select('club_id')
      .eq('auth_id', user.id)
      .single()

    if (!gebruiker?.club_id) {
      setFout('Club niet gevonden.')
      setLaden(false)
      return
    }

    const { error } = await supabase.from('wedstrijden').insert({
      club_id: gebruiker.club_id,
      naam,
      datum_van: datumVan,
      datum_tot: datumTot || null,
      locatie: locatie || null,
      aantal_banen: aantalBanen,
      speelformaat: 'mixed_roulerend',
      schema_type: schemaType,
      max_deelnemers: maxDeelnemers,
      status: 'Concept',
    })

    if (error) {
      setFout(`Fout: ${error.message}`)
      setLaden(false)
    } else {
      router.push('/beheer/wedstrijden')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <a href="/beheer/wedstrijden" className="text-gray-400 hover:text-gray-600 text-sm">← Wedstrijden</a>
        <h1 className="text-lg font-bold text-brand-500">Nieuwe wedstrijd</h1>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-gray-100 p-8">
          <form onSubmit={handleOpslaan} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Naam wedstrijd</label>
              <input
                type="text"
                value={naam}
                onChange={e => setNaam(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                placeholder="bv. Voorjaarscompetitie 2026"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                <input
                  type="date"
                  value={datumVan}
                  onChange={e => setDatumVan(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Einddatum <span className="text-gray-400 font-normal">(optioneel)</span>
                </label>
                <input
                  type="date"
                  value={datumTot}
                  onChange={e => setDatumTot(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Locatie <span className="text-gray-400 font-normal">(optioneel)</span>
              </label>
              <input
                type="text"
                value={locatie}
                onChange={e => setLocatie(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                placeholder="bv. Mazarron Padelclub"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aantal banen</label>
                <input
                  type="number"
                  value={aantalBanen}
                  onChange={e => setAantalBanen(+e.target.value)}
                  min={1}
                  max={10}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max deelnemers</label>
                <select
                  value={maxDeelnemers}
                  onChange={e => setMaxDeelnemers(+e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                >
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                  <option value={16}>16</option>
                  <option value={20}>20</option>
                  <option value={24}>24</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Schema type</label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:border-brand-500">
                  <input
                    type="radio"
                    value="volledig"
                    checked={schemaType === 'volledig'}
                    onChange={() => setSchemaType('volledig')}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">Volledig (15 rondes)</p>
                    <p className="text-xs text-gray-500">Elk paar komt 3x samen — langere competitie</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:border-brand-500">
                  <input
                    type="radio"
                    value="kort"
                    checked={schemaType === 'kort'}
                    onChange={() => setSchemaType('kort')}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">Kort (5 rondes)</p>
                    <p className="text-xs text-gray-500">Elk paar 1x samen — korter toernooi</p>
                  </div>
                </label>
              </div>
            </div>

            {fout && <p className="text-red-500 text-sm">{fout}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={laden}
                className="bg-brand-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
              >
                {laden ? 'Aanmaken...' : 'Wedstrijd aanmaken'}
              </button>
              <a href="/beheer/wedstrijden" className="px-6 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
                Annuleren
              </a>
            </div>

          </form>
        </div>
      </div>
    </main>
  )
}
