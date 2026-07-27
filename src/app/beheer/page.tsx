'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function BeheerPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [laden, setLaden] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        setEmail(user.email ?? null)
        const { data } = await supabase
          .from('gebruikers')
          .select('is_demo')
          .eq('auth_id', user.id)
          .single()
        setIsDemo(data?.is_demo ?? false)
        setLaden(false)
      }
    })
  }, [])

  async function uitloggen() {
    await supabase.auth.signOut()
    router.push('/login')
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
        <div style={{ color: '#E8C547', fontWeight: 900, fontSize: '18px', letterSpacing: '-0.5px' }}>
          RacketComp
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{email}</span>
          <button
            onClick={uitloggen}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', padding: '6px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Demo banner */}
      {isDemo && (
        <div style={{ background: '#FEF9C3', borderBottom: '1px solid #FDE68A', padding: '10px 32px', textAlign: 'center' }}>
          <span style={{ color: '#854D0E', fontSize: '13px', fontWeight: 600 }}>
            🔍 Demo mode — read only. You can browse but not make changes.
          </span>
        </div>
      )}

      {/* Header */}
      <div style={{ background: '#0A1628', padding: '32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <p style={{ color: '#E8C547', fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Admin</p>
          <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>Dashboard</h1>
        </div>
      </div>

      {/* Cards */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>

          <a href="/beheer/spelers" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '28px', cursor: 'pointer' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>👥</div>
              <h3 style={{ color: '#0A1628', fontWeight: 800, fontSize: '16px', marginBottom: '6px' }}>Players</h3>
              <p style={{ color: '#9CA3AF', fontSize: '14px', margin: 0 }}>Manage competition participants</p>
            </div>
          </a>

          <a href="/beheer/wedstrijden" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '28px', cursor: 'pointer' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>🏆</div>
              <h3 style={{ color: '#0A1628', fontWeight: 800, fontSize: '16px', marginBottom: '6px' }}>Competitions</h3>
              <p style={{ color: '#9CA3AF', fontSize: '14px', margin: 0 }}>Schedule and rounds</p>
            </div>
          </a>

          <a href="/beheer/uitslagen" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '28px', cursor: 'pointer' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>📊</div>
              <h3 style={{ color: '#0A1628', fontWeight: 800, fontSize: '16px', marginBottom: '6px' }}>Results</h3>
              <p style={{ color: '#9CA3AF', fontSize: '14px', margin: 0 }}>Enter and correct scores</p>
            </div>
          </a>

        </div>
      </div>

    </div>
  )
}