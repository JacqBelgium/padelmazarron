import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { vandaagBrussel } from '@/lib/schema-planning'

// Always run on request and never serve Supabase data from a cache.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const resend = new Resend(process.env.RESEND_API_KEY)

  // Schrijfactie om Supabase actief te houden
  await admin.from('clubs')
    .update({ last_ping: new Date().toISOString() })
    .eq('id', '28ffb7fc-a0a3-45d7-b915-958d4157335b')

  // Open uitnodigingen waarvan de geldigheid voorbij is op 'verlopen' zetten.
  // Bij een fout alleen de foutcode loggen; keep-alive en e-mail gaan gewoon door.
  let verlopenUitnodigingen: number | null = null
  try {
    const { data: verlopen, error: verlopenFout } = await admin
      .from('uitnodigingen')
      .update({ status: 'verlopen' })
      .eq('status', 'uitgenodigd')
      .lt('verloopt_op', new Date().toISOString())
      .select('id')
    if (verlopenFout) console.error('Invitation expiry update failed:', verlopenFout.code)
    else verlopenUitnodigingen = verlopen?.length ?? 0
  } catch (fout) {
    console.error('Invitation expiry update failed:', (fout as { code?: string })?.code ?? 'unknown')
  }

  // Ronde 1 openen van actieve wedstrijden waarvan de startdatum (Brusselse datum) bereikt is.
  // Bij een fout alleen de foutcode loggen en doorgaan, net als bij het verlopen van uitnodigingen.
  let geopendeRondes: number | null = null
  try {
    const { data: teOpenen, error: zoekFout } = await admin
      .from('rondes')
      .select('id, wedstrijden!inner(status)')
      .eq('ronde_nummer', 1)
      .eq('status', 'Gepland')
      .lte('start_datum', vandaagBrussel())
      .eq('wedstrijden.status', 'Actief')
    if (zoekFout) {
      console.error('Round opening lookup failed:', zoekFout.code)
    } else if (!teOpenen || teOpenen.length === 0) {
      geopendeRondes = 0
    } else {
      const { data: geopend, error: openFout } = await admin
        .from('rondes')
        .update({ status: 'Open', gestart_op: new Date().toISOString() })
        .in('id', teOpenen.map((r: { id: string }) => r.id))
        .eq('status', 'Gepland')
        .select('id')
      if (openFout) console.error('Round opening update failed:', openFout.code)
      else geopendeRondes = geopend?.length ?? 0
    }
  } catch (fout) {
    console.error('Round opening failed:', (fout as { code?: string })?.code ?? 'unknown')
  }

  // Stats ophalen
  const { count: clubs } = await admin.from('clubs').select('*', { count: 'exact', head: true })
  const { count: spelers } = await admin.from('spelers').select('*', { count: 'exact', head: true })
  const { count: wedstrijden } = await admin.from('wedstrijden').select('*', { count: 'exact', head: true })
  const { count: sets } = await admin.from('sets').select('*', { count: 'exact', head: true }).not('games_team1', 'is', null)

  // Email sturen
  await resend.emails.send({
    from: 'noreply@pickmynumbers.eu',
    to: 'jacqvandersteen@gmail.com',
    subject: `RacketComp Daily Update — ${new Date().toLocaleDateString('nl-BE')}`,
    html: `
      <h2>RacketComp Daily Update</h2>
      <p>Database is actief en gezond ✓</p>
      <table>
        <tr><td><strong>Clubs:</strong></td><td>${clubs}</td></tr>
        <tr><td><strong>Spelers:</strong></td><td>${spelers}</td></tr>
        <tr><td><strong>Wedstrijden:</strong></td><td>${wedstrijden}</td></tr>
        <tr><td><strong>Sets gespeeld:</strong></td><td>${sets}</td></tr>
        <tr><td><strong>Expired invitations:</strong></td><td>${verlopenUitnodigingen ?? 'error'}</td></tr>
        <tr><td><strong>Rounds opened:</strong></td><td>${geopendeRondes ?? 'error'}</td></tr>
      </table>
      <p>Volgende update morgen.</p>
      <p><a href="https://racketcomp.eu">racketcomp.eu</a></p>
    `,
  })

  return NextResponse.json({ succes: true, clubs, spelers, wedstrijden, sets })
}
