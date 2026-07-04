import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { wedstrijd_id, ronde_id } = await request.json()
    if (!wedstrijd_id || !ronde_id) {
      return NextResponse.json({ fout: 'wedstrijd_id en ronde_id vereist' }, { status: 400 })
    }

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Haal wedstrijd info op
    const { data: wedstrijd } = await admin
      .from('wedstrijden')
      .select('naam')
      .eq('id', wedstrijd_id)
      .maybeSingle()

    // Haal ronde info op
    const { data: ronde } = await admin
      .from('rondes')
      .select('ronde_nummer')
      .eq('id', ronde_id)
      .maybeSingle()

    // Vind groepen zonder uitslag
    const { data: groepen } = await admin
      .from('groepen')
      .select('id, baan_nummer')
      .eq('ronde_id', ronde_id)

    const groepenZonderUitslag = []

    for (const groep of groepen ?? []) {
      const { data: sets } = await admin
        .from('sets')
        .select('games_team1')
        .eq('groep_id', groep.id)
        .not('games_team1', 'is', null)

      if (!sets || sets.length === 0) {
        // Haal spelers op van deze groep
        const { data: groepSpelers } = await admin
          .from('groep_spelers')
          .select('spelers(voornaam, achternaam, email)')
          .eq('groep_id', groep.id)

        groepenZonderUitslag.push({
          baan: groep.baan_nummer,
          groep_id: groep.id,
          spelers: (groepSpelers ?? []).map((gs: any) => gs.spelers),
        })
      }
    }

    if (groepenZonderUitslag.length === 0) {
      return NextResponse.json({ bericht: 'Alle uitslagen zijn al ingevoerd!', verzonden: 0 })
    }

    // Stuur e-mail per speler in niet-gespeelde groepen
    let verzonden = 0
    const emails = new Set<string>()

    for (const groep of groepenZonderUitslag) {
      for (const speler of groep.spelers) {
        if (!speler.email || emails.has(speler.email)) continue
        emails.add(speler.email)

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: speler.email,
          subject: `Herinnering: ${wedstrijd?.naam} — Ronde ${ronde?.ronde_nummer}`,
          html: `
            <h2>Herinnering PadelMazarron</h2>
            <p>Beste ${speler.voornaam},</p>
            <p>We hebben nog geen uitslag ontvangen voor <strong>Ronde ${ronde?.ronde_nummer}</strong> van <strong>${wedstrijd?.naam}</strong>.</p>
            <p>Baan ${groep.baan}: ${groep.spelers.map((s: any) => `${s.voornaam} ${s.achternaam}`).join(', ')}</p>
            <p>Vergeet niet de uitslag door te geven aan de beheerder!</p>
            <p>Bekijk het schema op: <a href="${process.env.NEXT_PUBLIC_APP_URL}">${process.env.NEXT_PUBLIC_APP_URL}</a></p>
            <br>
            <p>Groeten,<br>PadelMazarron</p>
          `,
        })

        // Log de alert
        await admin.from('alerts').insert({
          wedstrijd_id,
          ronde_id,
          groep_id: groep.groep_id,
          type: 'herinnering_niet_gestart',
        })

        verzonden++
      }
    }

    return NextResponse.json({
      succes: true,
      groepen_zonder_uitslag: groepenZonderUitslag.length,
      emails_verzonden: verzonden,
    })

  } catch (error) {
    console.error('Alert fout:', error)
    return NextResponse.json({ fout: 'Interne serverfout' }, { status: 500 })
  }
}