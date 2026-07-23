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
  const [clubNaam, setClubNaam] = useState('')
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
    doc.text('RacketComp', 14, 20)
    doc.setFontSize(13)
    doc.text(`${naam} - Schedule`, 14, 30)
    doc.setFontSize(10)
    doc.text(`Generated on ${new Date().toLocaleDateString('nl-BE')}`, 14, 38)
    let y = 48
    for (const ronde of rondes) {
      if (y > 250) { doc.addPage(); y = 20 }
      doc.setFontSize(11)
      doc.setTextColor(31, 92, 153)
      doc.text(`Round ${ronde.ronde}`, 14, y)
      doc.setTextColor(0, 0, 0)
      y += 4
      autoTable(doc, {
        startY: y,
        head: [['Court', 'Players']],
        body: ronde.groepen.map((g: GroepInfo) => [`Court ${g.baan}`, g.spelers.join(' | ')]),
        theme: 'striped',
        headStyles: { fillColor: [31, 92, 153] },
        columnStyles: { 0: { cellWidth: 25 } },
      })
      y = (doc as any).lastAutoTable.finalY + 8
    }
    doc.save(`schedule-${naam.replace(/\s+/g, '-')}.pdf`)
  }

  if (laden) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', background: '#0A1628' }}>
        <div style={{ color: '#E8C547', fontSize: '16px' }}>Loading schedule...</div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>

      {/* Header */}
      <div style={{ background: '#0A1628', padding: '40px 24px', textAlign: 'center' }}>
        <a href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px', display: 'block', marginBottom: '12px' }}>
          ← RacketComp
        </a>
        <div style={{ color: '#E8C547', fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
          Schedule
        </div>
        <h1 style={{ color: '#ffffff', fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 24px 0' }}>
          {naam}
        </h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={downloadPdf}
            style={{
              background: '#E8C547', color: '#0A1628',
              padding: '10px 24px', borderRadius: '8px',
              border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
            }}
          >
            Download PDF
          </button>
          
            <a href={`/stand/${params.id}`}
            style={{
              background: 'transparent', color: '#ffffff',
              padding: '10px 24px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              textDecoration: 'none', fontWeight: 600, fontSize: '14px',
            }}
          >
            Standings →
          </a>
        </div>
      </div>

      {/* Rounds */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        {rondes.map((ronde: RondeInfo) => (
          <div key={ronde.ronde} style={{
            background: '#ffffff', border: '1px solid #E5E7EB',
            borderRadius: '12px', marginBottom: '16px', overflow: 'hidden',
          }}>
            <div style={{
              background: '#0A1628', padding: '12px 20px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <span style={{
                background: '#E8C547', color: '#0A1628',
                fontWeight: 900, fontSize: '12px',
                padding: '2px 10px', borderRadius: '20px',
              }}>
                Round {ronde.ronde}
              </span>
            </div>
            {ronde.groepen.map((groep: GroepInfo) => (
              <div key={groep.baan} style={{
                display: 'grid', gridTemplateColumns: '90px 1fr',
                padding: '12px 20px', borderBottom: '1px solid #F3F4F6',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1F5C99' }}>
                  Court {groep.baan}
                </span>
                <span style={{ fontSize: '14px', color: '#374151' }}>
                  {groep.spelers.join('  ·  ')}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF', fontSize: '13px' }}>
        <a href="/" style={{ color: '#9CA3AF', textDecoration: 'none' }}>RacketComp</a>
        {' · '}
        <a href="/privacy" style={{ color: '#9CA3AF', textDecoration: 'none' }}>Privacy</a>
      </footer>

    </div>
  )
}