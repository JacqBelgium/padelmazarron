'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Speler } from '@/types/database'

export default function SpelersPage() {
  const [spelers, setSpelers] = useState<Speler[]>([])
  const [laden, setLaden] = useState(true)
  const supabase = createClient()

  useEffect(() => { laadSpelers() }, [])

  async function laadSpelers() {
    const { data } = await supabase
      .from('spelers')
      .select('*')
      .order('achternaam')
    setSpelers(data ?? [])
    setLaden(false)
  }

  if (laden) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', background: '#0A1628' }}>
      <div style={{ color: '#E8C547' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>

      {/* Nav */}
      <nav style={{ background: '#0A1628', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#E8C547', fontWeight: 900, fontSize: '18px' }}>RacketComp</div>
        <a href="/beheer" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px' }}>← Dashboard</a>
      </nav>

      {/* Header */}
      <div style={{ background: '#0A1628', padding: '32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ color: '#E8C547', fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Admin</p>
            <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>Players</h1>
          </div>
          
            <a href="/beheer/spelers/nieuw"
            style={{ background: '#E8C547', color: '#0A1628', padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}
          >
            + Add player
          </a>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 32px' }}>
        {spelers.length === 0 ? (
          <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
            <p style={{ color: '#9CA3AF', marginBottom: '20px' }}>No players added yet.</p>
            <a href="/beheer/spelers/nieuw" style={{ background: '#E8C547', color: '#0A1628', padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>
              Add first player
            </a>
          </div>
        ) : (
          <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0A1628' }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: '#E8C547', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: '#E8C547', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Gender</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: '#E8C547', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: '#E8C547', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 20px' }}></th>
                </tr>
              </thead>
              <tbody>
                {spelers.map((speler, i) => (
                  <tr key={speler.id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#ffffff' : '#F9FAFB' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0A1628', fontSize: '14px' }}>
                      {speler.voornaam} {speler.achternaam}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#6B7280', fontSize: '14px' }}>
                      {speler.geslacht === 'M' ? 'Man' : 'Woman'}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#6B7280', fontSize: '14px' }}>{speler.email}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        background: speler.status === 'Actief' ? '#DCFCE7' : '#F1F5F9',
                        color: speler.status === 'Actief' ? '#166534' : '#475569',
                        padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                      }}>
                        {speler.status === 'Actief' ? 'Active' : speler.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <a href={`/beheer/spelers/${speler.id}`} style={{ color: '#1F5C99', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
                        Edit →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}