import { NextRequest, NextResponse } from 'next/server'
import { isIngelogd } from '@/lib/api-auth'
import {
  adminClient, bevestigdeDeelnemers, fout, toegangsFout, isUuid, laadMatchContext, laadNiveaus,
  niveauRelatie, spelersInRonde, sportVanWedstrijd, zonderUitslag,
} from '@/lib/invallers'

// Always run on request and never serve Supabase data from a cache.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const OPEN_RONDE = ['Open', 'Volledig']

async function leesBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json()
    return body && typeof body === 'object' ? body : null
  } catch {
    return null
  }
}

// POST /api/invallers  { groep_id, afwezige_speler_id, kandidaat_id, bevestig_niveau_onbekend? }
// Assigns a substitute to an absent planned player. The set row (planned teams) is never changed.
export async function POST(request: NextRequest) {
  try {
    // Logged in first, before any database lookup.
    if (!(await isIngelogd())) return fout('niet_ingelogd', 401)

    const body = await leesBody(request)
    const groepId = body?.groep_id
    const afwezigeId = body?.afwezige_speler_id
    const kandidaatId = body?.kandidaat_id
    if (!isUuid(groepId) || !isUuid(afwezigeId) || !isUuid(kandidaatId)) return fout('ongeldige_invoer', 400)
    const bevestigd = body?.bevestig_niveau_onbekend === true

    const admin = adminClient()
    const ctx = await laadMatchContext(admin, groepId)
    if (!ctx) return fout('niet_gevonden', 404)

    const toegangFout = await toegangsFout(ctx.wedstrijdId)
    if (toegangFout) return toegangFout

    // 1. Round open
    if (!OPEN_RONDE.includes(ctx.rondeStatus)) return fout('ronde_niet_open', 409)

    // 2. Absent player is one of the four planned players
    if (!ctx.geplandeSpelers.includes(afwezigeId)) return fout('geen_speler_in_match', 422)

    // 3. Candidate
    if (kandidaatId === afwezigeId) return fout('zelfde_speler', 422)
    const { data: kandidaat, error: kandidaatFout } = await admin
      .from('spelers')
      .select('id, club_id, voornaam, achternaam')
      .eq('id', kandidaatId)
      .maybeSingle()
    if (kandidaatFout) return fout('serverfout', 500)
    if (!kandidaat) return fout('kandidaat_niet_gevonden', 404)
    if (kandidaat.club_id !== ctx.clubId) return fout('andere_club', 422)

    const [deelnemers, inRonde] = await Promise.all([
      bevestigdeDeelnemers(admin, ctx.wedstrijdId),
      spelersInRonde(admin, ctx.rondeId),
    ])
    if (!inRonde) return fout('serverfout', 500)
    if (deelnemers.has(kandidaatId)) return fout('is_deelnemer', 422)
    if (inRonde.has(kandidaatId)) return fout('al_in_ronde', 409)

    // 4. No substitute yet for this player in this group
    const { data: bestaand, error: bestaandFout } = await admin
      .from('groep_spelers')
      .select('id')
      .eq('groep_id', groepId)
      .eq('vervangt_speler_id', afwezigeId)
      .limit(1)
    if (bestaandFout) return fout('serverfout', 500)
    if ((bestaand ?? []).length > 0) return fout('heeft_al_invaller', 409)

    // 5. No result, or the outcome 'speler_afwezig' (which the substitution replaces)
    const wasSpelerAfwezig = ctx.groepStatus === 'speler_afwezig'
    if (!zonderUitslag(ctx) && !wasSpelerAfwezig) return fout('uitslag_bestaat', 409)

    // 6. Levels
    const sport = await sportVanWedstrijd(admin, ctx.wedstrijdId, ctx.clubId)
    const niveaus = await laadNiveaus(admin, [afwezigeId, kandidaatId], sport)
    const relatie = niveauRelatie(niveaus.get(afwezigeId), niveaus.get(kandidaatId))
    if (relatie === 'verschillend') return fout('niveau_verschilt', 422)
    if (relatie === 'onbekend' && !bevestigd) return fout('niveau_onbekend_bevestigen', 409)

    // Insert the substitute row.
    const { data: nieuw, error: insertFout } = await admin
      .from('groep_spelers')
      .insert({
        groep_id: groepId,
        speler_id: kandidaatId,
        is_invaller: true,
        vervangt_speler_id: afwezigeId,
        niveau_onbekend_bevestigd: relatie === 'onbekend',
      })
      .select('id')
      .single()
    if (insertFout || !nieuw) {
      // Unique indexes (groep_id, vervangt_speler_id) and (groep_id, speler_id): a parallel request won.
      if (insertFout?.code === '23505') return fout('heeft_al_invaller', 409)
      console.error('Substitute insert failed:', insertFout?.code ?? 'unknown')
      return fout('serverfout', 500)
    }

    // A 'speler_afwezig' result is replaced by the substitution: the match goes back to planned.
    if (wasSpelerAfwezig) {
      const resetFout = await resetMatch(admin, ctx)
      if (resetFout) {
        console.error('Substitute match reset failed:', resetFout)
        // Undo the insert so the match keeps its previous outcome.
        await admin.from('groep_spelers').delete().eq('id', nieuw.id)
        return fout('serverfout', 500)
      }
    }

    return NextResponse.json({ ok: true, naam: `${kandidaat.voornaam} ${kandidaat.achternaam}`.trim() })
  } catch {
    console.error('Substitute assignment failed')
    return fout('serverfout', 500)
  }
}

// Clears the 'speler_afwezig' result: set row games to null, afwezig false for the planned players,
// status 'gepland', and a 'Volledig' round back to 'Open' (it now has a match without a result).
async function resetMatch(admin: ReturnType<typeof adminClient>, ctx: NonNullable<Awaited<ReturnType<typeof laadMatchContext>>>) {
  if (ctx.setId) {
    const { error } = await admin
      .from('sets')
      .update({ games_team1: null, games_team2: null, ingevoerd_op: null, ingevoerd_door: null })
      .eq('id', ctx.setId)
    if (error) return `sets ${error.code}`
  }
  const { error: afwezigFout } = await admin
    .from('groep_spelers')
    .update({ afwezig: false })
    .eq('groep_id', ctx.groepId)
    .in('speler_id', ctx.geplandeSpelers)
  if (afwezigFout) return `groep_spelers ${afwezigFout.code}`
  const { error: groepFout } = await admin.from('groepen').update({ status: 'gepland' }).eq('id', ctx.groepId)
  if (groepFout) return `groepen ${groepFout.code}`
  if (ctx.rondeStatus === 'Volledig') {
    const { error: rondeFout } = await admin
      .from('rondes')
      .update({ status: 'Open' })
      .eq('id', ctx.rondeId)
      .eq('status', 'Volledig')
    if (rondeFout) return `rondes ${rondeFout.code}`
  }
  return null
}

// DELETE /api/invallers  { groep_id, afwezige_speler_id }
// Removes the substitute of a planned player, only while the match has no result.
export async function DELETE(request: NextRequest) {
  try {
    // Logged in first, before any database lookup.
    if (!(await isIngelogd())) return fout('niet_ingelogd', 401)

    const body = await leesBody(request)
    const groepId = body?.groep_id
    const afwezigeId = body?.afwezige_speler_id
    if (!isUuid(groepId) || !isUuid(afwezigeId)) return fout('ongeldige_invoer', 400)

    const admin = adminClient()
    const ctx = await laadMatchContext(admin, groepId)
    if (!ctx) return fout('niet_gevonden', 404)

    const toegangFout = await toegangsFout(ctx.wedstrijdId)
    if (toegangFout) return toegangFout

    if (!OPEN_RONDE.includes(ctx.rondeStatus)) return fout('ronde_niet_open', 409)
    if (!zonderUitslag(ctx)) return fout('uitslag_bestaat', 409)

    const { data: verwijderd, error } = await admin
      .from('groep_spelers')
      .delete()
      .eq('groep_id', groepId)
      .eq('vervangt_speler_id', afwezigeId)
      .eq('is_invaller', true)
      .select('id')
    if (error) {
      console.error('Substitute delete failed:', error.code)
      return fout('serverfout', 500)
    }
    if (!verwijderd || verwijderd.length === 0) return fout('geen_invaller', 404)

    return NextResponse.json({ ok: true })
  } catch {
    console.error('Substitute removal failed')
    return fout('serverfout', 500)
  }
}
