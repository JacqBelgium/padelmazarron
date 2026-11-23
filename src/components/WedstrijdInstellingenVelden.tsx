'use client'

import React from 'react'
import {
  FORFAIT_GAMES_MAX,
  FORFAIT_GAMES_MIN,
  MAX_DEELNEMERS_OPTIES,
  RONDE_DUUR_MAX,
  RONDE_DUUR_MIN,
  SPEELDUUR_MAX,
  SPEELDUUR_MIN,
  berekenEinddatum,
  effectieveRondes,
  type InstellingenWaarden,
} from '@/lib/wedstrijd-instellingen'

type Props = {
  waarden: InstellingenWaarden
  onChange: <K extends keyof InstellingenWaarden>(veld: K, waarde: InstellingenWaarden[K]) => void
  alleenLezen?: boolean
  // The forfeit settings (forfeit games, showing F publicly) can stay editable while the other settings are read-only.
  forfaitAlleenLezen?: boolean
  // Number of rounds that already exist; when above 0 the summary shows it instead of the computed number.
  bestaandeRondes?: number
  primaryColor: string
}

// Settings fields with a read-only summary of the number of rounds and the computed end date.
export default function WedstrijdInstellingenVelden({ waarden, onChange, alleenLezen = false, forfaitAlleenLezen = alleenLezen, bestaandeRondes = 0, primaryColor }: Props) {
  const inputStyle = {
    width: '100%', padding: '12px 16px',
    border: '1px solid #E5E7EB', borderRadius: '8px',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const,
    background: alleenLezen ? '#F9FAFB' : '#ffffff', color: primaryColor,
  }
  const labelStyle = { display: 'block', color: '#374151', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }
  const optioneel = <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span>

  const max = Number(waarden.maxDeelnemers) || 0
  const rondes = bestaandeRondes > 0 ? bestaandeRondes : effectieveRondes(waarden)
  const einddatum = berekenEinddatum(waarden)

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 320px', minWidth: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={labelStyle} htmlFor="datum_van">Start date</label>
            <input id="datum_van" type="date" value={waarden.datumVan} onChange={e => onChange('datumVan', e.target.value)} style={inputStyle} required disabled={alleenLezen} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="max_deelnemers">Max participants</label>
            <select id="max_deelnemers" value={waarden.maxDeelnemers} onChange={e => onChange('maxDeelnemers', e.target.value)} style={inputStyle} disabled={alleenLezen}>
              {MAX_DEELNEMERS_OPTIES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="ronde_duur_dagen">Round length (days)</label>
            <input id="ronde_duur_dagen" type="number" min={RONDE_DUUR_MIN} max={RONDE_DUUR_MAX} step={1} value={waarden.rondeDuurDagen} onChange={e => onChange('rondeDuurDagen', e.target.value)} style={inputStyle} required disabled={alleenLezen} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="aantal_rondes">Number of rounds {optioneel}</label>
            <input id="aantal_rondes" type="number" min={1} max={Math.max(1, max - 1)} step={1} value={waarden.aantalRondes} placeholder={max > 1 ? String(max - 1) : ''} onChange={e => onChange('aantalRondes', e.target.value)} style={inputStyle} disabled={alleenLezen} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="speelduur_minuten">Match duration (minutes) {optioneel}</label>
            <input id="speelduur_minuten" type="number" min={SPEELDUUR_MIN} max={SPEELDUUR_MAX} step={1} value={waarden.speelduurMinuten} onChange={e => onChange('speelduurMinuten', e.target.value)} style={inputStyle} disabled={alleenLezen} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="forfait_games">Forfait games</label>
            <input id="forfait_games" type="number" min={FORFAIT_GAMES_MIN} max={FORFAIT_GAMES_MAX} step={1} value={waarden.forfaitGames} onChange={e => onChange('forfaitGames', e.target.value)} style={{ ...inputStyle, background: forfaitAlleenLezen ? '#F9FAFB' : '#ffffff' }} required disabled={forfaitAlleenLezen} />
          </div>
        </div>
        <label htmlFor="toon_forfaits_publiek" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: '#374151', fontSize: '14px', cursor: forfaitAlleenLezen ? 'default' : 'pointer' }}>
          <input id="toon_forfaits_publiek" type="checkbox" checked={waarden.toonForfaitsPubliek} onChange={e => onChange('toonForfaitsPubliek', e.target.checked)} disabled={forfaitAlleenLezen} style={{ width: '16px', height: '16px', accentColor: '#1F5C99' }} />
          Show missed rounds (F) on the public standings and PDF
        </label>
        <div>
          <label style={labelStyle} htmlFor="spelregels">Rules of play {optioneel}</label>
          <textarea id="spelregels" value={waarden.spelregels} onChange={e => onChange('spelregels', e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} disabled={alleenLezen} />
        </div>
      </div>

      <div style={{ flex: '0 1 220px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px' }} aria-live="polite">
        <p style={{ color: '#9CA3AF', fontSize: '12px', margin: '0 0 4px 0' }}>Rounds</p>
        <p style={{ color: primaryColor, fontWeight: 700, fontSize: '15px', margin: '0 0 12px 0' }}>{rondes ?? '—'}</p>
        <p style={{ color: '#9CA3AF', fontSize: '12px', margin: '0 0 4px 0' }}>End date</p>
        <p style={{ color: primaryColor, fontWeight: 700, fontSize: '15px', margin: 0 }}>{einddatum ?? '—'}</p>
        <p style={{ color: '#9CA3AF', fontSize: '12px', margin: '12px 0 0 0' }}>{max > 0 ? `${max / 4} matches per round` : ''}</p>
      </div>
    </div>
  )
}
