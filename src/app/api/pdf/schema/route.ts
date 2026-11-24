import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { korteAchternamenVoorWedstrijd, weergaveNaam } from '@/lib/korte-naam'
import { isUitkomst } from '@/lib/ronde-weergave'

// Always run on request and never serve Supabase data from a cache.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Public schedule. Only abbreviated names are returned (first name + shortened surname), never a full surname,
// and no results: per match only its outcome (status), when it has one. Unless the organiser shows missed rounds
// publicly (toon_forfaits_publiek), every outcome is reported as the neutral 'afgerond'.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const wedstrijd_id = searchParams.get('wedstrijd_id')

  if (!wedstrijd_id) return NextResponse.json({ fout: 'wedstrijd_id vereist' }, { status: 400 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: wedstrijd } = await admin
    .from('wedstrijden')
    .select('naam, datum_van, status, toon_forfaits_publiek')
    .eq('id', wedstrijd_id)
    .maybeSingle()

  // A competition that has not started (or does not exist) shows no rounds, matches or players.
  const gestart = !!wedstrijd && wedstrijd.status !== 'Concept'
  if (!gestart) {
    return NextResponse.json({ wedstrijd: wedstrijd?.naam ?? '', datum: wedstrijd?.datum_van ?? '', gestart: false, rondes: [] })
  }

  const { data: rondesData } = await admin
    .from('rondes')
    .select('id, ronde_nummer, status, start_datum, eind_datum')
    .eq('wedstrijd_id', wedstrijd_id)
    .order('ronde_nummer')

  // All matches of all rounds in one query, with their players (first name only) and the single set row.
  const rondeIds = (rondesData ?? []).map(r => r.id)
  const { data: groepenData } = rondeIds.length === 0 ? { data: [] } : await admin
    .from('groepen')
    .select(`
      id, ronde_id, baan_nummer, status, captain_speler_id,
      groep_spelers(spelers(id, voornaam)),
      sets(set_nummer, team1_speler1_id, team1_speler2_id, team2_speler1_id, team2_speler2_id)
    `)
    .in('ronde_id', rondeIds)
    .order('baan_nummer')

  const korteNamen = await korteAchternamenVoorWedstrijd(admin, wedstrijd_id)
  const voornamen = new Map<string, string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const g of (groepenData ?? []) as any[]) {
    for (const gs of g.groep_spelers ?? []) if (gs.spelers) voornamen.set(gs.spelers.id, gs.spelers.voornaam)
  }
  const naam = (id: string) => weergaveNaam(voornamen.get(id) ?? '?', korteNamen.get(id))

  // Specific outcomes reveal forfaits and absences, so they are only public when the organiser allows it.
  const toonUitkomsten = wedstrijd.toon_forfaits_publiek === true
  const publiekeUitkomst = (status: string | null) =>
    !isUitkomst(status) ? null : toonUitkomsten ? status : 'afgerond'

  const rondes = (rondesData ?? []).map(ronde => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groepen = ((groepenData ?? []) as any[])
      .filter(g => g.ronde_id === ronde.id)
      .map(g => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sets = (g.sets ?? []) as any[]
        const set = sets.find(s => s.set_nummer === 1) ?? sets[0] ?? null
        const speler = (id: string) => ({ naam: naam(id), captain: id === g.captain_speler_id })
        return {
          // Existing fields
          baan: g.baan_nummer,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          spelers: (g.groep_spelers ?? []).filter((gs: any) => gs.spelers).map((gs: any) => naam(gs.spelers.id)),
          // New fields
          team1: set ? [speler(set.team1_speler1_id), speler(set.team1_speler2_id)] : [],
          team2: set ? [speler(set.team2_speler1_id), speler(set.team2_speler2_id)] : [],
          uitkomst: publiekeUitkomst(g.status),
        }
      })
    return {
      ronde: ronde.ronde_nummer,
      groepen,
      start_datum: ronde.start_datum,
      eind_datum: ronde.eind_datum,
      status: ronde.status,
    }
  })

  return NextResponse.json({
    wedstrijd: wedstrijd.naam ?? '',
    datum: wedstrijd.datum_van ?? '',
    gestart: true,
    rondes,
  })
}
