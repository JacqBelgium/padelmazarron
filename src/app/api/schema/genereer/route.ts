import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { genereerSchema } from '@/lib/schema-algoritme'

export async function POST(request: NextRequest) {
  try {
    const { wedstrijd_id } = await request.json()
    if (!wedstrijd_id) return NextResponse.json({ fout: 'wedstrijd_id vereist' }, { status: 400 })

    const supabase = createClient()

    // Controleer authenticatie
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ fout: 'Niet ingelogd' }, { status: 401 })

    // Haal wedstrijd op
    const { data: wedstrijd } = await supabase
      .from('wedstrijden')
      .select('*')
      .eq('id', wedstrijd_id)
      .single()

    if (!wedstrijd) return NextResponse.json({ fout: 'Wedstrijd niet gevonden' }, { status: 404 })
    if (wedstrijd.status !== 'Actief') return NextResponse.json({ fout: 'Wedstrijd moet Actief zijn' }, { status: 400 })

    // Haal deelnemers op
    const { data: deelnames } = await supabase
      .from('deelnames')
      .select('speler_id')
      .eq('wedstrijd_id', wedstrijd_id)
      .eq('uitnodiging_status', 'bevestigd')

    if (!deelnames || deelnames.length === 0)
      return NextResponse.json({ fout: 'Geen deelnemers gevonden' }, { status: 400 })

    const n = deelnames.length
    if (n % 4 !== 0)
      return NextResponse.json({ fout: `${n} deelnemers — moet deelbaar zijn door 4` }, { status: 400 })

    // Genereer schema
    const schema = genereerSchema(n, wedstrijd.schema_type)
    const spelerIds = deelnames.map(d => d.speler_id)

    // Verwijder bestaand schema als dat er is
    const { data: bestaandeRondes } = await supabase
      .from('rondes')
      .select('id')
      .eq('wedstrijd_id', wedstrijd_id)

    if (bestaandeRondes && bestaandeRondes.length > 0) {
      await supabase.from('rondes').delete().eq('wedstrijd_id', wedstrijd_id)
    }

    // Sla rondes, groepen en sets op
    for (const ronde of schema.rondes) {
      // Maak ronde aan
      const { data: rondeData } = await supabase
        .from('rondes')
        .insert({
          wedstrijd_id,
          ronde_nummer: ronde.ronde,
          status: ronde.ronde === 1 ? 'Open' : 'Open',
        })
        .select()
        .single()

      if (!rondeData) continue

      for (const groep of ronde.groepen) {
        // Maak groep aan
        const { data: groepData } = await supabase
          .from('groepen')
          .insert({ ronde_id: rondeData.id, baan_nummer: groep.baan })
          .select()
          .single()

        if (!groepData) continue

        // Koppel spelers aan groep
        const groepSpelers = groep.spelers.map(idx => ({
          groep_id: groepData.id,
          speler_id: spelerIds[idx],
          is_invaller: false,
        }))
        await supabase.from('groep_spelers').insert(groepSpelers)

        // Maak sets aan
        const sets = groep.sets.map(set => ({
          groep_id: groepData.id,
          set_nummer: set.set,
          team1_speler1_id: spelerIds[set.team1[0]],
          team1_speler2_id: spelerIds[set.team1[1]],
          team2_speler1_id: spelerIds[set.team2[0]],
          team2_speler2_id: spelerIds[set.team2[1]],
        }))
        await supabase.from('sets').insert(sets)
      }
    }

    return NextResponse.json({
      succes: true,
      rondes: schema.aantalRondes,
      spelers: n,
    })

  } catch (error) {
    console.error('Schema generatie fout:', error)
    return NextResponse.json({ fout: 'Interne serverfout' }, { status: 500 })
  }
}
