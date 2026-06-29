'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import type { Speler } from '@/types/database'

export default function BewerkSpelerPage() {
  const [speler, setSpeler] = useState<Speler | null>(null)
  const [voornaam, setVoornaam] = useState('')
  const [achternaam, setAchternaam] = useState('')
  const [geslacht, setGeslacht] = useState<'M' | 'V'>('M')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [status, setStatus] = useState('Actief')
  const [fout, setFout] = useState('')
  const [laden, setLaden] = useState(true)
  const [opslaan, setOpslaan] = useState(false)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    laadSpeler()
  }, [])

  async function laadSpeler() {
    const { data } = await supabase
      .from('spelers')
      .select('*')
      .eq('id', params.id)
      .single()

    if (data) {
      setSpeler(data)
      setVoornaam(data.voornaam)
      setAchternaam(data.achternaam)
      setGeslacht(data.geslacht)
      setEmail(data.email)
      setWhatsapp(data.whatsapp ?? '')
      setStatus(data.status)
    }
    setLaden(false)
  }

  async function handleOpslaan(e: React.FormEvent) {
    e.preventDefault()
    setOpslaan(true)
    setFout('')

    const { error } = await supabase
      .from('spelers')
      .update({ voornaam, achternaam, geslacht, email, whatsapp: whatsapp || null, status })
      .eq('id', params.id)

    if (error) {
      setFout(`Fout: ${error.message}`)
      setOpslaan(false)
    } else {
      router.push('/beheer/spelers')
    }
  }

  async function handleVerwijderen() {
    if (!confirm(`${voornaam} ${achternaam} verwijderen?`)) return

    const { error } = await supabase
      .from('spelers')
      .delete()
      .eq('id', params.id)

    if (error) {
      setFout(`Fout: ${error.message}`)
    } else {
      router.push('/beheer/spelers')
    }
  }

  if (laden) return <div className="min-h-screen flex items-center justify-center">Laden...</div>
  if (!speler) return <div className="min-h-screen flex items-center justify-center">Speler niet gevonden</div>

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <a href="/beheer/spelers" className="text-gray-400 hover:text-gray-600 text-sm">← Spelers</a>
        <h1 className="text-lg font-bold text-brand-500">Speler bewerken</h1>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-gray-100 p-8">
          <form onSubmit={handleOpslaan} className="space-y-5">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Voornaam</label>
                <input
                  type="text"
                  value={voornaam}
                  onChange={e => setVoornaam(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Achternaam</label>
                <input
                  type="text"
                  value={achternaam}
                  onChange={e => setAchternaam(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Geslacht</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="M" checked={geslacht === 'M'} onChange={() => setGeslacht('M')} />
                  <span className="text-sm">Man</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="V" checked={geslacht === 'V'} onChange={() => setGeslacht('V')} />
                  <span className="text-sm">Vrouw</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp <span className="text-gray-400 font-normal">(optioneel)</span>
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                placeholder="+32 ..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
              >
                <option>Actief</option>
                <option>Afgemeld</option>
                <option>Geblokkeerd</option>
              </select>
            </div>

            {fout && <p className="text-red-500 text-sm">{fout}</p>}

            <div className="flex gap-3 pt-2 justify-between">
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={opslaan}
                  className="bg-brand-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
                >
                  {opslaan ? 'Opslaan...' : 'Wijzigingen opslaan'}
                </button>
                <a href="/beheer/spelers" className="px-6 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
                  Annuleren
                </a>
              </div>
              <button
                type="button"
                onClick={handleVerwijderen}
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50"
              >
                Verwijderen
              </button>
            </div>

          </form>
        </div>
      </div>
    </main>
  )
}
