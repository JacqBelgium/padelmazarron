'use client'

import React, { useEffect, useState } from 'react'
import { invallerVoor, spelerNaam, type MatchInfo } from '@/lib/ronde-weergave'

interface Kandidaat { id: string; naam: string; bron: 'wachtlijst' | 'club'; niveau: 'gelijk' | 'onbekend' }

const FOUTMELDINGEN: Record<string, string> = {
  ronde_niet_open: 'The round must be open.',
  uitslag_bestaat: 'This match already has a result. Clear the result first.',
  heeft_al_invaller: 'This player already has a substitute.',
  al_in_ronde: 'This player already plays in this round.',
  is_deelnemer: 'This player takes part in this competition.',
  niveau_verschilt: 'The levels are not the same.',
  niveau_onbekend_bevestigen: 'Please confirm the level first.',
}
const ALGEMENE_FOUT = 'Something went wrong. Please try again.'

export function invallerFoutTekst(code: unknown) {
  return (typeof code === 'string' && FOUTMELDINGEN[code]) || ALGEMENE_FOUT
}

const linkStijl = {
  background: 'none', border: 'none', padding: 0, color: '#1F5C99',
  fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
}

// Inline confirmation with 'Yes' and 'Cancel' (instead of window.confirm, which browsers can suppress).
function Bevestiging({ vraag, bezig, onJa, onAnnuleer }: { vraag: string; bezig: boolean; onJa: () => void; onAnnuleer: () => void }) {
  return (
    <div role="alertdialog" aria-label={vraag} style={{ margin: '6px 0 0 0', padding: '10px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontSize: '13px', color: '#374151', flex: '1 1 220px' }}>{vraag}</span>
      <button type="button" onClick={onJa} disabled={bezig} autoFocus
        style={{ background: '#1F5C99', color: '#ffffff', padding: '5px 14px', borderRadius: '6px', border: 'none', fontWeight: 700, fontSize: '12px', cursor: bezig ? 'not-allowed' : 'pointer', opacity: bezig ? 0.6 : 1 }}>
        {bezig ? 'Saving...' : 'Yes'}
      </button>
      <button type="button" onClick={onAnnuleer} disabled={bezig} style={{ ...linkStijl, color: '#6B7280' }}>Cancel</button>
    </div>
  )
}

// The four planned players of a match with their substitute, 'Assign substitute' and 'Remove' links,
// and the inline panel to choose a substitute.
//  - magToewijzen: the page is editable and the match has no result or the outcome 'speler_afwezig'.
//  - magVerwijderen: the page is editable and the match has no result.
export default function InvallerBeheer({ match, magToewijzen, magVerwijderen, onGewijzigd }: {
  match: MatchInfo
  magToewijzen: boolean
  magVerwijderen: boolean
  onGewijzigd: () => Promise<void> | void
}) {
  const [paneelVoor, setPaneelVoor] = useState<string | null>(null)
  const [verwijderVraag, setVerwijderVraag] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)
  const [melding, setMelding] = useState('')

  const u = match.uitslag
  if (!u) return null
  const gepland = [u.team1_speler1_id, u.team1_speler2_id, u.team2_speler1_id, u.team2_speler2_id]
  const zichtbaar = gepland.filter(id => magToewijzen || invallerVoor(match, id))
  if (zichtbaar.length === 0) return null

  // Called only from the 'Yes' button of the inline 'Remove this substitute?' question.
  async function verwijder(spelerId: string) {
    setBezig(true); setMelding('')
    try {
      const response = await fetch('/api/invallers', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ groep_id: match.id, afwezige_speler_id: spelerId }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) { setMelding(invallerFoutTekst(data.code)); return }
      setVerwijderVraag(null)
      await onGewijzigd()
    } catch {
      setMelding(ALGEMENE_FOUT)
    } finally {
      setBezig(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '0 0 12px 0' }}>
      {zichtbaar.map(id => {
        const invaller = invallerVoor(match, id)
        return (
          <div key={id}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#374151' }}>
              {invaller ? (
                <>
                  <span>{spelerNaam(match, invaller.speler_id)} <span style={{ color: '#6B7280' }}>(substitute for {spelerNaam(match, id)})</span></span>
                  {magVerwijderen && verwijderVraag !== id && (
                    <button type="button" onClick={() => { setVerwijderVraag(id); setMelding('') }} disabled={bezig} style={linkStijl}>Remove</button>
                  )}
                </>
              ) : (
                <>
                  <span>{spelerNaam(match, id)}</span>
                  {magToewijzen && paneelVoor !== id && (
                    <button type="button" onClick={() => { setPaneelVoor(id); setMelding('') }} disabled={bezig} style={linkStijl}>Assign substitute</button>
                  )}
                </>
              )}
            </div>
            {magVerwijderen && invaller && verwijderVraag === id && (
              <Bevestiging vraag="Remove this substitute?" bezig={bezig}
                onJa={() => verwijder(id)} onAnnuleer={() => setVerwijderVraag(null)} />
            )}
            {paneelVoor === id && !invaller && (
              <InvallerPaneel
                match={match}
                spelerId={id}
                onSluit={() => setPaneelVoor(null)}
                onOpgeslagen={async () => { setPaneelVoor(null); await onGewijzigd() }}
              />
            )}
          </div>
        )
      })}
      {melding && <p role="status" style={{ color: '#DC2626', fontSize: '13px', fontWeight: 600, margin: 0 }}>{melding}</p>}
    </div>
  )
}

function InvallerPaneel({ match, spelerId, onSluit, onOpgeslagen }: {
  match: MatchInfo
  spelerId: string
  onSluit: () => void
  onOpgeslagen: () => Promise<void>
}) {
  const [kandidaten, setKandidaten] = useState<Kandidaat[] | null>(null)
  const [gekozen, setGekozen] = useState('')
  const [bevestigd, setBevestigd] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [melding, setMelding] = useState('')
  // Inline question shown before saving when the match has the outcome 'Player absent, no substitute'.
  const [vraagOpen, setVraagOpen] = useState(false)
  const wisVraag = 'This match is recorded as Player absent, no substitute. Assigning a substitute clears that outcome. Continue?'

  useEffect(() => {
    let gestopt = false
    fetch(`/api/invallers/kandidaten?groep_id=${encodeURIComponent(match.id)}&speler_id=${encodeURIComponent(spelerId)}`, { cache: 'no-store' })
      .then(async response => {
        const data = await response.json().catch(() => ({}))
        if (gestopt) return
        if (!response.ok || !Array.isArray(data.kandidaten)) { setMelding(invallerFoutTekst(data.code)); setKandidaten([]); return }
        setKandidaten(data.kandidaten)
      })
      .catch(() => { if (!gestopt) { setMelding(ALGEMENE_FOUT); setKandidaten([]) } })
    return () => { gestopt = true }
  }, [match.id, spelerId])

  const keuze = kandidaten?.find(k => k.id === gekozen) ?? null
  const bevestigingNodig = keuze?.niveau === 'onbekend'

  function opslaan(e: React.FormEvent) {
    e.preventDefault()
    if (!keuze) { setMelding('Choose a substitute.'); return }
    if (bevestigingNodig && !bevestigd) { setMelding(invallerFoutTekst('niveau_onbekend_bevestigen')); return }
    setMelding('')
    // POST only after 'Yes' when the stored outcome is 'Player absent, no substitute'.
    if (match.status === 'speler_afwezig') { setVraagOpen(true); return }
    void verstuur()
  }

  async function verstuur() {
    if (!keuze) return
    setBezig(true); setMelding('')
    try {
      const response = await fetch('/api/invallers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({
          groep_id: match.id,
          afwezige_speler_id: spelerId,
          kandidaat_id: keuze.id,
          ...(bevestigingNodig && bevestigd ? { bevestig_niveau_onbekend: true } : {}),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) { setMelding(invallerFoutTekst(data.code)); setVraagOpen(false); return }
      await onOpgeslagen()
    } catch {
      setMelding(ALGEMENE_FOUT)
    } finally {
      setBezig(false)
    }
  }

  const sectie = (titel: string, lijst: Kandidaat[]) => (
    <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <legend style={{ color: '#374151', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>{titel}</legend>
      {lijst.length === 0 && <span style={{ color: '#9CA3AF', fontSize: '12px' }}>No players.</span>}
      {lijst.map(k => (
        <label key={k.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
          <input type="radio" name={`invaller-${match.id}-${spelerId}`} value={k.id} checked={gekozen === k.id}
            onChange={() => { setGekozen(k.id); setBevestigd(false); setMelding(''); setVraagOpen(false) }} disabled={bezig} />
          {k.naam}
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 8px', borderRadius: '10px', background: k.niveau === 'gelijk' ? '#DCFCE7' : '#FEF9C3', color: k.niveau === 'gelijk' ? '#166534' : '#854D0E' }}>
            {k.niveau === 'gelijk' ? 'same level' : 'level unknown'}
          </span>
        </label>
      ))}
    </fieldset>
  )

  return (
    <form onSubmit={opslaan} style={{ margin: '8px 0 4px 0', padding: '12px 14px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#374151' }}>Substitute for {spelerNaam(match, spelerId)}</p>
      {kandidaten === null ? (
        <span style={{ color: '#6B7280', fontSize: '13px' }}>Loading...</span>
      ) : (
        <>
          {sectie('Waiting list', kandidaten.filter(k => k.bron === 'wachtlijst'))}
          {sectie('Club players', kandidaten.filter(k => k.bron === 'club'))}
        </>
      )}
      {bevestigingNodig && (
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#374151' }}>
          <input type="checkbox" checked={bevestigd} onChange={e => { setBevestigd(e.target.checked); setVraagOpen(false) }} required style={{ marginTop: '2px' }} />
          The level of one of the two players is unknown. I confirm that this substitute has the same level.
        </label>
      )}
      {melding && <p role="status" style={{ color: '#DC2626', fontSize: '13px', fontWeight: 600, margin: 0 }}>{melding}</p>}
      {vraagOpen ? (
        <Bevestiging vraag={wisVraag} bezig={bezig} onJa={() => { void verstuur() }} onAnnuleer={() => setVraagOpen(false)} />
      ) : (
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button type="submit" disabled={bezig || !keuze} style={{ background: '#1F5C99', color: '#ffffff', padding: '6px 16px', borderRadius: '6px', border: 'none', fontWeight: 700, fontSize: '12px', cursor: bezig || !keuze ? 'not-allowed' : 'pointer', opacity: bezig || !keuze ? 0.6 : 1 }}>
          {bezig ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={onSluit} disabled={bezig} style={{ ...linkStijl, color: '#6B7280' }}>Cancel</button>
      </div>
      )}
    </form>
  )
}
