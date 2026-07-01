'use client'

import React, { useEffect, useState } from 'react'
import { createClient as createAdmin } from '@supabase/supabase-js'

interface StandRij {
  speler_id: string
  naam: string
  geslacht: string
  totaal_games: number
  totaal_sets: number
  rondes_gespeeld: number
  positie: number
}

export default function PubliekeStandPage({ params }: { params: { id: string } }) {
  const [naam, setNaam] = useState('')
  const [heren, setHeren] = useState<StandRij[]>([])
  const [dames, setDames] = useState<StandRij[]>([])
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    fetch(`/api/pdf/stand?wedstrijd_id=${params.id}`)
      .then(r => r.json())
      .then(data => {
        setNaam(data.wedstrijd)
        setHeren(data.heren)
        setDames(data.dames)
        setLaden(false)
      })
  }, [])

  async function downloadPdf() {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('PadelMazarron', 14, 20)
    doc.setFontSize(13)
    doc.text(`${naam} — Puntenstand`, 14, 30)
    doc.setFontSize(10)
    doc.text(`Gegenereerd op ${new Date().toLocaleDateString('nl-BE')}`, 14, 38)

    let y = 48

    if (heren.length > 0) {
      doc.setFontSize(12)
      doc.text('Heren', 14, y)
      y += 4
      autoTable(doc, {
        startY: y,
        head: [['#', 'Speler', 'Rondes', 'Sets gewonnen', 'Games']],
        body: heren.map(r => [r.positie, r.naam, r.rondes_gespeeld, r.totaal_sets, r.totaal_games]),
        theme: 'striped',
        headStyles: { fillColor: [31, 92, 153] },
      })
      y = (doc as any).lastAutoTable.finalY + 10
    }

    if (dames.length > 0) {
      doc.setFontSize(12)
      doc.text('Dames', 14, y)
      y += 4
      autoTable(doc, {
        startY: y,
        head: [['#', 'Speler', 'Rondes', 'Sets gewonnen', 'Games']],
        body: dames.map(r => [r.positie, r.naam, r.rondes_gespeeld, r.totaal_sets, r.totaal_games]),
        theme: 'striped',
        headStyles: { fillColor: [31, 92, 153] },
      })
    }

    doc.save(`puntenstand-${naam.replace(/\s+/g, '-')}.pdf`)
  }

  function StandTabel({ rijen, titel }: { rijen: StandRij[], titel: string }) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-800">{titel}</h2>
        </div>
        {rijen.length === 0 ? (
          <p className="px-6 py-4 text-gray-400 text-sm">Nog geen uitslagen ingevoerd</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Speler</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rondes</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Sets gewonnen</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Games</th>
              </tr>
            </thead>
            <tbody>
              {rijen.map(rij => (
                <tr key={rij.speler_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-bold text-gray-400">{rij.positie}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-800">{rij.naam}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600">{rij.rondes_gespeeld}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600">{rij.totaal_sets}</td>
                  <td className="px-4 py-3 text-sm text-center font-semibold text-brand-500">{rij.totaal_games}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  if (laden) return <div className="min-h-screen flex items-center justify-center">Laden...</div>

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-6 text-center">
        <h1 className="text-2xl font-bold text-brand-500">PadelMazarron</h1>
        <p className="text-gray-500 mt-1">{naam} — Puntenstand</p>
        <button
          onClick={downloadPdf}
          className="mt-3 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600"
        >
          📄 Download PDF
        </button>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <StandTabel rijen={heren} titel="🏆 Heren" />
        <StandTabel rijen={dames} titel="🏆 Dames" />
      </div>
    </main>
  )
}