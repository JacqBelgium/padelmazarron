import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireWedstrijdAccess } from '@/lib/api-auth'

// Always run on request and never serve Supabase data from a cache.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const UITKOMSTEN_ZONDER_SCORE = ['forfait_team1', 'forfait_team2', 'speler_afwezig', 'niet_gespeeld']

interface GroepSpelerRij { speler_id: string; is_invaller: boolean | null; afwezig: boolean | null; vervangt_speler_id: string | null }

interface NieuwPunt {
  wedstrijd_id: string; ronde_id: string; speler_id: string; set_id: string
  games_gewonnen: number; set_gewonnen: boolean; is_invaller: boolean; afwezig: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { wedstrijd_id } = await request.json()
    if (!wedstrijd_id) return NextResponse.json({ fout: 'wedstrijd_id vereist' }, { status: 400 })

    const toegang = await requireWedstrijdAccess(wedstrijd_id)
    if (!toegang.ok) return toegang.response

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Alle matches van deze wedstrijd (één sets-rij per match) met status en groep_spelers, in één query.
    const { data: sets, error: setsError } = await admin
      .from('sets')
      .select(`
        id,
        set_nummer,
        groep_id,
        games_team1,
        games_team2,
        team1_speler1_id,
        team1_speler2_id,
        team2_speler1_id,
        team2_speler2_id,
        groepen!inner(ronde_id, status, rondes!inner(wedstrijd_id), groep_spelers(speler_id, is_invaller, afwezig, vervangt_speler_id))
      `)
      .eq('groepen.rondes.wedstrijd_id', wedstrijd_id)

    if (setsError) {
      console.error('Sets query error:', setsError)
      return NextResponse.json({ fout: 'Fout bij ophalen sets' }, { status: 500 })
    }

    // Zonder uitslagen worden de punten toch gewist, zodat gewiste uitslagen uit de stand verdwijnen.
    // Extra filter op wedstrijd blijft als vangnet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groepVan = (s: any) => (Array.isArray(s.groepen) ? s.groepen[0] : s.groepen)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setsDezWedstrijd = (sets ?? []).filter((s: any) => {
      const rondes = groepVan(s)?.rondes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return Array.isArray(rondes) ? rondes.some((r: any) => r.wedstrijd_id === wedstrijd_id) : rondes?.wedstrijd_id === wedstrijd_id
    })

    // Verwijder bestaande punten
    const { error: wisFout } = await admin.from('punten').delete().eq('wedstrijd_id', wedstrijd_id)
    if (wisFout) {
      console.error('Delete punten error:', wisFout)
      return NextResponse.json({ fout: 'Fout bij wissen punten' }, { status: 500 })
    }

    const nieuwePunten: NieuwPunt[] = []
    let matchesVerwerkt = 0

    for (const set of setsDezWedstrijd) {
      const groep = groepVan(set)
      const status: string | null = groep?.status ?? null
      const g1: number | null = set.games_team1
      const g2: number | null = set.games_team2

      // Uitkomst van de match. Een match zonder uitkomst ('gepland' zonder uitslag) telt niet mee;
      // oudere rijen met een uitslag maar zonder passende status tellen als gespeeld.
      let uitkomst: string
      if (status && UITKOMSTEN_ZONDER_SCORE.includes(status)) uitkomst = status
      else if (g1 !== null && g2 !== null) uitkomst = 'gespeeld'
      else continue

      const groepSpelers: GroepSpelerRij[] = groep?.groep_spelers ?? []
      const invaller = (spelerId: string) => groepSpelers.some(gs => gs.speler_id === spelerId && gs.is_invaller)
      const rondeId: string = groep?.ronde_id
      // F staat in de sets-rij van de match (per match aanpasbaar).
      const forfait = (waarde: number | null) => waarde ?? 0

      const punt = (spelerId: string, games: number, gewonnen: boolean, afwezig: boolean) => {
        nieuwePunten.push({
          wedstrijd_id,
          ronde_id: rondeId,
          speler_id: spelerId,
          set_id: set.id,
          games_gewonnen: games,
          set_gewonnen: gewonnen,
          is_invaller: invaller(spelerId),
          afwezig,
        })
      }

      const team1 = [set.team1_speler1_id, set.team1_speler2_id] as string[]
      const team2 = [set.team2_speler1_id, set.team2_speler2_id] as string[]

      switch (uitkomst) {
        case 'forfait_team1':
          team1.forEach(id => punt(id, 0, false, true))
          team2.forEach(id => punt(id, forfait(g2), true, false))
          break
        case 'forfait_team2':
          team1.forEach(id => punt(id, forfait(g1), true, false))
          team2.forEach(id => punt(id, 0, false, true))
          break
        case 'speler_afwezig': {
          // Precies één afwezige speler (groep_spelers.afwezig); de andere drie krijgen F zonder gewonnen match.
          const afwezige = [...team1, ...team2].find(id => groepSpelers.some(gs => gs.speler_id === id && gs.afwezig))
          const f = forfait(g1 ?? g2)
          ;[...team1, ...team2].forEach(id => (id === afwezige ? punt(id, 0, false, true) : punt(id, f, false, false)))
          break
        }
        case 'niet_gespeeld':
          // Beide teams afwezig: 0 games, telt wel als gespeelde ronde.
          ;[...team1, ...team2].forEach(id => punt(id, 0, false, true))
          break
        default: {
          // Bij gelijkspel wint geen van beide teams de match.
          team1.forEach(id => punt(id, g1!, g1! > g2!, false))
          team2.forEach(id => punt(id, g2!, g2! > g1!, false))
        }
      }

      // Vervangen spelers (een invaller verwijst ernaar via vervangt_speler_id) krijgen een afwezig-rij met 0 games.
      const inMatch = new Set([...team1, ...team2])
      const vervangen = new Set(groepSpelers.map(gs => gs.vervangt_speler_id).filter((id): id is string => !!id))
      for (const id of vervangen) {
        if (inMatch.has(id)) continue
        nieuwePunten.push({
          wedstrijd_id, ronde_id: rondeId, speler_id: id, set_id: set.id,
          games_gewonnen: 0, set_gewonnen: false, is_invaller: false, afwezig: true,
        })
      }

      matchesVerwerkt++
    }

    if (nieuwePunten.length > 0) {
      const { error: insertError } = await admin.from('punten').insert(nieuwePunten)
      if (insertError) {
        console.error('Insert punten error:', insertError)
        return NextResponse.json({ fout: 'Fout bij opslaan punten' }, { status: 500 })
      }
    }

    return NextResponse.json({
      succes: true,
      sets_verwerkt: matchesVerwerkt,
      punten_aangemaakt: nieuwePunten.length,
    })

  } catch (error) {
    console.error('Punten berekening fout:', error)
    return NextResponse.json({ fout: 'Interne serverfout' }, { status: 500 })
  }
}
