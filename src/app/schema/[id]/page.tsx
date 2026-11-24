'use client'

import React, { useEffect, useState } from 'react'
import { periode, rondeStatusLabel, uitkomstKort } from '@/lib/ronde-weergave'

interface TeamSpeler {
  naam: string
  captain: boolean
}

interface GroepInfo {
  baan: number
  spelers: string[]
  team1?: TeamSpeler[]
  team2?: TeamSpeler[]
  uitkomst?: string | null
}

interface RondeInfo {
  ronde: number
  groepen: GroepInfo[]
  start_datum?: string | null
  eind_datum?: string | null
  status?: string | null
}

// Outcome text: the specific outcome when the route sends it, 'Completed' for the neutral 'afgerond', nothing for null.
function uitkomstTekst(uitkomst: string | null | undefined) {
  return uitkomst === 'afgerond' ? 'Completed' : uitkomstKort(uitkomst)
}

// 'A & B vs C & D' with '(captain)' behind the captain; falls back to the player list.
function teamsTekst(groep: GroepInfo) {
  const naam = (s: TeamSpeler) => (s.captain ? `${s.naam} (captain)` : s.naam)
  if (groep.team1?.length && groep.team2?.length) {
    return `${groep.team1.map(naam).join(' & ')} vs ${groep.team2.map(naam).join(' & ')}`
  }
  return groep.spelers.join('  ·  ')
}

export default function PubliekSchemaPage({ params }: { params: { id: string } }) {
  const [naam, setNaam] = useState('')
  const [rondes, setRondes] = useState<RondeInfo[]>([])
  const [gestart, setGestart] = useState(false)
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    fetch(`/api/pdf/schema?wedstrijd_id=${params.id}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        setNaam(data.wedstrijd)
        setRondes(data.rondes ?? [])
        setGestart(data.gestart === true)
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
      doc.text(`Round ${ronde.ronde}  ·  ${periode(ronde.start_datum, ronde.eind_datum)}  ·  ${rondeStatusLabel(ronde.status)}`, 14, y)
      doc.setTextColor(0, 0, 0)
      y += 4
      autoTable(doc, {
        startY: y,
        head: [['Match', 'Teams', 'Outcome']],
        body: ronde.groepen.map(g => [`Match ${g.baan}`, teamsTekst(g), uitkomstTekst(g.uitkomst)]),
        theme: 'striped',
        headStyles: { fillColor: [31, 92, 153] },
        columnStyles: { 0: { cellWidth: 25 }, 2: { cellWidth: 38 } },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          {gestart && (
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
          )}
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
        {!gestart && (
          <p style={{ color: '#6B7280', fontSize: '15px', textAlign: 'center' }}>This competition has not started yet.</p>
        )}
        {gestart && rondes.map(ronde => (
          <div key={ronde.ronde} style={{
            background: '#ffffff', border: '1px solid #E5E7EB',
            borderRadius: '12px', marginBottom: '16px', overflow: 'hidden',
          }}>
            <div style={{
              background: '#0A1628', padding: '12px 20px',
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px',
            }}>
              <span style={{
                background: '#E8C547', color: '#0A1628',
                fontWeight: 900, fontSize: '12px',
                padding: '2px 10px', borderRadius: '20px',
              }}>
                Round {ronde.ronde}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px' }}>{periode(ronde.start_datum, ronde.eind_datum)}</span>
              <span style={{ background: 'rgba(255,255,255,0.12)', color: '#ffffff', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                {rondeStatusLabel(ronde.status)}
              </span>
            </div>
            {ronde.groepen.map(groep => (
              <div key={groep.baan} style={{
                display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: '12px',
                padding: '12px 20px', borderBottom: '1px solid #F3F4F6',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1F5C99' }}>
                  Match {groep.baan}
                </span>
                <span style={{ fontSize: '14px', color: '#374151' }}>
                  {teamsTekst(groep)}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', whiteSpace: 'nowrap' }}>
                  {uitkomstTekst(groep.uitkomst)}
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
