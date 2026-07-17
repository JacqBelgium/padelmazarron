'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function ClubPage({ params }: { params: { id: string } }) {
  const [club, setClub] = useState<any>(null)
  const [wedstrijden, setWedstrijden] = useState<any[]>([])
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    async function laadData() {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data: clubData } = await client
        .from('clubs')
        .select('id, naam, sport')
        .eq('id', params.id)
        .maybeSingle()

      const { data: wedstrijdenData } = await client
        .from('wedstrijden')
        .select('id, naam, datum_van, datum_tot, status, speelformaat')
        .eq('club_id', params.id)
        .order('datum_van', { ascending: false })

      setClub(clubData)
      setWedstrijden(wedstrijdenData ?? [])
      setLaden(false)
    }
    laadData()
  }, [])

  if (laden) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      Loading...
    </div>
  )

  if (!club) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      Club not found.
    </div>
  )

  const statusKleur = (status: string) => {
    if (status === 'Actief') return { bg: '#DCFCE7', color: '#166534' }
    if (status === 'Afgesloten') return { bg: '#F1F5F9', color: '#475569' }
    return { bg: '#FEF9C3', color: '#854D0E' }
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>

      {/* Header */}
      <div style={{ background: '#0A1628', padding: '48px', textAlign: 'center' }}>
        <a href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px', display: 'block', marginBottom: '16px' }}>
          ← RacketComp
        </a>
        <div style={{ color: '#E8C547', fontWeight: 700, fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>
          {club.sport}
        </div>
        <h1 style={{ color: '#ffffff', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>
          {club.naam}
        </h1>
      </div>

      {/* Competitions */}
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '48px 24px' }}>
        <h2 style={{ color: '#0A1628', fontWeight: 700, fontSize: '18px', marginBottom: '24px' }}>
          Competitions
        </h2>

        {wedstrijden.length === 0 ? (
          <p style={{ color: '#9CA3AF' }}>No competitions found.</p>
        ) : (
          wedstrijden.map(w => {
            const s = statusKleur(w.status)
            return (
              <div key={w.id} style={{
                background: '#ffffff', border: '1px solid #E5E7EB',
                borderRadius: '12px', padding: '24px', marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ color: '#0A1628', fontWeight: 700, fontSize: '18px', margin: '0 0 4px 0' }}>{w.naam}</h3>
                    <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>{w.datum_van} {w.datum_tot ? `→ ${w.datum_tot}` : ''}</p>
                  </div>
                  <span style={{
                    background: s.bg, color: s.color,
                    padding: '4px 12px', borderRadius: '20px',
                    fontSize: '12px', fontWeight: 600,
                  }}>
                    {w.status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <a href={`/schema/${w.id}`} style={{
                    background: '#F5F7FA', border: '1px solid #E5E7EB',
                    color: '#0A1628', padding: '10px 20px', borderRadius: '8px',
                    textDecoration: 'none', fontSize: '14px', fontWeight: 600,
                  }}>
                    📋 Schedule
                  </a>
                  <a href={`/stand/${w.id}`} style={{
                    background: '#1F5C99', color: '#ffffff',
                    padding: '10px 20px', borderRadius: '8px',
                    textDecoration: 'none', fontSize: '14px', fontWeight: 600,
                  }}>
                    🏆 Standings
                  </a>
                </div>
              </div>
            )
          })
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