// ============================================================
// Whist schedule generator for 4, 8, 12 and 16 players.
// Every schedule has n - 1 rounds and n / 4 matches per round; every player
// plays once per round, every pair are partners exactly once and opponents
// exactly twice.
// ============================================================

export type WhistWedstrijd = { team1: [number, number]; team2: [number, number] }
export type WhistRonde = { ronde: number; wedstrijden: WhistWedstrijd[] }
export type WhistSchema = { rondes: WhistRonde[] }

// A match stored as [team1 player 1, team1 player 2, team2 player 1, team2 player 2].
type Rij = [number, number, number, number]

// n = 8: cyclic schedule over Z_7 plus fixed player 7. Round r is the base
// round with every player except 7 shifted by r (mod 7). Found by a one-off
// backtracking search over the base round; stored so nothing is searched at runtime.
const SCHEMA_8: Rij[][] = [
  [[0, 1, 2, 4], [3, 6, 5, 7]],
  [[1, 2, 3, 5], [4, 0, 6, 7]],
  [[2, 3, 4, 6], [5, 1, 0, 7]],
  [[3, 4, 5, 0], [6, 2, 1, 7]],
  [[4, 5, 6, 1], [0, 3, 2, 7]],
  [[5, 6, 0, 2], [1, 4, 3, 7]],
  [[6, 0, 1, 3], [2, 5, 4, 7]],
]

// n = 12: cyclic schedule over Z_11 plus a fixed player, built the same way, then with the
// players renumbered (which keeps every schedule property) so that wijsCaptainsToe gives
// every player 2 or 3 captaincies. In this numbering the fixed player is 7.
const SCHEMA_12: Rij[][] = [
  [[0, 2, 11, 8], [10, 5, 9, 4], [1, 7, 6, 3]],
  [[11, 9, 10, 6], [2, 8, 1, 5], [4, 7, 3, 0]],
  [[10, 1, 2, 3], [9, 6, 4, 8], [5, 7, 0, 11]],
  [[2, 4, 9, 0], [1, 3, 5, 6], [8, 7, 11, 10]],
  [[9, 5, 1, 11], [4, 0, 8, 3], [6, 7, 10, 2]],
  [[1, 8, 4, 10], [5, 11, 6, 0], [3, 7, 2, 9]],
  [[4, 6, 5, 2], [8, 10, 3, 11], [0, 7, 9, 1]],
  [[5, 3, 8, 9], [6, 2, 0, 10], [11, 7, 1, 4]],
  [[8, 0, 6, 1], [3, 9, 11, 2], [10, 7, 4, 5]],
  [[6, 11, 3, 4], [0, 1, 10, 9], [2, 7, 5, 8]],
  [[3, 10, 0, 5], [11, 4, 2, 1], [9, 7, 8, 6]],
]

// The three ways a group of four splits into two teams: each member partners each other member once.
function partnerCombinaties([a, b, c, d]: number[]): Rij[] {
  return [[a, b, c, d], [a, c, b, d], [a, d, b, c]]
}

// GF(4) with elements 0..3; addition is XOR, multiplication by table.
const GF4_MUL = [[0, 0, 0, 0], [0, 1, 2, 3], [0, 2, 3, 1], [0, 3, 1, 2]]

// The five parallel classes of the affine plane AG(2,4). Point (x, y) is player 4x + y.
// Each class is four disjoint lines of four points; every pair of points lies on exactly one line.
function ag24Klassen(): number[][][] {
  const punt = (x: number, y: number) => 4 * x + y
  const klassen: number[][][] = []
  // Vertical lines x = c.
  klassen.push([0, 1, 2, 3].map((c) => [0, 1, 2, 3].map((y) => punt(c, y))))
  // Lines y = s * x + c for slope s = 0..3.
  for (let s = 0; s < 4; s++) {
    klassen.push([0, 1, 2, 3].map((c) => [0, 1, 2, 3].map((x) => punt(x, GF4_MUL[s][x] ^ c))))
  }
  return klassen
}

function groepRondes(klassen: number[][][]): Rij[][] {
  const rondes: Rij[][] = []
  for (const klasse of klassen) {
    const perGroep = klasse.map(partnerCombinaties)
    // Three consecutive rounds per class: round k plays combination k in every group.
    for (let k = 0; k < 3; k++) rondes.push(perGroep.map((combinaties) => combinaties[k]))
  }
  return rondes
}

function naarSchema(rijen: Rij[][]): WhistSchema {
  return {
    rondes: rijen.map((ronde, index) => ({
      ronde: index + 1,
      wedstrijden: ronde.map(([a, b, c, d]) => ({ team1: [a, b], team2: [c, d] })),
    })),
  }
}

export function genereerWhist(n: number): WhistSchema | null {
  switch (n) {
    case 4: return naarSchema(groepRondes([[[0, 1, 2, 3]]]))
    case 8: return naarSchema(SCHEMA_8)
    case 12: return naarSchema(SCHEMA_12)
    case 16: return naarSchema(groepRondes(ag24Klassen()))
    default: return null
  }
}

/**
 * Picks a captain for every match: result[r][w] is the index (0..3) of the captain in
 * [team1[0], team1[1], team2[0], team2[1]] of match w in round r. Goes round by round and
 * match by match, choosing the member with the fewest captaincies so far, then the one who
 * was captain longest ago (never counts as longest ago), then the lowest player number.
 */
export function wijsCaptainsToe(schema: WhistSchema): number[][] {
  const aantal = new Map<number, number>()
  const laatst = new Map<number, number>()
  let volgnummer = 0

  return schema.rondes.map((ronde) => ronde.wedstrijden.map((wedstrijd) => {
    const spelers = [...wedstrijd.team1, ...wedstrijd.team2]
    let beste = 0
    for (let i = 1; i < 4; i++) {
      const kandidaat = spelers[i]
      const huidig = spelers[beste]
      const verschilAantal = (aantal.get(kandidaat) ?? 0) - (aantal.get(huidig) ?? 0)
      const verschilLaatst = (laatst.get(kandidaat) ?? -1) - (laatst.get(huidig) ?? -1)
      if (verschilAantal < 0 || (verschilAantal === 0 && (verschilLaatst < 0 || (verschilLaatst === 0 && kandidaat < huidig)))) {
        beste = i
      }
    }
    const captain = spelers[beste]
    aantal.set(captain, (aantal.get(captain) ?? 0) + 1)
    laatst.set(captain, volgnummer++)
    return beste
  }))
}
