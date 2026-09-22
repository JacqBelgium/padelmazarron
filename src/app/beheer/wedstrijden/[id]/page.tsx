'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { useDemo } from '@/lib/useDemo'
import type { Wedstrijd, Speler, Deelname } from '@/types/database'

export default function WedstrijdBeheerPage() {
  const [wedstrijd, setWedstrijd] = useState<Wedstrijd | null>(null)
  const [alleSpelers, setAlleSpelers] = useState<Speler[]>([])
  const [deelnames, setDeelnames] = useState<Deelname[]>([])
  const [geselecteerd, setGeselecteerd] = useState<Set<string>>(new Set())
  const [laden, setLaden] = useState(true)
  const [opslaan, setOpslaan] = useState(false)
  const [bericht, setBericht] = useState('')
  const [fout, setFout] = useState('')
  const params = useParams()
  const supabase = createClient()
  const { isDemo } = useDemo()
  const id = params.id as string

  useEffect(() => { laadData() }, [])

  async function laadData() {
    const [{ data: w }, { data: s }, { data: d }] = await Promise.all([
      supabase.from('wedstrijden').select('*').eq('id', id).single(),
      supabase.from('spelers').select('*').eq('status', 'Actief').order('achternaam'),
      supabase.from('deelnames').select('*').eq('wedstrijd_id', id),
    ])
    setWedstrijd(w)
    setAlleSpelers(s ?? [])
    setDeelnames(d ?? [])
    const ids = new Set((d ?? []).map((x: Deelname) => x.speler_id))
    setGeselecteerd(ids)
    setLaden(false)
  }

  function toggleSpeler(sid: string) {
    if (wedstrijd?.status !== 'Concept' || isDemo) return
    setGeselecteerd(prev => {
      const n = new Set(prev)
      if (n.has(sid)) n.delete(sid); else n.add(sid)
      return n
    })
    setFout(''); setBericht('')
  }

  async function handleKlaar() {
    if (isDemo) return
    const aantal = geselecteerd.size
    if (aantal === 0) { setFout('Select at least 4 players.'); return }
    if (aantal % 4 !== 0) { setFout(`${aantal} players selected — must be divisible by 4.`); return }
    setOpslaan(true); setFout('')
    await supabase.from('deelnames').delete().eq('wedstrijd_id', id)
    const nieuweDeelnames = [...geselecteerd].map(speler_id => ({
      wedstrijd_id: id, speler_id, uitnodiging_status: 'bevestigd' as const,
    }))
    const { error } = await supabase.from('deelnames').insert(nieuweDeelnames)
    if (error) { setFout(`Error: ${error.message}`) }
    else { setBericht(`✓ ${aantal} participants saved!`); laadData() }
    setOpslaan(false)
  }

  async function activeerWedstrijd() {
    if (isDemo) return
    setOpslaan(true)
    const { error } = await supabase.from('wedstrijden').update({ status: 'Actief' }).eq('id', id)
    if (!error) { setWedstrijd(prev => prev ? { ...prev, status: 'Actief' } : null); setBericht('✓ Competition activated!') }
    setOpslaan(false)
  }

  async function genereerSchemaActie() {
    if (isDemo) return
    setOpslaan(true); setFout(''); setBericht('')
    const response = await fetch('/api/schema/genereer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wedstrijd_id: id }),
    })
    const data = await response.json()
    if (data.fout) setFout(`Error: ${data.fout}`)
    else setBericht(`✓ Schedule generated! ${data.rondes} rounds for ${data.spelers} players.`)
    setOpslaan(false)
  }

  if (laden) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', background: '#0A1628' }}>
      <div style={{ color: '#E8C547' }}>Loading...</div>
    </div>
  )
  if (!wedstrijd) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>Not found.</div>

  const aantal = geselecteerd.size
  const deelbaarDoor4 = aantal > 0 && aantal % 4 === 0

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>

      <nav style={{ background: '#0A1628', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="https://racketcomp.eu" aria-label="RacketComp home" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#fff', fontWeight: 900, fontSize: '18px' }}>
          <svg width="40" height="40" viewBox="0 0 503 496" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display: 'block' }}>
            <path d="M120.22 64.5C128.86 64.13 137.52 64.63 146.16 64.66C163.33 64.72 180.52 64.64 197.69 64.67C243.42 64.73 289.2 65.03 334.95 64.71C353.19 64.59 371.42 64.65 389.65 64.54C405.54 64.45 416.32 62.63 430.74 70.67C444.75 78.49 446.89 95.43 447.02 109.67C447.14 123.51 447.12 137.34 447.15 151.17C447.27 194.49 447.14 237.82 447.01 281.14C446.93 305.91 447.49 330.71 447 355.47C446.79 366.25 447.07 377.07 447.01 387.85C446.91 406.25 446.85 418.61 430.89 430.65C422.45 437.02 411.5 436.76 401.53 436.79C386.95 436.85 372.34 436.54 357.75 436.78C292.41 437.89 227 436.32 161.66 436.77C148.44 436.86 135.22 436.73 121.99 436.73C107.2 436.73 92.9 435.98 82.86 423.55C71.32 409.27 74.03 390.07 74.26 372.8C74.71 339.71 74.63 306.48 74.2 273.39C73.63 229.34 73.79 185.19 74.18 141.14C74.27 130.65 74.14 120.16 74.19 109.67C74.21 105.88 73.57 101.53 74.14 97.82C75.05 91.96 77.44 85.75 80.33 80.56C81.72 78.05 84.65 75.7 86.79 73.82C97.56 64.36 106.69 65.08 120.22 64.5ZM303.94 256.46C304.86 254.69 307.44 254.48 309.32 253.86C313.53 252.49 318.18 251.1 322.01 248.79C338.74 238.67 351.31 225.27 353.85 204.99C354.75 197.81 354.06 190.85 352.16 183.95C340.42 141.4 290.26 138.82 253.78 138.81C246.79 138.81 239.8 138.83 232.8 138.81C222.77 138.79 212.74 138.85 202.7 138.82C191.31 138.77 179.9 138.99 168.5 138.85C162.43 138.77 154.47 137.49 148.65 139.19C148.65 141.05 148.65 142.92 148.65 144.79C152.28 146.91 156.41 147.89 160.04 150.3C164.63 153.34 168.7 159.11 170.74 164.2C171.36 165.74 171.43 167.74 172.18 169.17C172.48 169.76 173.23 169.97 173.48 170.59C174.59 173.3 173.59 181.22 173.59 184.46C173.59 195.87 173.36 207.26 173.45 218.67C173.52 227.65 172.96 236.58 172.96 245.57C172.96 264.44 173.44 283.24 173.44 302.12C173.44 314.78 175.59 330.4 168.73 341.76C164.99 347.94 160.26 352.3 153.45 354.81C151.75 355.44 150.09 355.48 148.48 356.39C148.48 358.21 148.48 360.03 148.48 361.86C150.44 363.17 153.41 362.62 155.73 362.66C161.81 362.77 167.9 362.56 173.98 362.61C190.39 362.72 206.81 362.59 223.23 362.6C231.07 362.6 240.22 363.97 247.88 362.32C247.88 360.19 247.88 358.06 247.88 355.93C243.86 354.35 239.54 353.33 235.92 350.75C233.14 348.78 231.46 346.09 229.75 343.26C220.92 328.66 223.02 311.78 223 295.28C222.99 287.04 221.73 271.63 223.23 264.23C225.76 263.14 229.15 263.67 231.89 263.67C237.42 263.67 250.05 262.48 254.69 264.18C260.76 276.31 267 288.52 272.58 300.87C274.32 304.72 277.04 308.15 278.84 311.93C285.25 325.41 289.7 334.75 301 344.97C303.18 346.95 305.71 349.47 308.32 350.86C309.59 351.55 311.08 351.73 312.4 352.28C317.65 354.5 322.61 357.25 328.19 358.79C333.8 360.33 339.99 360.62 345.75 361.39C354.09 362.5 364.42 364.02 372.7 362.21C372.7 360.07 372.7 357.93 372.7 355.79C367.32 353.58 361.94 351.65 357.38 347.89C356.26 346.96 355.74 345.61 354.75 344.59C349.28 339.01 343.86 332.4 340.27 325.3C339.32 323.43 338.95 321.34 337.89 319.48C332.05 309.28 326.65 298.86 321.67 288.26C319.65 283.96 316.54 280.12 314.5 275.83C313.5 273.71 313.07 271.45 311.76 269.43C308.99 265.19 305.85 261.22 303.94 256.46ZM223.46 238.73C221.84 235.15 223.01 225.27 223 220.95C222.97 204.9 220.48 186.83 231.16 173.47C242.69 159.02 274.13 160.94 286.59 173.31C303.95 190.54 301.24 221.3 279.71 233.89C269.15 240.06 251.52 239.06 239.64 238.98C234.52 238.95 228.42 239.92 223.46 238.73Z" fill="#dfb63c" fillRule="evenodd" stroke="#dfb63c" strokeWidth="0.25" strokeLinejoin="round"/>
            <path d="M303.94 256.46C305.85 261.22 308.99 265.19 311.76 269.43C313.07 271.45 313.5 273.71 314.5 275.83C316.54 280.12 319.65 283.96 321.67 288.26C326.65 298.86 332.05 309.28 337.89 319.48C338.95 321.34 339.32 323.43 340.27 325.3C343.86 332.4 349.28 339.01 354.75 344.59C355.74 345.61 356.26 346.96 357.38 347.89C361.94 351.65 367.32 353.58 372.7 355.79C372.7 357.93 372.7 360.07 372.7 362.21C364.42 364.02 354.09 362.5 345.75 361.39C339.99 360.62 333.8 360.33 328.19 358.79C322.61 357.25 317.65 354.5 312.4 352.28C311.08 351.73 309.59 351.55 308.32 350.86C305.71 349.47 303.18 346.95 301 344.97C289.7 334.75 285.25 325.41 278.84 311.93C277.04 308.15 274.32 304.72 272.58 300.87C267 288.52 260.76 276.31 254.69 264.18C250.05 262.48 237.42 263.67 231.89 263.67C229.15 263.67 225.76 263.14 223.23 264.23C221.73 271.63 222.99 287.04 223 295.28C223.02 311.78 220.92 328.66 229.75 343.26C231.46 346.09 233.14 348.78 235.92 350.75C239.54 353.33 243.86 354.35 247.88 355.93C247.88 358.06 247.88 360.19 247.88 362.32C240.22 363.97 231.07 362.6 223.23 362.6C206.81 362.59 190.39 362.72 173.98 362.61C167.9 362.56 161.81 362.77 155.73 362.66C153.41 362.62 150.44 363.17 148.48 361.86C148.48 360.03 148.48 358.21 148.48 356.39C150.09 355.48 151.75 355.44 153.45 354.81C160.26 352.3 164.99 347.94 168.73 341.76C175.59 330.4 173.44 314.78 173.44 302.12C173.44 283.24 172.96 264.44 172.96 245.57C172.96 236.58 173.52 227.65 173.45 218.67C173.36 207.26 173.59 195.87 173.59 184.46C173.59 181.22 174.59 173.3 173.48 170.59C173.23 169.97 172.48 169.76 172.18 169.17C171.43 167.74 171.36 165.74 170.74 164.2C168.7 159.11 164.63 153.34 160.04 150.3C156.41 147.89 152.28 146.91 148.65 144.79C148.65 142.92 148.65 141.05 148.65 139.19C154.47 137.49 162.43 138.77 168.5 138.85C179.9 138.99 191.31 138.77 202.7 138.82C212.74 138.85 222.77 138.79 232.8 138.81C239.8 138.83 246.79 138.81 253.78 138.81C290.26 138.82 340.42 141.4 352.16 183.95C354.06 190.85 354.75 197.81 353.85 204.99C351.31 225.27 338.74 238.67 322.01 248.79C318.18 251.1 313.53 252.49 309.32 253.86C307.44 254.48 304.86 254.69 303.94 256.46ZM223.46 238.73C228.42 239.92 234.52 238.95 239.64 238.98C251.52 239.06 269.15 240.06 279.71 233.89C301.24 221.3 303.95 190.54 286.59 173.31C274.13 160.94 242.69 159.02 231.16 173.47C220.48 186.83 222.97 204.9 223 220.95C223.01 225.27 221.84 235.15 223.46 238.73Z" fill="#010001" fillRule="evenodd" stroke="#010001" strokeWidth="0.25" strokeLinejoin="round"/>
          </svg>
          <span style={{ color: '#fff', fontWeight: 900 }}>RacketComp</span>
        </a>
        <a href="/beheer/wedstrijden" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px' }}>← Competitions</a>
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
            <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 8px 0' }}>{wedstrijd.naam}</h1>
            <span style={{ background: wedstrijd.status === 'Actief' ? '#DCFCE7' : '#FEF9C3', color: wedstrijd.status === 'Actief' ? '#166534' : '#854D0E', padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
              {wedstrijd.status === 'Actief' ? 'Active' : wedstrijd.status === 'Afgesloten' ? 'Closed' : 'Draft'}
            </span>
          </div>
          {!isDemo && (
            <div style={{ display: 'flex', gap: '10px' }}>
              {wedstrijd.status === 'Concept' && deelbaarDoor4 && deelnames.length === aantal && (
                <button onClick={activeerWedstrijd} disabled={opslaan} style={{ background: '#16A34A', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                  ✓ Activate
                </button>
              )}
              {wedstrijd.status === 'Actief' && (
                <button onClick={genereerSchemaActie} disabled={opslaan} style={{ background: '#E8C547', color: '#0A1628', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                  ⚡ Generate schedule
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Start date', value: wedstrijd.datum_van },
            { label: 'Format', value: 'Mixed rotating' },
            { label: 'Schedule', value: wedstrijd.schema_type === 'volledig' ? '15 rounds' : '5 rounds' },
            { label: 'Participants', value: `${deelnames.length} / ${wedstrijd.max_deelnemers}` },
          ].map(item => (
            <div key={item.label} style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px' }}>
              <p style={{ color: '#9CA3AF', fontSize: '12px', margin: '0 0 4px 0' }}>{item.label}</p>
              <p style={{ color: '#0A1628', fontWeight: 700, fontSize: '15px', margin: 0 }}>{item.value}</p>
            </div>
          ))}
        </div>

        {wedstrijd.status === 'Actief' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { href: `/beheer/wedstrijden/${id}/schema`, icon: '📋', title: 'Schedule', desc: 'View all rounds' },
              { href: `/beheer/wedstrijden/${id}/stand`, icon: '🏆', title: 'Standings', desc: 'Recalculate & view' },
              { href: `/stand/${id}`, icon: '🌐', title: 'Public page', desc: 'Standings + schedule' },
            ].map(item => (
              <a key={item.href} href={item.href} style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '20px', textDecoration: 'none', display: 'block' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
                <div style={{ color: '#0A1628', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{item.title}</div>
                <div style={{ color: '#9CA3AF', fontSize: '12px' }}>{item.desc}</div>
              </a>
            ))}
          </div>
        )}

        {bericht && <div style={{ background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#166534', fontSize: '14px', fontWeight: 600 }}>{bericht}</div>}
        {fout && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#DC2626', fontSize: '14px' }}>⚠ {fout}</div>}

        <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: '#0A1628', fontWeight: 800, fontSize: '15px', margin: 0 }}>Participants</h2>
            <span style={{ color: deelbaarDoor4 ? '#16A34A' : '#9CA3AF', fontSize: '13px', fontWeight: 600 }}>
              {aantal} selected {deelbaarDoor4 ? '✓' : aantal > 0 ? `(${4 - (aantal % 4)} more needed)` : ''}
            </span>
          </div>
          <div>
            {alleSpelers.map((speler, i) => (
              <label key={speler.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', borderBottom: '1px solid #F9FAFB', background: i % 2 === 0 ? '#ffffff' : '#FAFAFA', cursor: wedstrijd.status === 'Concept' && !isDemo ? 'pointer' : 'default' }}>
                <input type="checkbox" checked={geselecteerd.has(speler.id)} onChange={() => toggleSpeler(speler.id)} disabled={wedstrijd.status !== 'Concept' || isDemo} style={{ width: '16px', height: '16px', accentColor: '#1F5C99' }} />
                <span style={{ fontWeight: 600, color: '#0A1628', fontSize: '14px', flex: 1 }}>{speler.voornaam} {speler.achternaam}</span>
                <span style={{ color: '#9CA3AF', fontSize: '12px' }}>{speler.geslacht === 'M' ? 'Man' : 'Woman'}</span>
              </label>
            ))}
          </div>
          {wedstrijd.status === 'Concept' && !isDemo && (
            <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: '12px' }}>
              <button onClick={handleKlaar} disabled={opslaan || aantal === 0} style={{ background: '#1F5C99', color: '#ffffff', padding: '10px 24px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                {opslaan ? 'Saving...' : `Save participants (${aantal})`}
              </button>
              <button onClick={() => { setGeselecteerd(new Set()); setFout(''); setBericht('') }} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', fontSize: '14px', cursor: 'pointer' }}>
                Clear all
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}