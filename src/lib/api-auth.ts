import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type ToegangResultaat =
  | { ok: true }
  | { ok: false; response: NextResponse }

function weiger(fout: string, status: number): ToegangResultaat {
  return { ok: false, response: NextResponse.json({ fout }, { status }) }
}

export async function requireWedstrijdAccess(wedstrijdId: string): Promise<ToegangResultaat> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return weiger('Not logged in', 401)

  const { data: gebruiker } = await supabase
    .from('gebruikers')
    .select('club_id, rol, is_demo')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!gebruiker) return weiger('Not allowed', 403)
  if (gebruiker.is_demo) return weiger('Not allowed in demo mode', 403)

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: wedstrijd } = await admin
    .from('wedstrijden')
    .select('club_id')
    .eq('id', wedstrijdId)
    .maybeSingle()

  if (!wedstrijd) return weiger('Wedstrijd niet gevonden', 404)

  if (gebruiker.rol !== 'admin' && wedstrijd.club_id !== gebruiker.club_id) {
    return weiger('Not allowed', 403)
  }

  return { ok: true }
}
