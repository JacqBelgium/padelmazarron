// Standings: totals per player from the punten rows, and ranking with shared positions for ties.

export interface PuntRij { speler_id: string; games_gewonnen: number; set_gewonnen: boolean; ronde_id: string; afwezig?: boolean | null }

// forfaits = number of rounds the player missed (points rows with afwezig true). It does not affect the ranking.
export interface Totalen { totaal_games: number; totaal_sets: number; rondes_gespeeld: number; forfaits: number }

// Totals per player. totaal_sets counts matches won (the column is still called set_gewonnen).
export function telPunten(punten: PuntRij[]): Map<string, Totalen> {
  const totalen = new Map<string, Totalen>()
  const rondes = new Map<string, Set<string>>()
  const gemist = new Map<string, Set<string>>()
  for (const p of punten) {
    if (!totalen.has(p.speler_id)) {
      totalen.set(p.speler_id, geenTotalen())
      rondes.set(p.speler_id, new Set())
      gemist.set(p.speler_id, new Set())
    }
    const rij = totalen.get(p.speler_id)!
    rij.totaal_games += p.games_gewonnen ?? 0
    if (p.set_gewonnen) rij.totaal_sets += 1
    rondes.get(p.speler_id)!.add(p.ronde_id)
    if (p.afwezig) gemist.get(p.speler_id)!.add(p.ronde_id)
  }
  for (const [spelerId, set] of rondes) totalen.get(spelerId)!.rondes_gespeeld = set.size
  for (const [spelerId, set] of gemist) totalen.get(spelerId)!.forfaits = set.size
  return totalen
}

export function geenTotalen(): Totalen {
  return { totaal_games: 0, totaal_sets: 0, rondes_gespeeld: 0, forfaits: 0 }
}

// One F per missed round ('FFF'); above 6 'F×7' so the column stays narrow. Empty for 0.
export function forfaitTekst(aantal: number) {
  if (!aantal || aantal <= 0) return ''
  return aantal > 6 ? `F×${aantal}` : 'F'.repeat(aantal)
}

// Title / tooltip text for the F column; empty for 0.
export function forfaitTitel(aantal: number) {
  return aantal > 0 ? `Missed rounds: ${aantal}` : ''
}

/**
 * Sorts one list (men or women) by games, then matches won, both descending, and numbers it from 1.
 * Players with equal games and equal matches won share a position and the next one is skipped
 * (1, 2, 2, 4). Within a tie the list is ordered by name, which does not affect the position.
 */
export function rangschik<T extends Totalen & { naam: string }>(rijen: T[]): (T & { positie: number })[] {
  const gesorteerd = [...rijen].sort((a, b) =>
    b.totaal_games - a.totaal_games
    || b.totaal_sets - a.totaal_sets
    || a.naam.localeCompare(b.naam)
  )
  const resultaat: (T & { positie: number })[] = []
  gesorteerd.forEach((rij, index) => {
    const vorige = resultaat[index - 1]
    const gelijk = vorige && vorige.totaal_games === rij.totaal_games && vorige.totaal_sets === rij.totaal_sets
    resultaat.push({ ...rij, positie: gelijk ? vorige.positie : index + 1 })
  })
  return resultaat
}
