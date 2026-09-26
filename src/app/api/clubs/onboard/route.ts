import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
)

const resend = new Resend(process.env.RESEND_API_KEY)

function generateTemporaryPassword(length = 16) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?'
  let password = ''

  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * chars.length)
    password += chars[index]
  }

  return password
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('clubs/onboard request received:', {
      rawBody: body,
      fields: {
        naam: body?.naam,
        email: body?.email,
        sport: body?.sport,
        contactpersoon: body?.contactpersoon,
      },
    })

    const { naam, email, sport, contactpersoon } = body ?? {}
    const resolvedContactpersoon = body?.contactpersoon || body?.naam

    if (!naam || !email || !sport) {
      console.error('clubs/onboard validation failed: missing required fields', {
        naam,
        email,
        sport,
        contactpersoon,
      })
      return NextResponse.json(
        { fout: 'naam, email en sport zijn verplicht' },
        { status: 400 }
      )
    }

    const trimmedNaam = String(naam).trim()
    const trimmedEmail = String(email).trim()
    const trimmedSport = String(sport).trim()
    const trimmedContactpersoon = String(resolvedContactpersoon ?? trimmedNaam).trim()

    if (!trimmedNaam || !trimmedEmail || !trimmedSport || !trimmedContactpersoon) {
      console.error('clubs/onboard validation failed: empty required fields after trim', {
        trimmedNaam,
        trimmedEmail,
        trimmedSport,
        trimmedContactpersoon,
      })
      return NextResponse.json(
        { fout: 'naam, email, sport en contactpersoon zijn verplicht' },
        { status: 400 }
      )
    }

    if (!isValidEmail(trimmedEmail)) {
      console.error('clubs/onboard validation failed: invalid email', { email: trimmedEmail })
      return NextResponse.json({ fout: 'Ongeldig e-mailadres' }, { status: 400 })
    }

    const temporaryPassword = generateTemporaryPassword()

    let clubId: string | null = null
    let authUserId: string | null = null

    try {
      const { data: clubData, error: clubError } = await admin
        .from('clubs')
        .insert({
          naam: trimmedNaam,
          sport: trimmedSport,
        })
        .select('id')
        .single()

      if (clubError || !clubData) {
        console.error('clubs/onboard Supabase error creating club', { clubError, clubData })
        throw clubError ?? new Error('Kon club niet aanmaken')
      }

      clubId = clubData.id

      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email: trimmedEmail,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          club_id: clubData.id,
          contactpersoon: trimmedContactpersoon,
          sport: trimmedSport,
        },
      })

      if (authError || !authData?.user) {
        console.error('clubs/onboard Supabase error creating auth user', { authError, authData })
        throw authError ?? new Error('Kon Supabase-auth user niet aanmaken')
      }

      authUserId = authData.user.id

      const { error: gebruikerError } = await admin.from('gebruikers').insert({
        club_id: clubData.id,
        auth_id: authData.user.id,
        email: trimmedEmail,
        naam: trimmedContactpersoon,
        rol: 'beheerder',
      })

      if (gebruikerError) {
        console.error('clubs/onboard Supabase error creating gebruiker', { gebruikerError })
        throw gebruikerError
      }

      const emailResponse = await resend.emails.send({
        from: 'noreply@pickmynumbers.eu',
        to: trimmedEmail,
        subject: 'Welkom bij RacketComp',
        html: `
          <h2>Welkom bij RacketComp</h2>
          <p>Beste ${trimmedContactpersoon},</p>
          <p>Je club <strong>${trimmedNaam}</strong> is succesvol aangemaakt.</p>
          <p>Je kunt inloggen via: <a href="https://comp.racketcomp.eu/login">https://comp.racketcomp.eu/login</a></p>
          <p><strong>Voorlopig wachtwoord:</strong> ${temporaryPassword}</p>
          <p>Wij raden je aan dit wachtwoord direct te wijzigen nadat je bent ingelogd.</p>
          <p>Vriendelijke groeten,<br />Het RacketComp team</p>
        `,
      })

      if (emailResponse.error) {
        console.error('clubs/onboard Resend error sending welcome mail', { resendError: emailResponse.error })
        throw new Error(emailResponse.error.message || 'E-mail kon niet worden verzonden')
      }

      return NextResponse.json({
        success: true,
        club_id: clubData.id,
        user_id: authData.user.id,
      })
    } catch (error) {
      if (authUserId) {
        try {
          await admin.auth.admin.deleteUser(authUserId)
        } catch (deleteUserError) {
          console.error('Kon auth user niet terugdraaien:', deleteUserError)
        }
      }

      if (clubId) {
        try {
          await admin.from('clubs').delete().eq('id', clubId)
        } catch (deleteClubError) {
          console.error('Kon club niet terugdraaien:', deleteClubError)
        }
      }

      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout'
      console.error('Onboarding fout:', errorMessage)

      return NextResponse.json({ fout: 'Aanmaken van club en gebruiker is mislukt' }, { status: 500 })
    }
  } catch (error) {
    console.error('Onboarding request fout:', error)
    return NextResponse.json({ fout: 'Interne serverfout' }, { status: 500 })
  }
}
