// Server-side helpers for substitutes (invallers). Use only with the service-role (admin) client.
// Levels are read here and never returned to the client; callers only get the relation.
import { createClient as createAdmin, type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { wedstrijdToegang } from '@/lib/api-auth'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SPORTEN = ['padel', 'tennis', 'badminton', 'squash', 'pickleball']
const PAGINA = 1000

export function isUuid(waarde: unknown): waarde is string {
  return typeof waarde === 'string' && UUID.test(waarde)
}

export function adminClient() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Generic error response: { fout, code } with a fixed message per code, never personal data.
const meldingen: Record<string, string> = {
  ongeldige_invoer: 'Invalid input.',
  niet_gevonden: 'Match not found.',
  ronde_niet_open: 'Substitutes can only be changed while the round is open.',
  geen_speler_in_match: 'This player is not in this match.',
  zelfde_speler: 'A player cannot replace themselves.',
  kandidaat_niet_gevonden: 'This player was not found.',
  andere_club: 'This player belongs to another club.',
  is_deelnemer: 'This player already takes part in this competition.',
  al_in_ronde: 'This player already plays in this round.',
  heeft_al_invaller: 'This player already has a substitute in this match.',
  geen_invaller: 'This player has no substitute in this match.',
  uitslag_bestaat: 'This match already has a result. Clear it first.',
  niveau_verschilt: 'This player does not have the same level.',
  niveau_onbekend_bevestigen: 'The level of at least one player is unknown. Confirm to continue.',
  serverfout: 'Something went wrong. Please try again.',
  niet_ingelogd: 'Not logged in.',
  demo: 'Not allowed in demo mode.',
}

export function fout(code: keyof typeof meldingen, status: number) {
  return NextResponse.json({ fout: meldingen[code], code }, { status })
}

// Access to the competition of a match. Not logged in is checked before any lookup by the routes
// (isIngelogd). No access to this competition answers exactly like a match that does not exist,
// so nobody can find out which matches exist. Demo users get 403.
export async function toegangsFout(wedstrijdId: string): Promise<NextResponse | null> {
  const toegang = await wedstrijdToegang(wedstrijdId)
  if (toegang.ok) return null
  if (toegang.reden === 'niet_ingelogd') return fout('niet_ingelogd', 401)
  if (toegang.reden === 'demo') return fout('demo', 403)
  return fout('niet_gevonden', 404)
}

export interface MatchContext {
  groepId: string
  groepStatus: string | null
  rondeId: string
  rondeStatus: string
  wedstrijdId: string
  clubId: string
  setId: string | null
  gespeeld: boolean // the set row has stored games
  geplandeSpelers: string[] // the four planned players of the set row (empty without a set row)
}

// Loads the group with its round, competition and single set row in one query.
export async function laadMatchContext(admin: SupabaseClient, groepId: string): Promise<MatchContext | null> {
  const { data, error } = await admin
    .from('groepen')
    .select(`
      id, status, ronde_id,
      rondes!inner(id, status, wedstrijd_id, wedstrijden!inner(id, club_id)),
      sets(id, set_nummer, team1_speler1_id, team1_speler2_id, team2_speler1_id, team2_speler2_id, games_team1, games_team2)
    `)
    .eq('id', groepId)
    .maybeSingle()
  if (error || !data) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = data as any
  const ronde = Array.isArray(g.rondes) ? g.rondes[0] : g.rondes
  const wedstrijd = Array.isArray(ronde?.wedstrijden) ? ronde.wedstrijden[0] : ronde?.wedstrijden
  if (!ronde || !wedstrijd) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sets = (g.sets ?? []) as any[]
  const set = sets.find(s => s.set_nummer === 1) ?? sets[0] ?? null

  return {
    groepId: g.id,
    groepStatus: g.status ?? null,
    rondeId: ronde.id,
    rondeStatus: ronde.status,
    wedstrijdId: wedstrijd.id,
    clubId: wedstrijd.club_id,
    setId: set?.id ?? null,
    gespeeld: !!set && set.games_team1 !== null && set.games_team2 !== null,
    geplandeSpelers: set ? [set.team1_speler1_id, set.team1_speler2_id, set.team2_speler1_id, set.team2_speler2_id] : [],
  }
}

// The match has no result yet: status 'gepland' (or empty) and no stored games.
export function zonderUitslag(ctx: MatchContext) {
  return (ctx.groepStatus === null || ctx.groepStatus === 'gepland') && !ctx.gespeeld
}

// The competition's sport. wedstrijden has no sport column, so the value of this competition's
// invitations (uitnodigingen.sport) is used, then the club's sport, then 'padel'.
export async function sportVanWedstrijd(admin: SupabaseClient, wedstrijdId: string, clubId: string): Promise<string> {
  const { data: uitnodiging } = await admin
    .from('uitnodigingen')
    .select('sport')
    .eq('wedstrijd_id', wedstrijdId)
    .not('sport', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const uitUitnodiging = typeof uitnodiging?.sport === 'string' ? uitnodiging.sport.toLowerCase() : ''
  if (SPORTEN.includes(uitUitnodiging)) return uitUitnodiging

  const { data: club } = await admin.from('clubs').select('sport').eq('id', clubId).maybeSingle()
  const uitClub = typeof club?.sport === 'string' ? club.sport.toLowerCase() : ''
  return SPORTEN.includes(uitClub) ? uitClub : 'padel'
}

// Level per speler id for the sport: spelers.profiel_id -> gebruiker_niveaus. null = unknown.
export async function laadNiveaus(admin: SupabaseClient, spelerIds: string[], sport: string): Promise<Map<string, number | null>> {
  const niveaus = new Map<string, number | null>(spelerIds.map(id => [id, null]))
  const profielVan = new Map<string, string>()
  for (let i = 0; i < spelerIds.length; i += 100) {
    const { data } = await admin.from('spelers').select('id, profiel_id').in('id', spelerIds.slice(i, i + 100))
    for (const s of data ?? []) if (s.profiel_id) profielVan.set(s.id, s.profiel_id)
  }
  const profielIds = [...new Set(profielVan.values())]
  const niveauVanProfiel = new Map<string, number>()
  for (let i = 0; i < profielIds.length; i += 100) {
    const { data } = await admin
      .from('gebruiker_niveaus')
      .select('gebruiker_id, niveau')
      .eq('sport', sport)
      .in('gebruiker_id', profielIds.slice(i, i + 100))
    for (const n of data ?? []) if (typeof n.niveau === 'number') niveauVanProfiel.set(n.gebruiker_id, n.niveau)
  }
  for (const [spelerId, profielId] of profielVan) niveaus.set(spelerId, niveauVanProfiel.get(profielId) ?? null)
  return niveaus
}

export type NiveauRelatie = 'gelijk' | 'onbekend' | 'verschillend'

// 'gelijk' = both known and equal, 'onbekend' = at least one unknown, 'verschillend' = both known and different.
export function niveauRelatie(a: number | null | undefined, b: number | null | undefined): NiveauRelatie {
  if (a == null || b == null) return 'onbekend'
  return a === b ? 'gelijk' : 'verschillend'
}

// Speler ids with a confirmed participation in the competition.
export async function bevestigdeDeelnemers(admin: SupabaseClient, wedstrijdId: string): Promise<Set<string>> {
  const ids = new Set<string>()
  for (let van = 0; ; van += PAGINA) {
    const { data } = await admin
      .from('deelnames')
      .select('speler_id')
      .eq('wedstrijd_id', wedstrijdId)
      .eq('uitnodiging_status', 'bevestigd')
      .order('id')
      .range(van, van + PAGINA - 1)
    for (const d of data ?? []) ids.add(d.speler_id)
    if (!data || data.length < PAGINA) break
  }
  return ids
}

// Speler ids in any groep_spelers row of any group of the round (planned players and substitutes).
export async function spelersInRonde(admin: SupabaseClient, rondeId: string): Promise<Set<string> | null> {
  const { data, error } = await admin
    .from('groepen')
    .select('id, groep_spelers(speler_id)')
    .eq('ronde_id', rondeId)
  if (error) return null
  const ids = new Set<string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const g of (data ?? []) as any[]) for (const gs of g.groep_spelers ?? []) ids.add(gs.speler_id)
  return ids
}
