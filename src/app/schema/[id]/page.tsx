import { createClient as createAdmin } from '@supabase/supabase-js'

interface SpelerInfo {
  id: string
  voornaam: string
  achternaam: string
}

interface GroepInfo {
  id: string
  baan_nummer: number
  spelers: SpelerInfo[]
}

interface RondeInfo {
  id: string
  ronde_nummer: number
  groepen: GroepInfo[]
}

async function haalSchema(wedstrijdId: string) {
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: wedstrijd } = await admin
    .from('wedstrijden')
    .select('naam')
    .eq('id', wedstrijdId)
    .single()

  const { data: rondesData } = await admin
    .from('rondes')
    .select('id, ronde_nummer')
    .eq('wedstrijd_id', wedstrijdId)
    .order('ronde_nummer')

  const rondes: RondeInfo[] = []

  for (const ronde of rondesData ?? []) {
    const { data: groepenData } = await admin
      .from('groepen')
      .select('id, baan_nummer')
      .eq('ronde_id', ronde.id)
      .order('baan_nummer')

    const groepen: GroepInfo[] = []

    for (const groep of groepenData ?? []) {
      const { data: groepSpelers } = await admin
        .from('groep_spelers')
        .select('spelers(id, voornaam, achternaam)')
        .eq('groep_id', groep.id)

      const spelers = (groepSpelers ?? []).map((gs: any) => gs.spelers).filter(Boolean)
      groepen.push({ id: groep.id, baan_nummer: groep.baan_nummer, spelers })
    }

    rondes.push({ id: ronde.id, ronde_nummer: ronde.ronde_nummer, groepen })
  }

  return { naam: wedstrijd?.naam ?? '', rondes }
}

export default async function PubliekSchemaPage({ params }: { params: { id: string } }) {
  const { naam, rondes } = await haalSchema(params.id)

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-6 text-center">
        <h1 className="text-2xl font-bold text-brand-500">PadelMazarron</h1>
        <p className="text-gray-500 mt-1">{naam} — Speelschema</p>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {rondes.map(ronde => (
          <div key={ronde.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="bg-brand-50 px-6 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-brand-600">Ronde {ronde.ronde_nummer}</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {ronde.groepen.map(groep => (
                <div key={groep.id} className="px-6 py-3 grid grid-cols-[80px_1fr] items-center">
                  <span className="text-sm font-medium text-gray-500">Baan {groep.baan_nummer}</span>
                  <span className="text-sm text-gray-800">
                    {groep.spelers.map(s => `${s.voornaam} ${s.achternaam}`).join('  |  ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}