'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { useDemo } from '@/lib/useDemo'
import TenantNav from '@/components/TenantNav'
import { useTenantContext } from '@/lib/TenantContext'
import { formatDatum, heeftUitkomst, isUitkomst, kanUitslagenInvoeren, laadMatches, periode, rondeStatusLabel, teamsTekst, uitkomstLabel, type MatchInfo, type Uitkomst } from '@/lib/ronde-weergave'
import { STANDAARD_FORFAIT_GAMES } from '@/lib/wedstrijd-instellingen'
import InvallerBeheer from '@/components/InvallerBeheer'

interface RondeInfo { id: string; wedstrijd_id: string; ronde_nummer: number; status: string; start_datum: string | null; eind_datum: string | null }
interface VolgendeRonde { id: string; status: string; heeftUitslagen: boolean }

const MAX_GAMES = 99

// What the match form submits: the chosen outcome and its fields (as typed).
interface UitkomstInvoer { uitkomst: Uitkomst; g1: string; g2: string; forfait: string; afwezige: string }

// Parses a games input: null for empty, NaN when not a whole number between 0 and 99.
function leesGames(waarde: string): number | null {
  const tekst = waarde.trim()
  if (tekst === '') return null
  if (!/^\d+$/.test(tekst)) return NaN
  const getal = Number(tekst)
  return getal <= MAX_GAMES ? getal : NaN
}

export default function RondeUitslagPage() {
  const [ronde, setRonde] = useState<RondeInfo | null>(null)
  const [matches, setMatches] = useState<MatchInfo[]>([])
  const [ingevoerdDoor, setIngevoerdDoor] = useState<string | null>(null)
  const [forfaitGames, setForfaitGames] = useState(STANDAARD_FORFAIT_GAMES)
  const [laden, setLaden] = useState(true)
  const [laadFout, setLaadFout] = useState('')
  const [opslaan, setOpslaan] = useState<string | null>(null)
  const [meldingen, setMeldingen] = useState<Record<string, { ok: boolean; tekst: string }>>({})
  const [volgende, setVolgende] = useState<VolgendeRonde | null>(null)
  const [rondeBezig, setRondeBezig] = useState(false)
  const [rondeMelding, setRondeMelding] = useState<{ ok: boolean; tekst: string } | null>(null)
  const params = useParams()
  const supabase = createClient()
  const { primaryColor, secondaryColor } = useTenantContext()
  const { isDemo } = useDemo()
  const rondeId = params.rondeId as string

  useEffect(() => { laadData(); laadInvoerder() }, [])

  async function laadData() {
    const { data: rondeData, error } = await supabase
      .from('rondes')
      .select('id, wedstrijd_id, ronde_nummer, status, start_datum, eind_datum, wedstrijden(forfait_games)')
      .eq('id', rondeId)
      .single()
    if (error || !rondeData) { setLaadFout('Could not load this round.'); setLaden(false); return }
    // The competition's forfeit games come along in the same query (embedded wedstrijden row).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wedstrijd: any = Array.isArray(rondeData.wedstrijden) ? rondeData.wedstrijden[0] : rondeData.wedstrijden
    setForfaitGames(wedstrijd?.forfait_games ?? STANDAARD_FORFAIT_GAMES)
    setRonde(rondeData)
    const { matches: geladen, fout } = await laadMatches(supabase, [rondeId])
    if (fout) setLaadFout('Could not load the matches.')
    setMatches(geladen)
    setVolgende(await laadVolgendeRonde(rondeData))
    setLaden(false)
  }

  // The next round of the same competition, and whether any of its matches has a result.
  async function laadVolgendeRonde(huidig: RondeInfo): Promise<VolgendeRonde | null> {
    const { data } = await supabase
      .from('rondes')
      .select('id, status')
      .eq('wedstrijd_id', huidig.wedstrijd_id)
      .eq('ronde_nummer', huidig.ronde_nummer + 1)
      .maybeSingle()
    if (!data) return null
    const { matches: volgendeMatches } = await laadMatches(supabase, [data.id])
    return { id: data.id, status: data.status, heeftUitslagen: volgendeMatches.some(heeftUitkomst) }
  }

  // Opens the next round when it is still 'Gepland'. Never closes or changes an opened round.
  async function openVolgendeRonde(huidig: RondeInfo): Promise<string | null> {
    const { error } = await supabase
      .from('rondes')
      .update({ status: 'Open', gestart_op: new Date().toISOString() })
      .eq('wedstrijd_id', huidig.wedstrijd_id)
      .eq('ronde_nummer', huidig.ronde_nummer + 1)
      .eq('status', 'Gepland')
    return error ? `The next round could not be opened: ${error.message}` : null
  }

  // sets.ingevoerd_door references gebruikers(id); fill it when the current user has such a row.
  async function laadInvoerder() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('gebruikers').select('id').eq('auth_id', user.id).maybeSingle()
    setIngevoerdDoor(data?.id ?? null)
  }

  // Complete when every match of the round has a result; back to Open when one is missing.
  // Only switches between 'Open' and 'Volledig'; a round is never closed automatically.
  async function werkRondeStatusBij() {
    const { data: huidig } = await supabase.from('rondes').select('status').eq('id', rondeId).single()
    if (!huidig || (huidig.status !== 'Open' && huidig.status !== 'Volledig')) return null
    const { matches: actueel, fout } = await laadMatches(supabase, [rondeId])
    if (fout || actueel.length === 0) return 'Could not check whether the round is complete.'
    const compleet = actueel.every(heeftUitkomst)
    const nieuweStatus = compleet ? 'Volledig' : 'Open'
    if (nieuweStatus === huidig.status) return null
    const { error } = await supabase.from('rondes').update({ status: nieuweStatus }).eq('id', rondeId)
    if (error) return `Result saved, but the round status could not be updated: ${error.message}`
    // A complete round opens the next one. Clearing a result later does not close the next round again.
    if (nieuweStatus === 'Volledig' && ronde) return openVolgendeRonde(ronde)
    return null
  }

  async function sluitRonde() {
    if (isDemo || !ronde || (ronde.status !== 'Open' && ronde.status !== 'Volledig')) return
    const { matches: actueel, fout } = await laadMatches(supabase, [rondeId])
    if (fout) { setRondeMelding({ ok: false, tekst: 'Could not load the matches.' }); return }
    const zonderUitslag = actueel.filter(m => m.uitslag && !heeftUitkomst(m))
    const akkoord = window.confirm(`${zonderUitslag.length} matches without a result will be closed as both teams absent, with 0 points for all four players. Close the round?`)
    if (!akkoord) return

    setRondeBezig(true); setRondeMelding(null)
    const nu = new Date().toISOString()
    let foutTekst: string | null = null

    if (zonderUitslag.length > 0) {
      const { error: uitslagFout } = await supabase
        .from('sets')
        .update({ games_team1: 0, games_team2: 0, ingevoerd_op: nu, ingevoerd_door: ingevoerdDoor })
        .in('id', zonderUitslag.map(m => m.uitslag!.id))
      if (uitslagFout) foutTekst = `Could not close the open matches: ${uitslagFout.message}`
      else {
        const { error: groepFout } = await supabase
          .from('groepen')
          .update({ status: 'niet_gespeeld' })
          .in('id', zonderUitslag.map(m => m.id))
        if (groepFout) foutTekst = `Could not mark the open matches as not played: ${groepFout.message}`
      }
    }

    if (!foutTekst) {
      const { error: rondeFout } = await supabase
        .from('rondes')
        .update({ status: 'Afgesloten', afgesloten_op: nu })
        .eq('id', rondeId)
      if (rondeFout) foutTekst = `Could not close the round: ${rondeFout.message}`
      else foutTekst = await openVolgendeRonde(ronde)
    }

    setRondeMelding(foutTekst ? { ok: false, tekst: foutTekst } : { ok: true, tekst: 'Round closed.' })
    setRondeBezig(false)
    await laadData()
  }

  async function heropenRonde() {
    if (isDemo || !ronde || ronde.status !== 'Afgesloten') return
    setRondeBezig(true); setRondeMelding(null)
    // Check again: reopening is only allowed while the next round has no results.
    const actueleVolgende = await laadVolgendeRonde(ronde)
    if (actueleVolgende?.heeftUitslagen) {
      setRondeMelding({ ok: false, tekst: 'This round cannot be reopened because the next round already has results.' })
      setRondeBezig(false)
      await laadData()
      return
    }
    const { matches: actueel, fout } = await laadMatches(supabase, [rondeId])
    if (fout || actueel.length === 0) {
      setRondeMelding({ ok: false, tekst: 'Could not load the matches.' })
      setRondeBezig(false)
      return
    }
    // 'niet_gespeeld' matches keep their 0 - 0 (both teams absent) and count as having a result, so they can be edited.
    const nieuweStatus = actueel.every(heeftUitkomst) ? 'Volledig' : 'Open'
    const { error } = await supabase
      .from('rondes')
      .update({ status: nieuweStatus, afgesloten_op: null })
      .eq('id', rondeId)
    setRondeMelding(error ? { ok: false, tekst: `Could not reopen the round: ${error.message}` } : { ok: true, tekst: 'Round reopened.' })
    setRondeBezig(false)
    await laadData()
  }

  async function slaUitkomstOp(match: MatchInfo, invoer: UitkomstInvoer) {
    if (isDemo || !match.uitslag) return
    const meld = (ok: boolean, tekst: string) => setMeldingen(prev => ({ ...prev, [match.id]: { ok, tekst } }))
    const nu = new Date().toISOString()
    const metInvoerder = (games_team1: number, games_team2: number) => ({ games_team1, games_team2, ingevoerd_op: nu, ingevoerd_door: ingevoerdDoor })

    // Work out the set row, the match status and the absent player for the chosen outcome.
    let setRij: Record<string, unknown>
    let groepStatus: string
    let afwezige: string | null = null
    let okTekst: string

    if (invoer.uitkomst === 'gespeeld') {
      const g1 = leesGames(invoer.g1)
      const g2 = leesGames(invoer.g2)
      const wissen = g1 === null && g2 === null
      if (!wissen && (g1 === null || g2 === null)) { meld(false, 'Enter games for both teams, or leave both empty to clear the result.'); return }
      if (Number.isNaN(g1) || Number.isNaN(g2)) { meld(false, `Games must be whole numbers from 0 to ${MAX_GAMES}.`); return }
      setRij = wissen ? { games_team1: null, games_team2: null, ingevoerd_op: null, ingevoerd_door: null } : metInvoerder(g1!, g2!)
      groepStatus = wissen ? 'gepland' : 'gespeeld'
      okTekst = wissen ? 'Result cleared.' : 'Result saved.'
    } else if (invoer.uitkomst === 'niet_gespeeld') {
      setRij = metInvoerder(0, 0)
      groepStatus = 'niet_gespeeld'
      okTekst = 'Saved: both teams absent.'
    } else {
      const f = leesGames(invoer.forfait)
      if (f === null || Number.isNaN(f)) { meld(false, `${invoer.uitkomst === 'speler_afwezig' ? 'Games for the other players' : 'Games for the other team'} must be a whole number from 0 to ${MAX_GAMES}.`); return }
      if (invoer.uitkomst === 'forfait_team1') { setRij = metInvoerder(0, f); okTekst = 'Saved: team 1 forfait.' }
      else if (invoer.uitkomst === 'forfait_team2') { setRij = metInvoerder(f, 0); okTekst = 'Saved: team 2 forfait.' }
      else {
        const u = match.uitslag
        const vier = [u.team1_speler1_id, u.team1_speler2_id, u.team2_speler1_id, u.team2_speler2_id]
        if (!vier.includes(invoer.afwezige)) { meld(false, 'Choose the player who was absent.'); return }
        afwezige = invoer.afwezige
        setRij = metInvoerder(f, f)
        okTekst = 'Saved: player absent, no substitute.'
      }
      groepStatus = invoer.uitkomst
    }

    setOpslaan(match.id)
    const { error: uitslagFout } = await supabase.from('sets').update(setRij).eq('id', match.uitslag.id)
    if (uitslagFout) {
      meld(false, `Could not save the result: ${uitslagFout.message}`)
      setOpslaan(null)
      return
    }

    // groep_spelers.afwezig: only the chosen player for 'Player absent, no substitute'; cleared for every other outcome.
    let afwezigFout = (await supabase.from('groep_spelers').update({ afwezig: false }).eq('groep_id', match.id)).error
    if (!afwezigFout && afwezige) {
      afwezigFout = (await supabase.from('groep_spelers').update({ afwezig: true }).eq('groep_id', match.id).eq('speler_id', afwezige)).error
    }

    const { error: groepFout } = await supabase.from('groepen').update({ status: groepStatus }).eq('id', match.id)
    const statusFout = await werkRondeStatusBij()

    if (groepFout) meld(false, `Result saved, but the match status could not be updated: ${groepFout.message}`)
    else if (afwezigFout) meld(false, `Result saved, but the absent player could not be updated: ${afwezigFout.message}`)
    else if (statusFout) meld(false, statusFout)
    else meld(true, okTekst)

    setOpslaan(null)
    await laadData()
  }

  if (laden) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', background: primaryColor }}>
      <div style={{ color: secondaryColor }}>Loading...</div>
    </div>
  )

  const invoerOpen = ronde?.status === 'Open' || ronde?.status === 'Volledig'
  const bewerkbaar = kanUitslagenInvoeren(ronde?.status, isDemo)
  const kanHeropenen = ronde?.status === 'Afgesloten' && !volgende?.heeftUitslagen
  const knopStijl = { background: 'transparent', color: '#ffffff', padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '12px' }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>

      <TenantNav back={{ href: `/beheer/wedstrijden/${params.id}/schema`, label: 'Schedule' }} />

      {isDemo && (
        <div style={{ background: '#FEF9C3', borderBottom: '1px solid #FDE68A', padding: '10px 32px', textAlign: 'center' }}>
          <span style={{ color: '#854D0E', fontSize: '13px', fontWeight: 600 }}>🔍 Demo mode — read only. Entering results is not available in demo.</span>
        </div>
      )}

      <div style={{ background: primaryColor, padding: '32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <p style={{ color: secondaryColor, fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Admin</p>
          <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 8px 0' }}>
            Round {ronde?.ronde_nummer ?? ''} — {bewerkbaar ? 'Enter results' : 'View results'}
          </h1>
          {ronde && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px' }}>{periode(ronde.start_datum, ronde.eind_datum)}</span>
              <span style={{ background: 'rgba(255,255,255,0.12)', color: '#ffffff', padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>{rondeStatusLabel(ronde.status)}</span>
              {!isDemo && invoerOpen && (
                <button type="button" onClick={sluitRonde} disabled={rondeBezig} style={{ ...knopStijl, cursor: 'pointer' }}>
                  {rondeBezig ? 'Closing...' : 'Close round'}
                </button>
              )}
              {!isDemo && ronde.status === 'Afgesloten' && (
                <button type="button" onClick={heropenRonde} disabled={rondeBezig || !kanHeropenen} style={{ ...knopStijl, cursor: kanHeropenen ? 'pointer' : 'not-allowed', opacity: kanHeropenen ? 1 : 0.6 }}>
                  {rondeBezig ? 'Reopening...' : 'Reopen round'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {laadFout && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', color: '#DC2626', fontSize: '14px' }}>⚠ {laadFout}</div>
        )}
        {ronde?.status === 'Gepland' && (
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '12px 16px', color: '#1E40AF', fontSize: '14px', fontWeight: 600 }}>
            {ronde.ronde_nummer === 1
              ? `This round opens on ${formatDatum(ronde.start_datum)}.`
              : 'This round opens when the previous round is complete.'}
          </div>
        )}
        {ronde?.status === 'Afgesloten' && (
          <div style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 16px', color: '#475569', fontSize: '14px', fontWeight: 600 }}>
            This round is closed. Results can no longer be changed.
            {!isDemo && !kanHeropenen && ' It cannot be reopened because the next round already has results.'}
          </div>
        )}
        {rondeMelding && (
          <div role="status" style={{ background: rondeMelding.ok ? '#DCFCE7' : '#FEF2F2', border: `1px solid ${rondeMelding.ok ? '#BBF7D0' : '#FECACA'}`, borderRadius: '8px', padding: '12px 16px', color: rondeMelding.ok ? '#166534' : '#DC2626', fontSize: '14px', fontWeight: 600 }}>
            {rondeMelding.tekst}
          </div>
        )}
        {bewerkbaar && (
          <p style={{ color: '#6B7280', fontSize: '13px', margin: 0 }}>To clear a result, choose Played, empty both fields and save.</p>
        )}

        {matches.map(match => (
          <MatchFormulier
            // Remount when the stored result changes, so the inputs show the saved values.
            key={`${match.id}:${match.status ?? ''}:${match.afwezig_speler_id ?? ''}:${match.uitslag?.games_team1 ?? ''}:${match.uitslag?.games_team2 ?? ''}:${match.invallers.map(i => i.speler_id).join(',')}`}
            match={match}
            forfaitGames={forfaitGames}
            bewerkbaar={bewerkbaar}
            uitgeschakeld={ronde?.status === 'Gepland'}
            opslaan={opslaan === match.id}
            melding={meldingen[match.id]}
            onOpslaan={invoer => slaUitkomstOp(match, invoer)}
            onInvallerGewijzigd={laadData}
          />
        ))}
      </div>

    </div>
  )
}

const UITKOMST_OPTIES: { waarde: Uitkomst; label: string }[] = [
  { waarde: 'gespeeld', label: 'Played' },
  { waarde: 'forfait_team1', label: 'Team 1 forfait' },
  { waarde: 'forfait_team2', label: 'Team 2 forfait' },
  { waarde: 'speler_afwezig', label: 'Player absent, no substitute' },
  { waarde: 'niet_gespeeld', label: 'Both teams absent' },
]

// Forfeit games shown for a stored outcome (F is stored in the set row), else the competition default.
function opgeslagenForfait(match: MatchInfo, standaard: number) {
  const u = match.uitslag
  if (match.status === 'forfait_team1') return u?.games_team2 ?? standaard
  if (match.status === 'forfait_team2') return u?.games_team1 ?? standaard
  if (match.status === 'speler_afwezig') return u?.games_team1 ?? standaard
  return standaard
}

function MatchFormulier({ match, forfaitGames, bewerkbaar, uitgeschakeld, opslaan, melding, onOpslaan, onInvallerGewijzigd }: {
  match: MatchInfo
  forfaitGames: number
  bewerkbaar: boolean
  uitgeschakeld: boolean
  opslaan: boolean
  melding?: { ok: boolean; tekst: string }
  onOpslaan: (invoer: UitkomstInvoer) => void
  onInvallerGewijzigd: () => Promise<void>
}) {
  const opgeslagenUitkomst: Uitkomst = isUitkomst(match.status) ? match.status : 'gespeeld'
  const gespeeld = opgeslagenUitkomst === 'gespeeld'
  const [uitkomst, setUitkomst] = useState<Uitkomst>(opgeslagenUitkomst)
  const [g1, setG1] = useState(gespeeld ? match.uitslag?.games_team1?.toString() ?? '' : '')
  const [g2, setG2] = useState(gespeeld ? match.uitslag?.games_team2?.toString() ?? '' : '')
  const [forfait, setForfait] = useState(String(opgeslagenForfait(match, forfaitGames)))
  const [afwezige, setAfwezige] = useState(match.afwezig_speler_id ?? '')
  const { primaryColor, secondaryColor } = useTenantContext()
  const opgeslagen = heeftUitkomst(match)
  // Substitute links: only on an editable page (kanUitslagenInvoeren via bewerkbaar), and only while the match
  // has no result or the outcome 'Player absent, no substitute' (which assigning a substitute replaces).
  const metInvaller = match.invallers.length > 0
  const magInvallerToewijzen = bewerkbaar && !uitgeschakeld && (!opgeslagen || match.status === 'speler_afwezig')
  const magInvallerVerwijderen = bewerkbaar && !uitgeschakeld && !opgeslagen
  // With a substitute the outcome 'Player absent, no substitute' is not offered (unless it is the current value).
  const uitkomstOpties = UITKOMST_OPTIES.filter(o => !(metInvaller && o.waarde === 'speler_afwezig' && uitkomst !== 'speler_afwezig'))
  const label = uitkomstLabel(match.status)
  const inputStyle = {
    width: '60px', padding: '6px 8px', border: '1px solid #E5E7EB', borderRadius: '6px',
    fontSize: '15px', textAlign: 'center' as const, fontWeight: 700,
    background: bewerkbaar ? '#ffffff' : '#F9FAFB',
  }
  const tekstStijl = { color: '#6B7280', fontSize: '12px' }
  const rij = { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const }
  const u = match.uitslag
  const naam = (id: string) => {
    const speler = match.spelers.find(s => s.id === id)
    return speler ? `${speler.voornaam} ${speler.achternaam}` : '?'
  }
  const vier = u ? [
    { id: u.team1_speler1_id, team: 1 }, { id: u.team1_speler2_id, team: 1 },
    { id: u.team2_speler1_id, team: 2 }, { id: u.team2_speler2_id, team: 2 },
  ] : []

  const forfaitVeld = (
    <div style={rij}>
      <label style={tekstStijl} htmlFor={`f-${match.id}`}>{uitkomst === 'speler_afwezig' ? 'Games for the other players' : 'Games for the other team'}</label>
      <input id={`f-${match.id}`} type="number" inputMode="numeric" min={0} max={MAX_GAMES} step={1} value={forfait} onChange={e => setForfait(e.target.value)}
        readOnly={!bewerkbaar} disabled={uitgeschakeld} style={inputStyle} />
    </div>
  )

  return (
    <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ background: primaryColor, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: secondaryColor, fontWeight: 700, fontSize: '13px' }}>Match {match.baan_nummer}{metInvaller ? ' (with substitute)' : ''}</span>
        {label && <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 600 }}>{label}</span>}
      </div>
      <div style={{ padding: '14px 20px' }}>
        <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 12px 0' }}>{teamsTekst(match)}</p>
        <InvallerBeheer match={match} magToewijzen={magInvallerToewijzen} magVerwijderen={magInvallerVerwijderen} onGewijzigd={onInvallerGewijzigd} />
        {u ? (
          <form
            onSubmit={e => { e.preventDefault(); onOpslaan({ uitkomst, g1, g2, forfait, afwezige }) }}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <div style={rij}>
              <label style={tekstStijl} htmlFor={`uitkomst-${match.id}`}>Outcome</label>
              <select id={`uitkomst-${match.id}`} value={uitkomst} onChange={e => setUitkomst(e.target.value as Uitkomst)}
                disabled={!bewerkbaar || uitgeschakeld}
                style={{ padding: '6px 8px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px', background: bewerkbaar ? '#ffffff' : '#F9FAFB' }}>
                {uitkomstOpties.map(o => <option key={o.waarde} value={o.waarde}>{o.label}</option>)}
              </select>
            </div>

            {uitkomst === 'gespeeld' && (
              <div style={rij}>
                <label style={tekstStijl} htmlFor={`g1-${match.id}`}>Games team 1</label>
                <input id={`g1-${match.id}`} type="number" inputMode="numeric" min={0} max={MAX_GAMES} step={1} value={g1} onChange={e => setG1(e.target.value)}
                  readOnly={!bewerkbaar} disabled={uitgeschakeld} style={inputStyle} />
                <span style={{ color: '#9CA3AF', fontWeight: 700 }}>-</span>
                <input id={`g2-${match.id}`} type="number" inputMode="numeric" min={0} max={MAX_GAMES} step={1} value={g2} onChange={e => setG2(e.target.value)}
                  readOnly={!bewerkbaar} disabled={uitgeschakeld} style={inputStyle} />
                <label style={tekstStijl} htmlFor={`g2-${match.id}`}>Games team 2</label>
              </div>
            )}

            {(uitkomst === 'forfait_team1' || uitkomst === 'forfait_team2') && forfaitVeld}

            {uitkomst === 'speler_afwezig' && (
              <>
                <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <legend style={{ ...tekstStijl, marginBottom: '6px' }}>Who was absent?</legend>
                  {vier.map(s => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#374151' }}>
                      <input type="radio" name={`afwezig-${match.id}`} value={s.id} checked={afwezige === s.id}
                        onChange={() => setAfwezige(s.id)} disabled={!bewerkbaar || uitgeschakeld} />
                      {naam(s.id)} <span style={{ color: '#9CA3AF', fontSize: '12px' }}>(team {s.team})</span>
                    </label>
                  ))}
                </fieldset>
                {forfaitVeld}
                <p style={{ ...tekstStijl, margin: 0 }}>The three other players each get these games. The absent player gets 0 games and an F.</p>
              </>
            )}

            {uitkomst === 'niet_gespeeld' && (
              <p style={{ ...tekstStijl, margin: 0 }}>Saved as 0 - 0. All four players get 0 points.</p>
            )}

            {bewerkbaar && (
              <div>
                <button
                  type="submit"
                  disabled={opslaan}
                  style={{
                    background: opgeslagen ? '#DCFCE7' : secondaryColor,
                    color: opgeslagen ? '#166534' : primaryColor,
                    padding: '6px 16px', borderRadius: '6px', border: 'none',
                    fontWeight: 700, fontSize: '12px', cursor: 'pointer', opacity: opslaan ? 0.7 : 1,
                  }}
                >
                  {opslaan ? '...' : 'Save'}
                </button>
              </div>
            )}
          </form>
        ) : (
          <p style={{ color: '#DC2626', fontSize: '13px', margin: 0 }}>This match has no result row.</p>
        )}
        {melding && (
          <p style={{ color: melding.ok ? '#166534' : '#DC2626', fontSize: '13px', fontWeight: 600, margin: '10px 0 0 0' }} role="status">{melding.tekst}</p>
        )}
      </div>
    </div>
  )
}
