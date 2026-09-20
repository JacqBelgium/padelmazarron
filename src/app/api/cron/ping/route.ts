import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

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

  // Stats ophalen
  const { count: clubs } = await admin.from('clubs').select('*', { count: 'exact', head: true })
  const { count: spelers } = await admin.from('spelers').select('*', { count: 'exact', head: true })
  const { count: wedstrijden } = await admin.from('wedstrijden').select('*', { count: 'exact', head: true })
  const { count: sets } = await admin.from('sets').select('*', { count: 'exact', head: true })

  // Email sturen
  await resend.emails.send({
    from: 'noreply@pickmynumbers.eu',
    to: 'jacqvandersteen@gmail.com',
    subject: `RacketComp Weekly Update — ${new Date().toLocaleDateString('nl-BE')}`,
    html: `
      <h2>RacketComp Weekly Update</h2>
      <p>Database is actief en gezond ✓</p>
      <table>
        <tr><td><strong>Clubs:</strong></td><td>${clubs}</td></tr>
        <tr><td><strong>Spelers:</strong></td><td>${spelers}</td></tr>
        <tr><td><strong>Wedstrijden:</strong></td><td>${wedstrijden}</td></tr>
        <tr><td><strong>Sets gespeeld:</strong></td><td>${sets}</td></tr>
      </table>
      <p>Volgende update over 3-4 dagen.</p>
      <p><a href="https://racketcomp.eu">racketcomp.eu</a></p>
    `,
  })

  return NextResponse.json({ succes: true, clubs, spelers, wedstrijden, sets })
}
