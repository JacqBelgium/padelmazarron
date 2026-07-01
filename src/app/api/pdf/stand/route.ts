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

  const { data: punten } = await admin
    .from('punten')
    .select('speler_id, games_gewonnen, set_gewonnen, ronde_id, is_invaller, spelers(voornaam, achternaam, geslacht)')
    .eq('wedstrijd_id', wedstrijd_id)
    .eq('is_invaller', false)

  const map = new Map<string, any>()
  const rondesPerSpeler = new Map<string, Set<string>>()

  for (const p of (punten ?? []) as any[]) {
    if (!map.has(p.speler_id)) {
      map.set(p.speler_id, {
        naam: `${p.spelers.voornaam} ${p.spelers.achternaam}`,
        geslacht: p.spelers.geslacht,
        totaal_games: 0,
        totaal_sets: 0,
      })
      rondesPerSpeler.set(p.speler_id, new Set())
    }
    const rij = map.get(p.speler_id)
    rij.totaal_games += p.games_gewonnen
    if (p.set_gewonnen) rij.totaal_sets += 1
    rondesPerSpeler.get(p.speler_id)!.add(p.ronde_id)
  }

  const sorteer = (a: any, b: any) =>
    b.totaal_games !== a.totaal_games ? b.totaal_games - a.totaal_games : b.totaal_sets - a.totaal_sets

  const alle = [...map.entries()].map(([id, r]) => ({
    ...r,
    rondes_gespeeld: rondesPerSpeler.get(id)?.size ?? 0,
  })).sort(sorteer).map((r, i) => ({ ...r, positie: i + 1 }))

  const heren = alle.filter(r => r.geslacht === 'M')
  const dames = alle.filter(r => r.geslacht === 'V')

  // Geef JSON terug — PDF generatie gebeurt client-side
  return NextResponse.json({
    wedstrijd: wedstrijd?.naam ?? '',
    datum: wedstrijd?.datum_van ?? '',
    heren,
    dames,
  })
}