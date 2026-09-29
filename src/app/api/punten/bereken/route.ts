import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { wedstrijd_id } = await request.json()
    if (!wedstrijd_id) return NextResponse.json({ fout: 'wedstrijd_id vereist' }, { status: 400 })

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Haal alle sets op met uitslagen
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
        groepen(ronde_id, rondes(wedstrijd_id))
      `)
      .not('games_team1', 'is', null)
      .not('games_team2', 'is', null)

    if (setsError) {
      console.error('Sets query error:', setsError)
      return NextResponse.json({ fout: 'Fout bij ophalen sets' }, { status: 500 })
    }

    if (!sets || sets.length === 0) return NextResponse.json({ fout: 'Geen sets gevonden' }, { status: 404 })

    console.log('Totaal sets:', sets.length)
    console.log('Eerste set groepen:', JSON.stringify(sets[0]?.groepen))

    // Filter op wedstrijd
    const setsDezWedstrijd = sets.filter((s: any) => {
      const groepen = s.groepen
      if (Array.isArray(groepen)) {
        return groepen.some((g: any) => g.rondes?.wedstrijd_id === wedstrijd_id)
      }
      return groepen?.rondes?.wedstrijd_id === wedstrijd_id
    })

    console.log('Sets deze wedstrijd:', setsDezWedstrijd.length)

    // Verwijder bestaande punten
    await admin.from('punten').delete().eq('wedstrijd_id', wedstrijd_id)

    // Bereken punten per set
    const nieuwePunten = []

    for (const set of setsDezWedstrijd) {
      const g1 = set.games_team1
      const g2 = set.games_team2
      const team1Wint = g1 > g2

      const groepen = set.groepen
      const rondeId = Array.isArray(groepen) ? groepen[0]?.ronde_id : groepen?.ronde_id

      // Team 1 spelers
      nieuwePunten.push({
        wedstrijd_id,
        ronde_id: rondeId,
        speler_id: set.team1_speler1_id,
        set_id: set.id,
        games_gewonnen: g1,
        set_gewonnen: team1Wint,
        is_invaller: false,
      })
      nieuwePunten.push({
        wedstrijd_id,
        ronde_id: rondeId,
        speler_id: set.team1_speler2_id,
        set_id: set.id,
        games_gewonnen: g1,
        set_gewonnen: team1Wint,
        is_invaller: false,
      })

      // Team 2 spelers
      nieuwePunten.push({
        wedstrijd_id,
        ronde_id: rondeId,
        speler_id: set.team2_speler1_id,
        set_id: set.id,
        games_gewonnen: g2,
        set_gewonnen: !team1Wint,
        is_invaller: false,
      })
      nieuwePunten.push({
        wedstrijd_id,
        ronde_id: rondeId,
        speler_id: set.team2_speler2_id,
        set_id: set.id,
        games_gewonnen: g2,
        set_gewonnen: !team1Wint,
        is_invaller: false,
      })
    }

    if (nieuwePunten.length > 0) {
      const { error: insertError } = await admin.from('punten').insert(nieuwePunten)
      if (insertError) console.error('Insert punten error:', insertError)
    }

    return NextResponse.json({
      succes: true,
      sets_verwerkt: setsDezWedstrijd.length,
      punten_aangemaakt: nieuwePunten.length,
    })

  } catch (error) {
    console.error('Punten berekening fout:', error)
    return NextResponse.json({ fout: 'Interne serverfout' }, { status: 500 })
  }
}