import { randomInt } from 'crypto'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { genereerWhist, wijsCaptainsToe } from '@/lib/schema-whist'
import { parseDatum, rondeDatums, schud, vandaagBrussel } from '@/lib/schema-planning'
import { requireWedstrijdAccess } from '@/lib/api-auth'
import { foutCode } from '@/lib/foutcode'

// Always run on request and never serve Supabase data from a cache.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const standaardRondeDuurDagen = 7

export async function POST(request: NextRequest) {
  try {
    const { wedstrijd_id, bevestig_wissen } = await request.json()
    if (!wedstrijd_id) return NextResponse.json({ fout: 'wedstrijd_id vereist' }, { status: 400 })

    const toegang = await requireWedstrijdAccess(wedstrijd_id)
    if (!toegang.ok) return toegang.response

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: wedstrijd } = await admin
      .from('wedstrijden')
      .select('*')
      .eq('id', wedstrijd_id)
      .single()

    if (!wedstrijd) return NextResponse.json({ fout: 'Wedstrijd niet gevonden' }, { status: 404 })
    // 'Concept' when the competition is being started, 'Actief' when the schedule is regenerated.
    if (wedstrijd.status !== 'Concept' && wedstrijd.status !== 'Actief')
      return NextResponse.json({ fout: 'Wedstrijd moet Concept of Actief zijn' }, { status: 400 })

    // Players: confirmed participants whose speler is still active.
    const { data: deelnames, error: deelnamesFout } = await admin
      .from('deelnames')
      .select('speler_id, spelers!inner(status)')
      .eq('wedstrijd_id', wedstrijd_id)
      .eq('uitnodiging_status', 'bevestigd')
      .eq('spelers.status', 'Actief')
    if (deelnamesFout) throw deelnamesFout

    const n = deelnames?.length ?? 0

    // Compute everything first; nothing is deleted unless a usable schedule exists.
    const schema = genereerWhist(n)
    if (!schema)
      return NextResponse.json({ fout: `A schedule for ${n} players is not available` }, { status: 422 })

    const datumVan = parseDatum(wedstrijd.datum_van)
    if (datumVan === null)
      return NextResponse.json({ fout: 'The competition has no valid start date' }, { status: 400 })

    const maxRondes = n - 1
    const k = Number.isInteger(wedstrijd.aantal_rondes) && wedstrijd.aantal_rondes >= 1 && wedstrijd.aantal_rondes <= maxRondes
      ? wedstrijd.aantal_rondes as number
      : maxRondes
    const rondeDuur = Number.isInteger(wedstrijd.ronde_duur_dagen) && wedstrijd.ronde_duur_dagen >= 1
      ? wedstrijd.ronde_duur_dagen as number
      : standaardRondeDuurDagen

    // Captains are balanced over the full schedule, then the schedule is cut to k rounds.
    const captains = wijsCaptainsToe(schema)
    const rondes = schema.rondes.slice(0, k)
    const datums = rondeDatums(datumVan, rondeDuur, k)

    // Random positions, so nobody has a fixed place in the schedule.
    const spelerIds = schud(
      (deelnames ?? []).map((d: { speler_id: string }) => d.speler_id),
      (max) => randomInt(max)
    )

    // Regenerating deletes the existing rounds and their sets; refuse when results exist unless confirmed.
    const { data: bestaandeRondes, error: rondesFout } = await admin
      .from('rondes')
      .select('id')
      .eq('wedstrijd_id', wedstrijd_id)
    if (rondesFout) throw rondesFout

    const rondeIds = (bestaandeRondes ?? []).map((r: { id: string }) => r.id)
    if (rondeIds.length > 0) {
      const { data: bestaandeGroepen, error: groepenFout } = await admin
        .from('groepen')
        .select('id')
        .in('ronde_id', rondeIds)
      if (groepenFout) throw groepenFout

      const groepIds = (bestaandeGroepen ?? []).map((g: { id: string }) => g.id)
      if (groepIds.length > 0) {
        const { count, error: setsFout } = await admin
          .from('sets')
          .select('id', { count: 'exact', head: true })
          .in('groep_id', groepIds)
          .not('games_team1', 'is', null)
        if (setsFout) throw setsFout

        if ((count ?? 0) > 0 && bevestig_wissen !== true)
          return NextResponse.json({ fout: 'Results already entered' }, { status: 409 })
      }
    }

    // (wedstrijd_id, ronde_nummer) is unique, so the old rounds must go before the new ones are written.
    const { error: wisFout } = await admin.from('rondes').delete().eq('wedstrijd_id', wedstrijd_id)
    if (wisFout) throw wisFout

    // Every write below is a single batch insert. If any step fails, the rondes created here are
    // deleted again (groepen, groep_spelers and sets follow by cascade), so no half schedule remains.
    const aangemaakteRondeIds: string[] = []
    const terugdraaien = async (stap: string, fout: unknown) => {
      console.error(`Schema generatie fout bij ${stap}:`, foutCode(fout))
      if (aangemaakteRondeIds.length > 0) {
        const { error: rollbackFout } = await admin.from('rondes').delete().in('id', aangemaakteRondeIds)
        if (rollbackFout) console.error('Schema rollback fout:', foutCode(rollbackFout))
      }
      // The previous rounds were already deleted; the competition is left without a schedule, never with half of one.
      return NextResponse.json({ fout: 'The schedule could not be saved. Please try again.' }, { status: 500 })
    }

    const nu = new Date().toISOString()
    // Round 1 opens now only when the start date (Brussels) has arrived; the daily run opens it otherwise.
    const ronde1Open = datums[0].start_datum <= vandaagBrussel()
    const { data: nieuweRondes, error: rondeInsertFout } = await admin
      .from('rondes')
      .insert(datums.map((datum) => ({
        wedstrijd_id,
        ronde_nummer: datum.ronde,
        status: datum.ronde === 1 && ronde1Open ? 'Open' : 'Gepland',
        gestart_op: datum.ronde === 1 && ronde1Open ? nu : null,
        start_datum: datum.start_datum,
        eind_datum: datum.eind_datum,
      })))
      .select('id, ronde_nummer')
    for (const r of nieuweRondes ?? []) aangemaakteRondeIds.push(r.id)
    if (rondeInsertFout || !nieuweRondes || nieuweRondes.length !== k) return terugdraaien('rondes', rondeInsertFout)

    const rondeIdPerNummer = new Map<number, string>(nieuweRondes.map((r: { id: string; ronde_nummer: number }) => [r.ronde_nummer, r.id]))

    const groepRijen = rondes.flatMap((ronde, ri) => ronde.wedstrijden.map((match, wi) => {
      const spelers = [...match.team1, ...match.team2]
      return {
        ronde_id: rondeIdPerNummer.get(ronde.ronde),
        baan_nummer: wi + 1,
        captain_speler_id: spelerIds[spelers[captains[ri][wi]]],
        status: 'gepland',
      }
    }))
    const { data: nieuweGroepen, error: groepInsertFout } = await admin
      .from('groepen')
      .insert(groepRijen)
      .select('id, ronde_id, baan_nummer')
    if (groepInsertFout || !nieuweGroepen || nieuweGroepen.length !== groepRijen.length) return terugdraaien('groepen', groepInsertFout)

    const groepIdPerSleutel = new Map<string, string>(
      nieuweGroepen.map((g: { id: string; ronde_id: string; baan_nummer: number }) => [`${g.ronde_id}:${g.baan_nummer}`, g.id])
    )

    const groepSpelers: { groep_id: string; speler_id: string; is_invaller: boolean }[] = []
    const sets: Record<string, string | number>[] = []
    for (const ronde of rondes) {
      ronde.wedstrijden.forEach((match, wi) => {
        const groepId = groepIdPerSleutel.get(`${rondeIdPerNummer.get(ronde.ronde)}:${wi + 1}`)!
        for (const idx of [...match.team1, ...match.team2]) {
          groepSpelers.push({ groep_id: groepId, speler_id: spelerIds[idx], is_invaller: false })
        }
        sets.push({
          groep_id: groepId,
          set_nummer: 1,
          team1_speler1_id: spelerIds[match.team1[0]],
          team1_speler2_id: spelerIds[match.team1[1]],
          team2_speler1_id: spelerIds[match.team2[0]],
          team2_speler2_id: spelerIds[match.team2[1]],
        })
      })
    }

    const { error: groepSpelersFout } = await admin.from('groep_spelers').insert(groepSpelers)
    if (groepSpelersFout) return terugdraaien('groep_spelers', groepSpelersFout)

    const { error: setsInsertFout } = await admin.from('sets').insert(sets)
    if (setsInsertFout) return terugdraaien('sets', setsInsertFout)

    const einddatum = datums[datums.length - 1].eind_datum
    const { error: wedstrijdUpdateFout } = await admin
      .from('wedstrijden')
      .update({ datum_tot: einddatum, aantal_rondes: k })
      .eq('id', wedstrijd_id)
    if (wedstrijdUpdateFout) return terugdraaien('wedstrijden', wedstrijdUpdateFout)

    return NextResponse.json({
      succes: true,
      rondes: k,
      wedstrijden_per_ronde: n / 4,
      einddatum,
    })

  } catch (error) {
    console.error('Schema generatie fout:', foutCode(error))
    return NextResponse.json({ fout: 'Interne serverfout' }, { status: 500 })
  }
}
