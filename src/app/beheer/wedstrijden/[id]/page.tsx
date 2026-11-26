'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { useDemo } from '@/lib/useDemo'
import type { Wedstrijd, Speler, Deelname } from '@/types/database'
import TenantNav from '@/components/TenantNav'
import { useTenantContext } from '@/lib/TenantContext'
import WedstrijdInstellingenVelden from '@/components/WedstrijdInstellingenVelden'
import { aantalRondesVan, leesForfaitGames, legeInstellingen, naarPayload, waardenUitWedstrijd, type InstellingenWaarden } from '@/lib/wedstrijd-instellingen'

type DeelnameMetSpeler = Deelname & {
  spelers: { voornaam: string; achternaam: string; geslacht: string; status: string } | null
}

type GenereerAntwoord = { status: number; data: { fout?: string; rondes?: number; wedstrijden_per_ronde?: number; einddatum?: string } }

export default function WedstrijdBeheerPage() {
  const [wedstrijd, setWedstrijd] = useState<Wedstrijd | null>(null)
  const [alleSpelers, setAlleSpelers] = useState<Speler[]>([])
  const [deelnames, setDeelnames] = useState<DeelnameMetSpeler[]>([])
  const [geselecteerd, setGeselecteerd] = useState<Set<string>>(new Set())
  const [instellingen, setInstellingen] = useState<InstellingenWaarden>(legeInstellingen)
  const [bestaandeRondes, setBestaandeRondes] = useState(0)
  const [naam, setNaam] = useState('')
  const [laden, setLaden] = useState(true)
  const [opslaan, setOpslaan] = useState(false)
  const [bericht, setBericht] = useState('')
  const [fout, setFout] = useState('')
  const params = useParams()
  const supabase = createClient()
  const { primaryColor, secondaryColor } = useTenantContext()
  const { isDemo } = useDemo()
  const id = params.id as string

  useEffect(() => { laadData() }, [])

  async function laadData() {
    const [{ data: w }, { data: s }, { data: d }, { count: rondesAantal }] = await Promise.all([
      supabase.from('wedstrijden').select('*').eq('id', id).single(),
      supabase.from('spelers').select('*').eq('status', 'Actief').order('achternaam'),
      supabase.from('deelnames').select('*, spelers(voornaam, achternaam, geslacht, status)').eq('wedstrijd_id', id),
      supabase.from('rondes').select('id', { count: 'exact', head: true }).eq('wedstrijd_id', id),
    ])
    setBestaandeRondes(rondesAantal ?? 0)
    setWedstrijd(w)
    if (w) { setInstellingen(waardenUitWedstrijd(w)); setNaam(w.naam ?? '') }
    setAlleSpelers(s ?? [])
    setDeelnames((d ?? []) as DeelnameMetSpeler[])
    setGeselecteerd(new Set((d ?? []).map((x: Deelname) => x.speler_id)))
    setLaden(false)
  }

  const isConcept = wedstrijd?.status === 'Concept'
  const maxDeelnemers = wedstrijd?.max_deelnemers ?? 0
  // Only confirmed participants whose speler is still active count, exactly as the schedule route does.
  const bevestigdeActieven = deelnames.filter(d => d.uitnodiging_status === 'bevestigd' && d.spelers?.status === 'Actief')
  const kanStarten = isConcept && maxDeelnemers > 0 && bevestigdeActieven.length === maxDeelnemers

  function toggleSpeler(sid: string) {
    if (!isConcept || isDemo) return
    setGeselecteerd(prev => {
      const n = new Set(prev)
      if (n.has(sid)) n.delete(sid)
      else if (n.size < maxDeelnemers) n.add(sid)
      return n
    })
    setFout(''); setBericht('')
  }

  async function handleKlaar() {
    if (isDemo || !isConcept) return
    const aantal = geselecteerd.size
    if (aantal === 0) { setFout('Select at least one player.'); return }
    if (aantal > maxDeelnemers) { setFout(`You can select at most ${maxDeelnemers} players.`); return }
    setOpslaan(true); setFout(''); setBericht('')
    await supabase.from('deelnames').delete().eq('wedstrijd_id', id)
    const nieuweDeelnames = [...geselecteerd].map(speler_id => ({
      wedstrijd_id: id, speler_id, uitnodiging_status: 'bevestigd' as const,
    }))
    const { error } = await supabase.from('deelnames').insert(nieuweDeelnames)
    if (error) { setFout(`Error: ${error.message}`) }
    else { setBericht(`✓ ${aantal} participants saved!`); await laadData() }
    setOpslaan(false)
  }

  async function slaInstellingenOp(e: React.FormEvent) {
    e.preventDefault()
    if (isDemo) return
    setFout(''); setBericht('')
    // Same rule as when creating: the name is required (no length limit there either).
    if (!naam.trim()) { setFout('Enter a competition name.'); return }

    // After the start only the name and the forfeit settings can change: forfeit games (default for new
    // forfeits) and showing F publicly.
    if (!isConcept) {
      const forfait = leesForfaitGames(instellingen.forfaitGames)
      if ('fout' in forfait) { setFout(forfait.fout); return }
      setOpslaan(true)
      const { error } = await supabase.from('wedstrijden').update({ naam, forfait_games: forfait.forfait_games, toon_forfaits_publiek: instellingen.toonForfaitsPubliek }).eq('id', id)
      if (error) setFout(`Error: ${error.message}`)
      else { setBericht('✓ Settings saved.'); await laadData() }
      setOpslaan(false)
      return
    }

    const resultaat = naarPayload(instellingen)
    if ('fout' in resultaat) { setFout(resultaat.fout); return }
    if (geselecteerd.size > resultaat.payload.max_deelnemers) {
      setFout(`${geselecteerd.size} players are selected; remove some before lowering the maximum to ${resultaat.payload.max_deelnemers}.`)
      return
    }
    setOpslaan(true)
    const { error } = await supabase.from('wedstrijden').update({ ...resultaat.payload, naam }).eq('id', id)
    if (error) setFout(`Error: ${error.message}`)
    else { setBericht('✓ Settings saved.'); await laadData() }
    setOpslaan(false)
  }

  async function roepGenereerAan(bevestigWissen: boolean): Promise<GenereerAntwoord> {
    const response = await fetch('/api/schema/genereer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bevestigWissen ? { wedstrijd_id: id, bevestig_wissen: true } : { wedstrijd_id: id }),
    })
    return { status: response.status, data: await response.json().catch(() => ({})) }
  }

  // Calls the route, with the confirmation flow when results already exist. Returns the data on success.
  async function genereer(): Promise<GenereerAntwoord['data'] | null> {
    let { status, data } = await roepGenereerAan(false)
    if (status === 409) {
      const akkoord = window.confirm(
        'Results have already been entered for this competition.\n\n' +
        'Generating a new schedule will permanently DELETE ALL entered results and the current rounds. This cannot be undone.\n\n' +
        'Do you want to continue?'
      )
      if (!akkoord) {
        setFout('Schedule not regenerated. Existing results were kept.')
        return null
      }
      ;({ status, data } = await roepGenereerAan(true))
    }

    if (status === 422) { setFout(data.fout || 'A schedule for this number of players is not available.'); return null }
    if (data.fout) { setFout(`Error: ${data.fout}`); return null }
    if (status >= 400) { setFout('Error: Could not generate the schedule.'); return null }
    return data
  }

  const resultaatTekst = (data: GenereerAntwoord['data']) =>
    `${data.rondes} rounds, ${data.wedstrijden_per_ronde} matches per round, last round ends ${data.einddatum}.`

  async function startCompetitie() {
    if (isDemo || !kanStarten) return
    const akkoord = window.confirm('Start the competition? Participants can no longer be added or removed, and the schedule is generated.')
    if (!akkoord) return

    setOpslaan(true); setFout(''); setBericht('')
    const data = await genereer()
    if (!data) { setOpslaan(false); return }

    // The status only changes once the schedule exists.
    const { error } = await supabase.from('wedstrijden').update({ status: 'Actief' }).eq('id', id)
    if (error) {
      setFout(`The schedule was generated, but the competition could not be started: ${error.message}. Please try again.`)
    } else {
      setBericht(`✓ Competition started! ${resultaatTekst(data)}`)
    }
    await laadData()
    setOpslaan(false)
  }

  async function regenereerSchema() {
    if (isDemo) return
    setOpslaan(true); setFout(''); setBericht('')
    const data = await genereer()
    if (data) {
      setBericht(`✓ Schedule regenerated! ${resultaatTekst(data)}`)
      await laadData()
    }
    setOpslaan(false)
  }

  if (laden) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', background: primaryColor }}>
      <div style={{ color: secondaryColor }}>Loading...</div>
    </div>
  )
  if (!wedstrijd) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>Not found.</div>

  const aantalGeselecteerd = geselecteerd.size
  const vol = aantalGeselecteerd >= maxDeelnemers
  const rondesTekst = `${aantalRondesVan(wedstrijd, bestaandeRondes)}${wedstrijd.datum_tot ? ` · until ${wedstrijd.datum_tot}` : ''}`

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>

      <TenantNav back={{ href: '/beheer/wedstrijden', label: 'Competitions' }} />

      {isDemo && (
        <div style={{ background: '#FEF9C3', borderBottom: '1px solid #FDE68A', padding: '10px 32px', textAlign: 'center' }}>
          <span style={{ color: '#854D0E', fontSize: '13px', fontWeight: 600 }}>🔍 Demo mode — read only</span>
        </div>
      )}

      <div style={{ background: primaryColor, padding: '32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ color: secondaryColor, fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Admin</p>
            <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 8px 0' }}>{wedstrijd.naam}</h1>
            <span style={{ background: wedstrijd.status === 'Actief' ? '#DCFCE7' : '#FEF9C3', color: wedstrijd.status === 'Actief' ? '#166534' : '#854D0E', padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
              {wedstrijd.status === 'Actief' ? 'Active' : wedstrijd.status === 'Afgesloten' ? 'Closed' : 'Draft'}
            </span>
          </div>
          {!isDemo && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              {isConcept && (
                <>
                  <button onClick={startCompetitie} disabled={opslaan || !kanStarten} style={{ background: kanStarten ? '#16A34A' : '#6B7280', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '14px', cursor: kanStarten && !opslaan ? 'pointer' : 'not-allowed', opacity: kanStarten ? 1 : 0.7 }}>
                    {opslaan ? 'Working...' : '▶ Start competition'}
                  </button>
                  {!kanStarten && (
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                      You need exactly {maxDeelnemers} participants (now {bevestigdeActieven.length}).
                    </span>
                  )}
                </>
              )}
              {wedstrijd.status === 'Actief' && (
                <button onClick={regenereerSchema} disabled={opslaan} style={{ background: 'transparent', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                  {opslaan ? 'Working...' : '↻ Regenerate schedule'}
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
            { label: 'Rounds', value: rondesTekst },
            { label: 'Matches per round', value: String(maxDeelnemers / 4) },
            { label: 'Participants', value: `${bevestigdeActieven.length} / ${maxDeelnemers}` },
          ].map(item => (
            <div key={item.label} style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px' }}>
              <p style={{ color: '#9CA3AF', fontSize: '12px', margin: '0 0 4px 0' }}>{item.label}</p>
              <p style={{ color: primaryColor, fontWeight: 700, fontSize: '15px', margin: 0 }}>{item.value}</p>
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
                <div style={{ color: primaryColor, fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{item.title}</div>
                <div style={{ color: '#9CA3AF', fontSize: '12px' }}>{item.desc}</div>
              </a>
            ))}
          </div>
        )}

        {bericht && <div style={{ background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#166534', fontSize: '14px', fontWeight: 600 }}>{bericht}</div>}
        {fout && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#DC2626', fontSize: '14px' }}>⚠ {fout}</div>}

        <form onSubmit={slaInstellingenOp} style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: primaryColor, fontWeight: 800, fontSize: '15px', margin: 0 }}>Settings</h2>
            {!isConcept && <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Only the name and the forfait settings can be changed after the competition has started</span>}
          </div>
          <WedstrijdInstellingenVelden
            waarden={instellingen}
            onChange={(veld, waarde) => { setInstellingen(prev => ({ ...prev, [veld]: waarde })); setBericht('') }}
            alleenLezen={!isConcept || isDemo}
            bestaandeRondes={bestaandeRondes}
            forfaitAlleenLezen={isDemo}
            naam={naam}
            onNaamChange={waarde => { setNaam(waarde); setBericht('') }}
            naamAlleenLezen={isDemo}
            primaryColor={primaryColor}
          />
          {!isDemo && (
            <button type="submit" disabled={opslaan} style={{ marginTop: '20px', background: '#1F5C99', color: '#ffffff', padding: '10px 24px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
              {opslaan ? 'Saving...' : 'Save settings'}
            </button>
          )}
        </form>

        <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: primaryColor, fontWeight: 800, fontSize: '15px', margin: 0 }}>Participants</h2>
            <span style={{ color: isConcept && vol ? '#16A34A' : '#9CA3AF', fontSize: '13px', fontWeight: 600 }}>
              {isConcept ? `${aantalGeselecteerd} of ${maxDeelnemers} places` : `${bevestigdeActieven.length} participants`}
            </span>
          </div>

          {isConcept ? (
            <>
              <div>
                {alleSpelers.map((speler, i) => {
                  const gekozen = geselecteerd.has(speler.id)
                  const uit = isDemo || (!gekozen && vol)
                  return (
                    <label key={speler.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', borderBottom: '1px solid #F9FAFB', background: i % 2 === 0 ? '#ffffff' : '#FAFAFA', cursor: uit ? 'default' : 'pointer', opacity: uit && !gekozen ? 0.5 : 1 }}>
                      <input type="checkbox" checked={gekozen} onChange={() => toggleSpeler(speler.id)} disabled={uit} style={{ width: '16px', height: '16px', accentColor: '#1F5C99' }} />
                      <span style={{ fontWeight: 600, color: primaryColor, fontSize: '14px', flex: 1 }}>{speler.voornaam} {speler.achternaam}</span>
                      <span style={{ color: '#9CA3AF', fontSize: '12px' }}>{speler.geslacht === 'M' ? 'Man' : 'Woman'}</span>
                    </label>
                  )
                })}
              </div>
              {!isDemo && (
                <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: '12px' }}>
                  <button onClick={handleKlaar} disabled={opslaan || aantalGeselecteerd === 0} style={{ background: '#1F5C99', color: '#ffffff', padding: '10px 24px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                    {opslaan ? 'Saving...' : `Save participants (${aantalGeselecteerd})`}
                  </button>
                  <button onClick={() => { setGeselecteerd(new Set()); setFout(''); setBericht('') }} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', fontSize: '14px', cursor: 'pointer' }}>
                    Clear all
                  </button>
                </div>
              )}
            </>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {bevestigdeActieven.length === 0 && (
                <li style={{ padding: '12px 24px', color: '#9CA3AF', fontSize: '14px' }}>No participants.</li>
              )}
              {[...bevestigdeActieven]
                .sort((a, b) => (a.spelers?.achternaam ?? '').localeCompare(b.spelers?.achternaam ?? ''))
                .map((d, i) => (
                  <li key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', borderBottom: '1px solid #F9FAFB', background: i % 2 === 0 ? '#ffffff' : '#FAFAFA' }}>
                    <span style={{ fontWeight: 600, color: primaryColor, fontSize: '14px', flex: 1 }}>{d.spelers?.voornaam} {d.spelers?.achternaam}</span>
                    <span style={{ color: '#9CA3AF', fontSize: '12px' }}>{d.spelers?.geslacht === 'M' ? 'Man' : 'Woman'}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}
