'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDemo } from '@/lib/useDemo'
import type { Wedstrijd } from '@/types/database'

export default function WedstrijdenPage() {
  const [wedstrijden, setWedstrijden] = useState<Wedstrijd[]>([])
  const [laden, setLaden] = useState(true)
  const supabase = createClient()
  const { isDemo } = useDemo()

  useEffect(() => { laadWedstrijden() }, [])

  async function laadWedstrijden() {
    const { data } = await supabase
      .from('wedstrijden')
      .select('*')
      .order('created_at', { ascending: false })
    setWedstrijden(data ?? [])
    setLaden(false)
  }

  const statusKleur = (status: string) => {
    if (status === 'Actief') return { bg: '#DCFCE7', color: '#166534' }
    if (status === 'Afgesloten') return { bg: '#F1F5F9', color: '#475569' }
    return { bg: '#FEF9C3', color: '#854D0E' }
  }

  const statusLabel = (status: string) => {
    if (status === 'Actief') return 'Active'
    if (status === 'Afgesloten') return 'Closed'
    return 'Draft'
  }

  if (laden) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', background: '#0A1628' }}>
      <div style={{ color: '#E8C547' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>

      <nav style={{ background: '#0A1628', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#E8C547', fontWeight: 900, fontSize: '18px' }}>RacketComp</div>
        <a href="/beheer" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px' }}>← Dashboard</a>
      </nav>

      {isDemo && (
        <div style={{ background: '#FEF9C3', borderBottom: '1px solid #FDE68A', padding: '10px 32px', textAlign: 'center' }}>
          <span style={{ color: '#854D0E', fontSize: '13px', fontWeight: 600 }}>🔍 Demo mode — read only</span>
        </div>
      )}

      <div style={{ background: '#0A1628', padding: '32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ color: '#E8C547', fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Admin</p>
            <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>Competitions</h1>
          </div>
          {!isDemo && (
            <a href="/beheer/wedstrijden/nieuw" style={{ background: '#E8C547', color: '#0A1628', padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>
              + New competition
            </a>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 32px' }}>
        {wedstrijden.length === 0 ? (
          <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
            <p style={{ color: '#9CA3AF', marginBottom: '20px' }}>No competitions yet.</p>
            {!isDemo && (
              <a href="/beheer/wedstrijden/nieuw" style={{ background: '#E8C547', color: '#0A1628', padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700 }}>
                Create first competition
              </a>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {wedstrijden.map(w => {
              const s = statusKleur(w.status)
              return (
                <div key={w.id} style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ color: '#0A1628', fontWeight: 800, fontSize: '16px', margin: '0 0 6px 0' }}>{w.naam}</h3>
                    <p style={{ color: '#9CA3AF', fontSize: '13px', margin: 0 }}>
                      {w.datum_van} · {w.schema_type === 'volledig' ? '15 rounds' : '5 rounds'} · {w.max_deelnemers} players
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ background: s.bg, color: s.color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                      {statusLabel(w.status)}
                    </span>
                    <a href={`/beheer/wedstrijden/${w.id}`} style={{ color: '#1F5C99', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
                      {isDemo ? 'View →' : 'Manage →'}
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}