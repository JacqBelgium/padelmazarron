import { NextRequest, NextResponse } from 'next/server'
import { isIngelogd } from '@/lib/api-auth'
import {
  adminClient, bevestigdeDeelnemers, fout, toegangsFout, isUuid, laadMatchContext, laadNiveaus,
  niveauRelatie, spelersInRonde, sportVanWedstrijd,
} from '@/lib/invallers'

// Always run on request and never serve Supabase data from a cache.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const MAX_KANDIDATEN = 200
const PAGINA = 1000

interface Kandidaat { id: string; naam: string; bron: 'wachtlijst' | 'club'; niveau: 'gelijk' | 'onbekend' }

// GET /api/invallers/kandidaten?groep_id=&speler_id=  (speler_id = the absent planned player)
// Returns possible substitutes with only the level relation, never a level number.
export async function GET(request: NextRequest) {
  try {
    // Logged in first, before any database lookup.
    if (!(await isIngelogd())) return fout('niet_ingelogd', 401)

    const { searchParams } = new URL(request.url)
    const groepId = searchParams.get('groep_id')
    const afwezigeId = searchParams.get('speler_id')
    if (!isUuid(groepId) || !isUuid(afwezigeId)) return fout('ongeldige_invoer', 400)

    const admin = adminClient()
    const ctx = await laadMatchContext(admin, groepId)
    if (!ctx) return fout('niet_gevonden', 404)

    const toegangFout = await toegangsFout(ctx.wedstrijdId)
    if (toegangFout) return toegangFout

    if (!ctx.geplandeSpelers.includes(afwezigeId)) return fout('geen_speler_in_match', 422)

    const [deelnemers, inRonde, sport] = await Promise.all([
      bevestigdeDeelnemers(admin, ctx.wedstrijdId),
      spelersInRonde(admin, ctx.rondeId),
      sportVanWedstrijd(admin, ctx.wedstrijdId, ctx.clubId),
    ])
    if (!inRonde) return fout('serverfout', 500)

    // (a) Waiting list of this competition, linked to a spelers row.
    const { data: wachtlijst, error: wachtFout } = await admin
      .from('uitnodigingen')
      .select('speler_id')
      .eq('wedstrijd_id', ctx.wedstrijdId)
      .eq('status', 'wachtlijst')
      .not('speler_id', 'is', null)
    if (wachtFout) return fout('serverfout', 500)
    const wachtlijstIds = new Set((wachtlijst ?? []).map(w => w.speler_id as string))

    // (b) Active players of the club (the waiting-list players are in here too when they belong to the club).
    const clubSpelers: { id: string; voornaam: string; achternaam: string }[] = []
    for (let van = 0; ; van += PAGINA) {
      const { data, error } = await admin
        .from('spelers')
        .select('id, voornaam, achternaam')
        .eq('club_id', ctx.clubId)
        .eq('status', 'Actief')
        .order('id')
        .range(van, van + PAGINA - 1)
      if (error) return fout('serverfout', 500)
      clubSpelers.push(...(data ?? []))
      if (!data || data.length < PAGINA) break
    }

    // Same exclusions for both sources, so every candidate can also be saved by POST /api/invallers.
    // Each speler appears once: as 'wachtlijst' when on the waiting list, otherwise as 'club'.
    const toegestaan = clubSpelers.filter(s => s.id !== afwezigeId && !deelnemers.has(s.id) && !inRonde.has(s.id))

    const niveaus = await laadNiveaus(admin, [afwezigeId, ...toegestaan.map(s => s.id)], sport)
    const afwezigNiveau = niveaus.get(afwezigeId) ?? null

    const kandidaten: Kandidaat[] = []
    for (const s of toegestaan) {
      const relatie = niveauRelatie(afwezigNiveau, niveaus.get(s.id))
      if (relatie === 'verschillend') continue
      kandidaten.push({
        id: s.id,
        naam: `${s.voornaam} ${s.achternaam}`.trim(),
        bron: wachtlijstIds.has(s.id) ? 'wachtlijst' : 'club',
        niveau: relatie,
      })
    }

    kandidaten.sort((a, b) =>
      (a.bron === b.bron ? 0 : a.bron === 'wachtlijst' ? -1 : 1)
      || (a.niveau === b.niveau ? 0 : a.niveau === 'gelijk' ? -1 : 1)
      || a.naam.localeCompare(b.naam))

    return NextResponse.json({ kandidaten: kandidaten.slice(0, MAX_KANDIDATEN) })
  } catch {
    console.error('Substitute candidates failed')
    return fout('serverfout', 500)
  }
}
