'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Speler } from '@/types/database'

export default function SpelersPage() {
  const [spelers, setSpelers] = useState<Speler[]>([])
  const [laden, setLaden] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    laadSpelers()
  }, [])

  async function laadSpelers() {
    const { data } = await supabase
      .from('spelers')
      .select('*')
      .order('achternaam')
    setSpelers(data ?? [])
    setLaden(false)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/beheer" className="text-gray-400 hover:text-gray-600 text-sm">← Beheer</a>
          <h1 className="text-lg font-bold text-brand-500">Spelers</h1>
        </div>
        <a href="/beheer/spelers/nieuw" className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
          + Speler toevoegen
        </a>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {laden ? (
          <p className="text-gray-500">Laden...</p>
        ) : spelers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <p className="text-gray-400 mb-4">Nog geen spelers toegevoegd</p>
            <a href="/beheer/spelers/nieuw" className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
              Eerste speler toevoegen
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Naam</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Geslacht</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">E-mail</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {spelers.map(speler => (
                  <tr key={speler.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {speler.voornaam} {speler.achternaam}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{speler.geslacht}</td>
                    <td className="px-6 py-4 text-gray-600">{speler.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        speler.status === 'Actief' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {speler.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a href={`/beheer/spelers/${speler.id}`} className="text-brand-500 hover:text-brand-600 text-sm">
                        Bewerken
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
