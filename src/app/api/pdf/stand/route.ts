import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { korteAchternamenVoorWedstrijd, weergaveNaam } from '@/lib/korte-naam'
import { geenTotalen, rangschik, telPunten, type PuntRij } from '@/lib/stand'

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
    .select('naam, datum_van, toon_forfaits_publiek, status')
    .eq('id', wedstrijd_id)
    .maybeSingle()

  // A competition that has not started (or does not exist) lists no participants.
  const gestart = !!wedstrijd && wedstrijd.status !== 'Concept'
  if (!gestart) {
    return NextResponse.json({ wedstrijd: wedstrijd?.naam ?? '', datum: wedstrijd?.datum_van ?? '', gestart: false, heren: [], dames: [] })
  }

  // Every confirmed participant is listed; totals come from the punten rows (zeros when there are none).
  const [{ data: deelnemers }, { data: punten }] = await Promise.all([
    admin
      .from('deelnames')
      .select('speler_id, spelers(voornaam, geslacht)')
      .eq('wedstrijd_id', wedstrijd_id)
      .eq('uitnodiging_status', 'bevestigd'),
    admin
      .from('punten')
      .select('speler_id, games_gewonnen, set_gewonnen, ronde_id, afwezig')
      .eq('wedstrijd_id', wedstrijd_id)
      .eq('is_invaller', false),
  ])

  const korteNamen = await korteAchternamenVoorWedstrijd(admin, wedstrijd_id)
  const totalen = telPunten((punten ?? []) as PuntRij[])

  const alle = ((deelnemers ?? []) as any[])
    .filter(d => d.spelers)
    .map(d => ({
      naam: weergaveNaam(d.spelers.voornaam, korteNamen.get(d.speler_id)),
      geslacht: d.spelers.geslacht as string,
      ...(totalen.get(d.speler_id) ?? geenTotalen()),
    }))

  // Each row also carries forfaits (missed rounds); it does not affect the ranking.
  // Positions are numbered per list (men and women each start at 1); equal totals share a position.
  // Missed rounds are only public when the organiser allows it; otherwise the field is left out entirely.
  const toonForfaits = wedstrijd?.toon_forfaits_publiek === true
  const zonderForfaits = <T extends { forfaits: number }>(rij: T) => {
    if (toonForfaits) return rij
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { forfaits, ...rest } = rij
    return rest
  }
  const heren = rangschik(alle.filter(r => r.geslacht === 'M')).map(zonderForfaits)
  const dames = rangschik(alle.filter(r => r.geslacht === 'V')).map(zonderForfaits)

  // Geef JSON terug — PDF generatie gebeurt client-side
  return NextResponse.json({
    wedstrijd: wedstrijd?.naam ?? '',
    datum: wedstrijd?.datum_van ?? '',
    gestart: true,
    heren,
    dames,
  })
}