'use client'

import React, { useEffect, useState } from 'react'
import { forfaitTekst, forfaitTitel } from '@/lib/stand'

interface StandRij {
  speler_id: string
  naam: string
  geslacht: string
  totaal_games: number
  totaal_sets: number
  rondes_gespeeld: number
  forfaits?: number
  positie: number
}

export default function PubliekeStandPage({ params }: { params: { id: string } }) {
  const [naam, setNaam] = useState('')
  const [heren, setHeren] = useState<StandRij[]>([])
  const [dames, setDames] = useState<StandRij[]>([])
  const [laden, setLaden] = useState(true)
  // Only true when the route sent the forfaits field (the organiser chose to show missed rounds).
  const [toonForfaits, setToonForfaits] = useState(false)
  const [gestart, setGestart] = useState(false)

  useEffect(() => {
    fetch(`/api/pdf/stand?wedstrijd_id=${params.id}`)
      .then(r => r.json())
      .then(data => {
        setNaam(data.wedstrijd)
        setHeren(data.heren ?? [])
        setDames(data.dames ?? [])
        setGestart(data.gestart === true)
        setToonForfaits([...(data.heren ?? []), ...(data.dames ?? [])].some((r: object) => 'forfaits' in r))
        setLaden(false)
      })
  }, [])

  const pdfKop = ['#', 'Player', 'Rounds', 'Matches won', 'Games', ...(toonForfaits ? ['F'] : [])]
  const pdfRij = (r: StandRij) => [r.positie, r.naam, r.rondes_gespeeld, r.totaal_sets, r.totaal_games, ...(toonForfaits ? [forfaitTekst(r.forfaits ?? 0)] : [])]

  async function downloadPdf() {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('RacketComp — ' + naam, 14, 20)
    doc.setFontSize(10)
    doc.text('Standings — Generated on ' + new Date().toLocaleDateString('en-GB'), 14, 30)
    let y = 40
    if (heren.length > 0) {
      doc.setFontSize(12)
      doc.setTextColor(31, 92, 153)
      doc.text('Men', 14, y)
      doc.setTextColor(0, 0, 0)
      y += 4
      autoTable(doc, {
        startY: y,
        head: [pdfKop],
        body: heren.map(pdfRij),
        theme: 'striped',
        headStyles: { fillColor: [31, 92, 153] },
      })
      y = (doc as any).lastAutoTable.finalY + 12
    }
    if (dames.length > 0) {
      doc.setFontSize(12)
      doc.setTextColor(31, 92, 153)
      doc.text('Women', 14, y)
      doc.setTextColor(0, 0, 0)
      y += 4
      autoTable(doc, {
        startY: y,
        head: [pdfKop],
        body: dames.map(pdfRij),
        theme: 'striped',
        headStyles: { fillColor: [31, 92, 153] },
      })
    }
    doc.save('standings-' + naam.replace(/\s+/g, '-') + '.pdf')
  }

  function StandTabel({ rijen, titel }: { rijen: StandRij[], titel: string }) {
    return (
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ color: '#0A1628', fontWeight: 800, fontSize: '16px', marginBottom: '12px', letterSpacing: '-0.5px' }}>
          {titel}
        </h2>
        {rijen.length === 0 ? (
          <p style={{ color: '#9CA3AF', fontSize: '14px' }}>No results yet.</p>
        ) : (
          <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0A1628' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: '#E8C547', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>#</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: '#E8C547', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Player</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', color: '#E8C547', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Rounds</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', color: '#E8C547', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Matches won</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', color: '#E8C547', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Games</th>
                  {toonForfaits && <th title="Missed rounds" style={{ padding: '10px 16px', textAlign: 'center', color: '#E8C547', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>F</th>}
                </tr>
              </thead>
              <tbody>
                {rijen.map((rij, i) => (
                  <tr key={`${i}-${rij.naam}`} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#ffffff' : '#F9FAFB' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#9CA3AF', fontSize: '14px' }}>{rij.positie}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0A1628', fontSize: '14px' }}>{rij.naam}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>{rij.rondes_gespeeld}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>{rij.totaal_sets}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#1F5C99', fontSize: '16px' }}>{rij.totaal_games}</td>
                    {toonForfaits && <td title={forfaitTitel(rij.forfaits ?? 0) || undefined} style={{ padding: '12px 16px', textAlign: 'center', color: '#DC2626', fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap' }}>{forfaitTekst(rij.forfaits ?? 0)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  if (laden) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', background: '#0A1628' }}>
        <div style={{ color: '#E8C547', fontSize: '16px' }}>Loading standings...</div>
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
          Standings
        </div>
        <h1 style={{ color: '#ffffff', fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 24px 0' }}>
          {naam}
        </h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {gestart && <button
            onClick={downloadPdf}
            style={{
              background: '#E8C547', color: '#0A1628',
              padding: '10px 24px', borderRadius: '8px',
              border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
            }}
          >
            Download PDF
          </button>}
          
            <a href={`/schema/${params.id}`}
            style={{
              background: 'transparent', color: '#ffffff',
              padding: '10px 24px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              textDecoration: 'none', fontWeight: 600, fontSize: '14px',
            }}
          >
            Schedule →
          </a>
        </div>
      </div>

      {/* Standings */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        {gestart ? (
          <>
            <StandTabel rijen={heren} titel="Men" />
            <StandTabel rijen={dames} titel="Women" />
          </>
        ) : (
          <p style={{ color: '#6B7280', fontSize: '15px', textAlign: 'center' }}>This competition has not started yet.</p>
        )}
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