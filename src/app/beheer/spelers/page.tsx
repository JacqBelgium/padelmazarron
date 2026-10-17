'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDemo } from '@/lib/useDemo'
import type { Speler } from '@/types/database'
import TenantNav from '@/components/TenantNav'
import { useTenantContext } from '@/lib/TenantContext'

export default function SpelersPage() {
  const [spelers, setSpelers] = useState<Speler[]>([])
  const [laden, setLaden] = useState(true)
  const supabase = createClient()
  const { primaryColor, secondaryColor } = useTenantContext()
  const { isDemo } = useDemo()

  useEffect(() => { laadSpelers() }, [])

  async function laadSpelers() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setSpelers([])
        return
      }

      const { data: gebruiker, error: gebruikerError } = await supabase
        .from('gebruikers')
        .select('club_id')
        .eq('auth_id', user.id)
        .single()

      if (gebruikerError || !gebruiker?.club_id) {
        if (gebruikerError) console.error('Could not load user club:', gebruikerError)
        setSpelers([])
        return
      }

      const { data, error } = await supabase
        .from('spelers')
        .select('*')
        .eq('club_id', gebruiker.club_id)
        .order('achternaam')

      if (error) console.error('Could not load players:', error)
      setSpelers(data ?? [])
    } catch (error) {
      console.error('Could not load players:', error)
      setSpelers([])
    } finally {
      setLaden(false)
    }
  }

  if (laden) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', background: primaryColor }}>
      <div style={{ color: secondaryColor }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>

      <TenantNav back={{ href: '/beheer', label: 'Dashboard' }} />

      {isDemo && (
        <div style={{ background: '#FEF9C3', borderBottom: '1px solid #FDE68A', padding: '10px 32px', textAlign: 'center' }}>
          <span style={{ color: '#854D0E', fontSize: '13px', fontWeight: 600 }}>🔍 Demo mode — read only</span>
        </div>
      )}

      <div style={{ background: primaryColor, padding: '32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ color: secondaryColor, fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Admin</p>
            <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>Players</h1>
          </div>
          {!isDemo && (
            <a href="/beheer/spelers/nieuw" style={{ background: secondaryColor, color: primaryColor, padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>
              + Add player
            </a>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 32px' }}>
        {spelers.length === 0 ? (
          <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
            <p style={{ color: '#9CA3AF', marginBottom: '20px' }}>No players added yet.</p>
            {!isDemo && (
              <a href="/beheer/spelers/nieuw" style={{ background: secondaryColor, color: primaryColor, padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>
                Add first player
              </a>
            )}
          </div>
        ) : (
          <div className="beheer-table-scroll" style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: primaryColor }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: secondaryColor, fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: secondaryColor, fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Gender</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: secondaryColor, fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: secondaryColor, fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 20px' }}></th>
                </tr>
              </thead>
              <tbody>
                {spelers.map((speler, i) => (
                  <tr key={speler.id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#ffffff' : '#F9FAFB' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: primaryColor, fontSize: '14px' }}>
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
                        {isDemo ? 'View →' : 'Edit →'}
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