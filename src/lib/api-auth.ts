import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type ToegangResultaat =
  | { ok: true }
  | { ok: false; response: NextResponse }

function weiger(fout: string, status: number): ToegangResultaat {
  return { ok: false, response: NextResponse.json({ fout }, { status }) }
}

export type ToegangReden = 'niet_ingelogd' | 'geen_gebruiker' | 'demo' | 'niet_gevonden' | 'andere_club'

// Is a user logged in? Checks only the session, no database lookup.
export async function isIngelogd(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user
}

// Same checks as requireWedstrijdAccess, but returns the reason so a route can choose its own response.
export async function wedstrijdToegang(wedstrijdId: string): Promise<{ ok: true } | { ok: false; reden: ToegangReden }> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, reden: 'niet_ingelogd' }

  const { data: gebruiker } = await supabase
    .from('gebruikers')
    .select('club_id, rol, is_demo')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!gebruiker) return { ok: false, reden: 'geen_gebruiker' }
  if (gebruiker.is_demo) return { ok: false, reden: 'demo' }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: wedstrijd } = await admin
    .from('wedstrijden')
    .select('club_id')
    .eq('id', wedstrijdId)
    .maybeSingle()

  if (!wedstrijd) return { ok: false, reden: 'niet_gevonden' }

  if (gebruiker.rol !== 'admin' && wedstrijd.club_id !== gebruiker.club_id) {
    return { ok: false, reden: 'andere_club' }
  }

  return { ok: true }
}

export async function requireWedstrijdAccess(wedstrijdId: string): Promise<ToegangResultaat> {
  const toegang = await wedstrijdToegang(wedstrijdId)
  if (toegang.ok) return { ok: true }
  switch (toegang.reden) {
    case 'niet_ingelogd': return weiger('Not logged in', 401)
    case 'demo': return weiger('Not allowed in demo mode', 403)
    case 'niet_gevonden': return weiger('Wedstrijd niet gevonden', 404)
    default: return weiger('Not allowed', 403)
  }
}
