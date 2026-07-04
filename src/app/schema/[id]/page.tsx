'use client'

import React, { useEffect, useState } from 'react'

interface GroepInfo {
  baan: number
  spelers: string[]
}

interface RondeInfo {
  ronde: number
  groepen: GroepInfo[]
}

export default function PubliekSchemaPage({ params }: { params: { id: string } }) {
  const [naam, setNaam] = useState('')
  const [rondes, setRondes] = useState<RondeInfo[]>([])
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    fetch(`/api/pdf/schema?wedstrijd_id=${params.id}`)
      .then(r => r.json())
      .then(data => {
        setNaam(data.wedstrijd)
        setRondes(data.rondes)
        setLaden(false)
      })
  }, [])

  async function downloadPdf() {
    const { jsPDF } = await import('jspdf')
    const autoTableModule = await import('jspdf-autotable')
    const autoTable = autoTableModule.default

    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('PadelMazarron', 14, 20)
    doc.setFontSize(13)
    doc.text(`${naam} - Speelschema`, 14, 30)
    doc.setFontSize(10)
    doc.text(`Gegenereerd op ${new Date().toLocaleDateString('nl-BE')}`, 14, 38)

    let y = 48

    for (const ronde of rondes) {
      if (y > 250) {
        doc.addPage()
        y = 20
      }
      doc.setFontSize(11)
      doc.setTextColor(31, 92, 153)
      doc.text(`Ronde ${ronde.ronde}`, 14, y)
      doc.setTextColor(0, 0, 0)
      y += 4

      autoTable(doc, {
        startY: y,
        head: [['Baan', 'Spelers']],
        body: ronde.groepen.map((g: GroepInfo) => [`Baan ${g.baan}`, g.spelers.join(' | ')]),
        theme: 'striped',
        headStyles: { fillColor: [31, 92, 153] },
        columnStyles: { 0: { cellWidth: 25 } },
      })

      y = (doc as any).lastAutoTable.finalY + 8
    }

    doc.save(`schema-${naam.replace(/\s+/g, '-')}.pdf`)
  }

  if (laden) {
    return <div className="min-h-screen flex items-center justify-center">Schema laden...</div>
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-6 text-center">
        <h1 className="text-2xl font-bold text-brand-500">PadelMazarron</h1>
        <p className="text-gray-500 mt-1">{naam} — Speelschema</p>
        <div className="flex justify-center gap-3 mt-3">
          <button
            onClick={downloadPdf}
            className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600"
          >
            Downloaden PDF
          </button>
          
           <a href={`/stand/${params.id}`}
            className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:border-brand-500"
          >
            Puntenstand
          </a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {rondes.map((ronde: RondeInfo) => (
          <div key={ronde.ronde} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Ronde {ronde.ronde}</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {ronde.groepen.map((groep: GroepInfo) => (
                <div key={groep.baan} className="px-6 py-3 grid grid-cols-[80px_1fr] items-center">
                  <span className="text-sm font-medium text-gray-500">Baan {groep.baan}</span>
                  <span className="text-sm text-gray-800">{groep.spelers.join(' | ')}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
