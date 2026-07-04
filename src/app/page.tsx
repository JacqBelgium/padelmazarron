'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const [wedstrijden, setWedstrijden] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('wedstrijden')
      .select('id, naam, datum_van, status')
      .eq('status', 'Actief')
      .order('datum_van', { ascending: false })
      .then(({ data }) => setWedstrijden(data ?? []))
  }, [])

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-6 text-center">
        <h1 className="text-3xl font-bold text-brand-500">PadelMazarron</h1>
        <p className="text-gray-500 mt-1">Racket Sport Club Competitie</p>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-4">
        {wedstrijden.length === 0 ? (
          <p className="text-center text-gray-400">Geen actieve competities gevonden.</p>
        ) : (
          wedstrijden.map(w => (
            <div key={w.id} className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-800 text-lg mb-4">{w.naam}</h2>
              <div className="grid grid-cols-2 gap-3">
                <a href={`/schema/${w.id}`}
                  className="bg-brand-50 border border-brand-100 rounded-lg p-4 text-center hover:border-brand-500 transition-colors">
                  <div className="text-2xl mb-1">📋</div>
                  <p className="font-medium text-brand-600 text-sm">Speelschema</p>
                </a>
                <a href={`/stand/${w.id}`}
                  className="bg-brand-50 border border-brand-100 rounded-lg p-4 text-center hover:border-brand-500 transition-colors">
                  <div className="text-2xl mb-1">🏆</div>
                  <p className="font-medium text-brand-600 text-sm">Puntenstand</p>
                </a>
              </div>
            </div>
          ))
        )}

        <div className="text-center pt-4">

          <div className="flex justify-center gap-6">
  <a href="/login" className="text-sm text-gray-400 hover:text-gray-600">
    Beheerder login →
  </a>
  <a href="/privacy" className="text-sm text-gray-400 hover:text-gray-600">
    Privacyverklaring
  </a>
</div>
        </div>
      </div>
    </main>
  )
}