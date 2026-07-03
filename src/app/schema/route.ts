import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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
    .select('naam, datum_van')
    .eq('id', wedstrijd_id)
    .maybeSingle()

  const { data: rondesData } = await admin
    .from('rondes')
    .select('id, ronde_nummer')
    .eq('wedstrijd_id', wedstrijd_id)
    .order('ronde_nummer')

  const rondes = []

  for (const ronde of rondesData ?? []) {
    const { data: groepenData } = await admin
      .from('groepen')
      .select('id, baan_nummer')
      .eq('ronde_id', ronde.id)
      .order('baan_nummer')

    const groepen = []

    for (const groep of groepenData ?? []) {
      const { data: groepSpelers } = await admin
        .from('groep_spelers')
        .select('spelers(voornaam, achternaam)')
        .eq('groep_id', groep.id)

      const spelers = (groepSpelers ?? []).map((gs: any) =>
        `${gs.spelers.voornaam} ${gs.spelers.achternaam}`
      )

      groepen.push({ baan: groep.baan_nummer, spelers })
    }

    rondes.push({ ronde: ronde.ronde_nummer, groepen })
  }

  return NextResponse.json({
    wedstrijd: wedstrijd?.naam ?? '',
    datum: wedstrijd?.datum_van ?? '',
    rondes,
  })
}