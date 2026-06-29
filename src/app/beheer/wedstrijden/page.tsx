'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Wedstrijd } from '@/types/database'

export default function WedstrijdenPage() {
  const [wedstrijden, setWedstrijden] = useState<Wedstrijd[]>([])
  const [laden, setLaden] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    laadWedstrijden()
  }, [])

  async function laadWedstrijden() {
    const { data } = await supabase
      .from('wedstrijden')
      .select('*')
      .order('created_at', { ascending: false })
    setWedstrijden(data ?? [])
    setLaden(false)
  }

  const statusKleur = (status: string) => {
    if (status === 'Actief') return 'bg-green-100 text-green-700'
    if (status === 'Afgesloten') return 'bg-gray-100 text-gray-600'
    return 'bg-yellow-100 text-yellow-700'
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/beheer" className="text-gray-400 hover:text-gray-600 text-sm">← Beheer</a>
          <h1 className="text-lg font-bold text-brand-500">Wedstrijden</h1>
        </div>
        <a href="/beheer/wedstrijden/nieuw" className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
          + Nieuwe wedstrijd
        </a>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {laden ? (
          <p className="text-gray-500">Laden...</p>
        ) : wedstrijden.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <p className="text-gray-400 mb-4">Nog geen wedstrijden aangemaakt</p>
            <a href="/beheer/wedstrijden/nieuw" className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
              Eerste wedstrijd aanmaken
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {wedstrijden.map(w => (
              <div key={w.id} className="bg-white rounded-xl border border-gray-100 p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{w.naam}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {w.datum_van} · {w.speelformaat} · {w.schema_type === 'volledig' ? '15 rondes' : '5 rondes'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusKleur(w.status)}`}>
                    {w.status}
                  </span>
                  <a href={`/beheer/wedstrijden/${w.id}`} className="text-brand-500 hover:text-brand-600 text-sm">
                    Beheren →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
