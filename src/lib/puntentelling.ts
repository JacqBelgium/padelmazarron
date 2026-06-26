// ============================================================
// Puntentelling — berekent punten uit set uitslagen
// ============================================================
import type { Set, Punt } from '@/types/database'

export interface SetUitslag {
  setId: string
  groepId: string
  rondeId: string
  wedstrijdId: string
  set_nummer: 1 | 2 | 3
  team1: { speler1Id: string; speler2Id: string }
  team2: { speler1Id: string; speler2Id: string }
  games_team1: number
  games_team2: number
  invallers: Set<string>   // speler IDs die invaller zijn
}

export interface SpelerPunten {
  speler_id: string
  set_id: string
  ronde_id: string
  wedstrijd_id: string
  games_gewonnen: number
  set_gewonnen: boolean
  is_invaller: boolean
}

/**
 * Bereken punten voor alle spelers in een set
 * Elk gewonnen game = 1 punt (ook voor verliezer)
 * Set gewonnen als games_team1 > games_team2
 */
export function berekenSetPunten(uitslag: SetUitslag): SpelerPunten[] {
  const { games_team1, games_team2 } = uitslag
  const team1Wint = games_team1 > games_team2
  const punten: SpelerPunten[] = []

  const maakPunt = (speler_id: string, games: number, setGewonnen: boolean): SpelerPunten => ({
    speler_id,
    set_id: uitslag.setId,
    ronde_id: uitslag.rondeId,
    wedstrijd_id: uitslag.wedstrijdId,
    games_gewonnen: games,
    set_gewonnen: setGewonnen,
    is_invaller: uitslag.invallers.has(speler_id)
  })

  // Team 1
  punten.push(maakPunt(uitslag.team1.speler1Id, games_team1, team1Wint))
  punten.push(maakPunt(uitslag.team1.speler2Id, games_team1, team1Wint))
  // Team 2
  punten.push(maakPunt(uitslag.team2.speler1Id, games_team2, !team1Wint))
  punten.push(maakPunt(uitslag.team2.speler2Id, games_team2, !team1Wint))

  return punten
}

export interface StandRij {
  speler_id: string
  weergave_naam: string
  geslacht: 'M' | 'V'
  totaal_games: number
  totaal_sets: number
  rondes_gespeeld: number
  positie?: number
}

/** Sorteer stand: primair gewonnen games, secundair gewonnen sets */
export function sorteerStand(rijen: StandRij[]): StandRij[] {
  return [...rijen]
    .sort((a, b) => {
      if (b.totaal_games !== a.totaal_games) return b.totaal_games - a.totaal_games
      return b.totaal_sets - a.totaal_sets
    })
    .map((r, i) => ({ ...r, positie: i + 1 }))
}
