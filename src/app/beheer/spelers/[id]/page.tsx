'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import type { Speler } from '@/types/database'

export default function BewerkSpelerPage() {
  const [speler, setSpeler] = useState<Speler | null>(null)
  const [voornaam, setVoornaam] = useState('')
  const [achternaam, setAchternaam] = useState('')
  const [geslacht, setGeslacht] = useState<'M' | 'V'>('M')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [status, setStatus] = useState('Actief')
  const [fout, setFout] = useState('')
  const [laden, setLaden] = useState(true)
  const [opslaan, setOpslaan] = useState(false)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => { laadSpeler() }, [])

  async function laadSpeler() {
    const { data } = await supabase
      .from('spelers').select('*').eq('id', params.id).single()
    if (data) {
      setSpeler(data)
      setVoornaam(data.voornaam)
      setAchternaam(data.achternaam)
      setGeslacht(data.geslacht)
      setEmail(data.email)
      setWhatsapp(data.whatsapp ?? '')
      setStatus(data.status)
    }
    setLaden(false)
  }

  async function handleOpslaan(e: React.FormEvent) {
    e.preventDefault()
    setOpslaan(true)
    const { error } = await supabase
      .from('spelers')
      .update({ voornaam, achternaam, geslacht, email, whatsapp: whatsapp || null, status })
      .eq('id', params.id)
    if (error) { setFout(`Error: ${error.message}`); setOpslaan(false) }
    else router.push('/beheer/spelers')
  }

  async function handleVerwijderen() {
    if (!confirm(`Delete ${voornaam} ${achternaam}?`)) return
    await supabase.from('spelers').delete().eq('id', params.id)
    router.push('/beheer/spelers')
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px',
    border: '1px solid #E5E7EB', borderRadius: '8px',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const,
    background: '#ffffff', color: '#0A1628',
  }
  const labelStyle = { display: 'block', color: '#374151', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }

  if (laden) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', background: '#0A1628' }}>
      <div style={{ color: '#E8C547' }}>Loading...</div>
    </div>
  )

  if (!speler) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      Player not found.
    </div>
  )

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>

      <nav style={{ background: '#0A1628', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#E8C547', fontWeight: 900, fontSize: '18px' }}>RacketComp</div>
        <a href="/beheer/spelers" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px' }}>← Players</a>
      </nav>

      <div style={{ background: '#0A1628', padding: '32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p style={{ color: '#E8C547', fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Admin</p>
          <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>Edit player</h1>
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '32px' }}>
          <form onSubmit={handleOpslaan}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>First name</label>
                <input type="text" value={voornaam} onChange={e => setVoornaam(e.target.value)} style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Last name</label>
                <input type="text" value={achternaam} onChange={e => setAchternaam(e.target.value)} style={inputStyle} required />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Gender</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                {[{ val: 'M', label: 'Man' }, { val: 'V', label: 'Woman' }].map(opt => (
                  <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
                    <input type="radio" value={opt.val} checked={geslacht === opt.val} onChange={() => setGeslacht(opt.val as 'M' | 'V')} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>WhatsApp <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span></label>
              <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+32 ..." style={inputStyle} />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={labelStyle}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                <option value="Actief">Active</option>
                <option value="Afgemeld">Unsubscribed</option>
                <option value="Geblokkeerd">Blocked</option>
              </select>
            </div>

            {fout && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#DC2626', fontSize: '14px' }}>
                {fout}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" disabled={opslaan} style={{ background: '#E8C547', color: '#0A1628', padding: '12px 28px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
                  {opslaan ? 'Saving...' : 'Save changes'}
                </button>
                <a href="/beheer/spelers" style={{ padding: '12px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', color: '#6B7280', background: '#F3F4F6' }}>
                  Cancel
                </a>
              </div>
              <button type="button" onClick={handleVerwijderen} style={{ background: 'transparent', border: 'none', color: '#DC2626', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}>
                Delete player
              </button>
            </div>

          </form>
        </div>
      </div>

    </div>
  )
}