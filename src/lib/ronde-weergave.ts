// Loading and display helpers for rounds and matches (one groepen row = one match with one sets row).
import type { SupabaseClient } from '@supabase/supabase-js'

export interface SpelerNaam { id: string; voornaam: string; achternaam: string }

export interface MatchUitslag {
  id: string
  team1_speler1_id: string; team1_speler2_id: string
  team2_speler1_id: string; team2_speler2_id: string
  games_team1: number | null; games_team2: number | null
}

export interface MatchInfo {
  id: string
  ronde_id: string
  baan_nummer: number
  status: string | null
  captain_speler_id: string | null
  spelers: SpelerNaam[]
  uitslag: MatchUitslag | null
  // The player marked groep_spelers.afwezig for this match ('Player absent, no substitute'), or null.
  afwezig_speler_id: string | null
}

// Outcome of a match, stored in groepen.status. 'gepland' (or null) means no outcome yet.
export const UITKOMSTEN = ['gespeeld', 'forfait_team1', 'forfait_team2', 'speler_afwezig', 'niet_gespeeld'] as const
export type Uitkomst = typeof UITKOMSTEN[number]

const uitkomstLabels: Record<Uitkomst, string> = {
  gespeeld: 'Played',
  forfait_team1: 'Team 1 forfait',
  forfait_team2: 'Team 2 forfait',
  speler_afwezig: 'Player absent, no substitute',
  niet_gespeeld: 'Both teams absent',
}

export function isUitkomst(status: string | null | undefined): status is Uitkomst {
  return !!status && (UITKOMSTEN as readonly string[]).includes(status)
}

export function uitkomstLabel(status: string | null | undefined) {
  return isUitkomst(status) ? uitkomstLabels[status] : ''
}

const rondeStatusLabels: Record<string, string> = {
  Gepland: 'Planned',
  Open: 'Open',
  Volledig: 'Complete',
  Afgesloten: 'Closed',
}

// Results can be entered in an Open or Volledig round, never by the demo (read-only) user.
export function kanUitslagenInvoeren(rondeStatus: string | null | undefined, isDemo: boolean) {
  return (rondeStatus === 'Open' || rondeStatus === 'Volledig') && !isDemo
}

export function rondeStatusLabel(status: string | null | undefined) {
  return (status && rondeStatusLabels[status]) || status || '-'
}

// 'YYYY-MM-DD' (or a timestamp) as dd/mm/yyyy, without time zone shifts.
export function formatDatum(waarde: string | null | undefined) {
  const match = waarde?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '-'
}

export function periode(start: string | null | undefined, eind: string | null | undefined) {
  return `${formatDatum(start)} - ${formatDatum(eind)}`
}

export function heeftUitslag(uitslag: MatchUitslag | null) {
  return uitslag !== null && uitslag.games_team1 !== null && uitslag.games_team2 !== null
}

// Outcome without score or names, for the public schedule: 'Played', 'Forfait team 1', 'Forfait team 2',
// 'Player absent, not played', 'Both teams absent, not played'. Empty when the match has no outcome.
export function uitkomstKort(status: string | null | undefined) {
  switch (status) {
    case 'gespeeld': return 'Played'
    case 'forfait_team1': return 'Forfait team 1'
    case 'forfait_team2': return 'Forfait team 2'
    case 'speler_afwezig': return 'Player absent, not played'
    case 'niet_gespeeld': return 'Both teams absent, not played'
    default: return ''
  }
}

// A match has a result when it has any outcome other than 'gepland', or (older rows) stored games.
export function heeftUitkomst(match: Pick<MatchInfo, 'status' | 'uitslag'>) {
  return isUitkomst(match.status) || heeftUitslag(match.uitslag)
}

// Result text for overviews, e.g. '6 - 3', 'Forfait team 1: 0 - 5', 'Player absent, no substitute (Ann)', 'Both teams absent'.
export function uitkomstTekst(match: MatchInfo) {
  const u = match.uitslag
  const score = u && heeftUitslag(u) ? `${u.games_team1} - ${u.games_team2}` : ''
  switch (match.status) {
    case 'forfait_team1': return `${uitkomstKort(match.status)}: ${score}`
    case 'forfait_team2': return `${uitkomstKort(match.status)}: ${score}`
    case 'speler_afwezig': {
      const speler = match.spelers.find(s => s.id === match.afwezig_speler_id)
      return speler ? `Player absent, no substitute (${speler.voornaam}): ${score}` : `Player absent, no substitute: ${score}`
    }
    case 'niet_gespeeld': return 'Both teams absent'
    default: return score
  }
}

// Loads all matches of the given rounds in one query, with players and the single result row.
export async function laadMatches(supabase: SupabaseClient, rondeIds: string[]): Promise<{ matches: MatchInfo[]; fout: string | null }> {
  if (rondeIds.length === 0) return { matches: [], fout: null }
  const { data, error } = await supabase
    .from('groepen')
    .select(`
      id, ronde_id, baan_nummer, status, captain_speler_id,
      groep_spelers(speler_id, afwezig, spelers(id, voornaam, achternaam)),
      sets(id, set_nummer, team1_speler1_id, team1_speler2_id, team2_speler1_id, team2_speler2_id, games_team1, games_team2)
    `)
    .in('ronde_id', rondeIds)
    .order('baan_nummer')
  if (error) return { matches: [], fout: error.message }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matches = (data ?? []).map((g: any): MatchInfo => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sets = (g.sets ?? []) as any[]
    const uitslag = sets.find(s => s.set_nummer === 1) ?? sets[0] ?? null
    return {
      id: g.id,
      ronde_id: g.ronde_id,
      baan_nummer: g.baan_nummer,
      status: g.status ?? null,
      captain_speler_id: g.captain_speler_id ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spelers: (g.groep_spelers ?? []).map((gs: any) => gs.spelers).filter(Boolean),
      uitslag,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      afwezig_speler_id: (g.groep_spelers ?? []).find((gs: any) => gs.afwezig)?.speler_id ?? null,
    }
  })
  return { matches, fout: null }
}

// 'A & B vs C & D', with '(captain)' behind the captain's name.
export function teamsTekst(match: MatchInfo) {
  const naam = (id: string) => {
    const speler = match.spelers.find(s => s.id === id)
    const tekst = speler ? `${speler.voornaam} ${speler.achternaam}` : '?'
    return id === match.captain_speler_id ? `${tekst} (captain)` : tekst
  }
  if (!match.uitslag) return match.spelers.map(s => naam(s.id)).join(' · ')
  const u = match.uitslag
  return `${naam(u.team1_speler1_id)} & ${naam(u.team1_speler2_id)} vs ${naam(u.team2_speler1_id)} & ${naam(u.team2_speler2_id)}`
}
