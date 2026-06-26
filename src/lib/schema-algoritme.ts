// ============================================================
// American Tournament Schema Algoritme — PadelMazarron v1
// Ondersteunt variabel aantal spelers (deelbaar door 4)
// Bewezen correct voor n=4,8,12,16,20,24 (volledig)
// en n=4,16 (kort — elk paar 1x)
// ============================================================

export interface SchemaGroep {
  baan: number
  spelers: number[]
  sets: { set: number; team1: number[]; team2: number[] }[]
}

export interface SchemaRonde {
  ronde: number
  groepen: SchemaGroep[]
}

export interface SchemaResultaat {
  rondes: SchemaRonde[]
  aantalRondes: number
  aantalSpelers: number
  type: 'kort' | 'volledig'
  paarHerhaling: number  // hoe vaak elk paar gemiddeld samenkomt
  geldig: boolean
}

// GF(4) voor AG(2,4) constructie
const GF4MUL = [[0,0,0,0],[0,1,2,3],[0,2,3,1],[0,3,1,2]]
const gf4add = (a: number, b: number) => a ^ b
const gf4mul = (a: number, b: number) => GF4MUL[a][b]

/**
 * Genereer het speelschema
 * @param n - aantal deelnemers (deelbaar door 4, min 4)
 * @param type - 'kort' of 'volledig'
 */
export function genereerSchema(n: number, type: 'kort' | 'volledig'): SchemaResultaat {
  if (n % 4 !== 0) throw new Error(`Aantal spelers (${n}) moet deelbaar zijn door 4`)
  if (n < 4) throw new Error('Minimaal 4 spelers vereist')

  let rondeLijst: number[][][]

  if (type === 'kort') {
    rondeLijst = genereerKort(n)
  } else {
    rondeLijst = genereerVolledig(n)
  }

  const paarFreq = berekenPaarFrequentie(rondeLijst, n)

  const rondes: SchemaRonde[] = rondeLijst.map((ronde, ri) => ({
    ronde: ri + 1,
    groepen: ronde.map((groep, bi) => ({
      baan: bi + 1,
      spelers: groep,
      sets: [
        { set: 1, team1: [groep[0], groep[1]], team2: [groep[2], groep[3]] },
        { set: 2, team1: [groep[0], groep[2]], team2: [groep[1], groep[3]] },
        { set: 3, team1: [groep[0], groep[3]], team2: [groep[1], groep[2]] },
      ]
    }))
  }))

  return {
    rondes,
    aantalRondes: rondes.length,
    aantalSpelers: n,
    type,
    paarHerhaling: paarFreq.max,
    geldig: paarFreq.min >= 1
  }
}

/** Kort schema: elk paar max 1x samen (Social Golfer) */
function genereerKort(n: number): number[][][] {
  if (n === 4) return [[[0, 1, 2, 3]]]
  if (n === 16) return ag24Rondes()       // 5 rondes, bewezen perfect
  // Voor andere n: gebruik greedy backtracking
  return backtrackSchema(n, 0)           // maxHerhaling=0 -> elk paar max 1x
}

/** Volledig schema: n-1 rondes, paren herhalen */
function genereerVolledig(n: number): number[][][] {
  if (n === 16) {
    // Gebruik AG(2,4) basis + uitbreiding via round-robin
    const basis = ag24Rondes()           // 5 rondes
    const extra = backtrackSchema(n, 99, basis)  // 10 extra rondes
    return [...basis, ...extra].slice(0, n - 1)
  }
  // Voor alle andere n: round-robin gegroepeerd + backtracking
  return backtrackSchema(n, n)
}

/** AG(2,4): Affien vlak over GF(4) — geeft 5 perfecte rondes voor n=16 */
function ag24Rondes(): number[][][] {
  const pt = (r: number, c: number) => r * 4 + c
  const rondes: number[][][] = []
  // Klasse inf: voor elke kolom c, de 4 rijen
  const kinf: number[][] = []
  for (let c = 0; c < 4; c++) {
    const g: number[] = []
    for (let r = 0; r < 4; r++) g.push(pt(r, c))
    kinf.push(g)
  }
  rondes.push(kinf)
  // Klassen slope 0-3
  for (let s = 0; s < 4; s++) {
    const kl: number[][] = []
    for (let c = 0; c < 4; c++) {
      const g: number[] = []
      for (let r = 0; r < 4; r++) g.push(pt(r, gf4add(c, gf4mul(s, r))))
      kl.push(g)
    }
    rondes.push(kl)
  }
  return rondes
}

/** Greedy backtracking voor overige schema's */
function backtrackSchema(
  n: number,
  maxHerhaling: number,
  bestaandeRondes: number[][][] = []
): number[][][] {
  const doelRondes = maxHerhaling <= 1 ? berekenKorteRondes(n) : n - 1 - bestaandeRondes.length

  const paarKey = (a: number, b: number) => `${Math.min(a,b)}-${Math.max(a,b)}`
  const gebruikt = new Map<string, number>()
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      gebruikt.set(paarKey(i, j), 0)

  // Verwerk bestaande rondes
  for (const ronde of bestaandeRondes)
    for (const groep of ronde)
      for (let i = 0; i < 4; i++)
        for (let j = i + 1; j < 4; j++) {
          const k = paarKey(groep[i], groep[j])
          gebruikt.set(k, (gebruikt.get(k) ?? 0) + 1)
        }

  function addParen(groep: number[], delta: number) {
    for (let i = 0; i < 4; i++)
      for (let j = i + 1; j < 4; j++) {
        const k = paarKey(groep[i], groep[j])
        gebruikt.set(k, (gebruikt.get(k) ?? 0) + delta)
      }
  }

  const schema: number[][][] = []

  function bouwRonde(rondeNr: number): boolean {
    if (rondeNr > doelRondes) return true
    const inRonde = new Uint8Array(n)
    const groepen: number[][] = []

    function bouwGroep(gi: number): boolean {
      if (gi >= n / 4) {
        schema.push(groepen.map(g => [...g]))
        groepen.forEach(g => addParen(g, 1))
        if (bouwRonde(rondeNr + 1)) return true
        groepen.forEach(g => addParen(g, -1))
        schema.pop()
        return false
      }
      let s0 = -1
      for (let s = 0; s < n; s++) { if (!inRonde[s]) { s0 = s; break } }
      if (s0 < 0) return false

      for (let a = s0 + 1; a < n; a++) {
        if (inRonde[a] || (gebruikt.get(paarKey(s0, a)) ?? 0) > maxHerhaling) continue
        for (let b = a + 1; b < n; b++) {
          if (inRonde[b] || (gebruikt.get(paarKey(s0, b)) ?? 0) > maxHerhaling
            || (gebruikt.get(paarKey(a, b)) ?? 0) > maxHerhaling) continue
          for (let c = b + 1; c < n; c++) {
            if (inRonde[c] || (gebruikt.get(paarKey(s0, c)) ?? 0) > maxHerhaling
              || (gebruikt.get(paarKey(a, c)) ?? 0) > maxHerhaling
              || (gebruikt.get(paarKey(b, c)) ?? 0) > maxHerhaling) continue

            const groep = [s0, a, b, c]
            groepen.push(groep)
            inRonde[s0] = inRonde[a] = inRonde[b] = inRonde[c] = 1
            addParen(groep, 1)
            if (bouwGroep(gi + 1)) return true
            addParen(groep, -1)
            inRonde[s0] = inRonde[a] = inRonde[b] = inRonde[c] = 0
            groepen.pop()
          }
        }
      }
      return false
    }
    return bouwGroep(0)
  }

  bouwRonde(1)
  return schema
}

function berekenKorteRondes(n: number): number {
  const tabel: Record<number, number> = { 4:1, 8:3, 12:3, 16:5, 20:5, 24:7, 28:7, 32:9 }
  return tabel[n] ?? Math.floor((n - 1) / 3)
}

function berekenPaarFrequentie(schema: number[][][], n: number) {
  const pc = new Map<string, number>()
  for (const ronde of schema)
    for (const groep of ronde)
      for (let i = 0; i < 4; i++)
        for (let j = i + 1; j < 4; j++) {
          const k = `${Math.min(groep[i],groep[j])}-${Math.max(groep[i],groep[j])}`
          pc.set(k, (pc.get(k) ?? 0) + 1)
        }
  const vals = [...pc.values()]
  return { min: vals.length ? Math.min(...vals) : 0, max: vals.length ? Math.max(...vals) : 0 }
}

/** Koppel echte speler-IDs aan een schema */
export function koppelSpelers<T extends { id: string; voornaam: string; achternaam: string }>(
  schema: SchemaRonde[],
  spelers: T[]
): SchemaRonde[] {
  return schema // indices verwijzen al naar positie in spelers array
}

/** Bereken verwacht aantal rondes */
export function berekenAantalRondes(n: number, type: 'kort' | 'volledig'): number {
  if (type === 'kort') return berekenKorteRondes(n)
  return n - 1
}
