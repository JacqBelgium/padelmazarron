import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { genereerSchema } from '@/lib/schema-algoritme'

export async function POST(request: NextRequest) {
  try {
    const { wedstrijd_id } = await request.json()
    if (!wedstrijd_id) return NextResponse.json({ fout: 'wedstrijd_id vereist' }, { status: 400 })

    // Controleer authenticatie via server client
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ fout: 'Niet ingelogd' }, { status: 401 })

    // Gebruik admin client voor database operaties (omzeilt RLS)
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Haal wedstrijd op
    const { data: wedstrijd } = await admin
      .from('wedstrijden')
      .select('*')
      .eq('id', wedstrijd_id)
      .single()

    if (!wedstrijd) return NextResponse.json({ fout: 'Wedstrijd niet gevonden' }, { status: 404 })
    if (wedstrijd.status !== 'Actief') return NextResponse.json({ fout: 'Wedstrijd moet Actief zijn' }, { status: 400 })

    // Haal deelnemers op
    const { data: deelnames } = await admin
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
    const spelerIds = deelnames.map((d: { speler_id: string }) => d.speler_id)

    // Verwijder bestaand schema
    await admin.from('rondes').delete().eq('wedstrijd_id', wedstrijd_id)

    // Sla rondes, groepen en sets op
    for (const ronde of schema.rondes) {
      const { data: rondeData } = await admin
        .from('rondes')
        .insert({
          wedstrijd_id,
          ronde_nummer: ronde.ronde,
          status: 'Open',
        })
        .select()
        .single()

      if (!rondeData) continue

      for (const groep of ronde.groepen) {
        const { data: groepData } = await admin
          .from('groepen')
          .insert({ ronde_id: rondeData.id, baan_nummer: groep.baan })
          .select()
          .single()

        if (!groepData) continue

        const groepSpelers = groep.spelers.map((idx: number) => ({
          groep_id: groepData.id,
          speler_id: spelerIds[idx],
          is_invaller: false,
        }))
        await admin.from('groep_spelers').insert(groepSpelers)

        const sets = groep.sets.map((set: { set: number; team1: number[]; team2: number[] }) => ({
          groep_id: groepData.id,
          set_nummer: set.set,
          team1_speler1_id: spelerIds[set.team1[0]],
          team1_speler2_id: spelerIds[set.team1[1]],
          team2_speler1_id: spelerIds[set.team2[0]],
          team2_speler2_id: spelerIds[set.team2[1]],
        }))
        await admin.from('sets').insert(sets)
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