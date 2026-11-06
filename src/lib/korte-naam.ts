import type { SupabaseClient } from '@supabase/supabase-js'

export interface SpelerNaam {
  id: string
  voornaam: string | null
  achternaam: string | null
}

// Geeft per speler-id de verkorte achternaam terug, bv. 'Van Der Steen' → 'S.'.
// Botsen twee verschillende spelers op voornaam + verkorting, dan wordt het laatste woord
// van hun achternaam letter per letter verlengd. Blijven namen gelijk (bv. identieke volledige
// namen), dan krijgen de latere spelers (gesorteerd op id) ' (2)', ' (3)', ...
export function korteAchternamen(spelers: SpelerNaam[]): Map<string, string> {
  const uniek = new Map<string, SpelerNaam>()
  for (const s of spelers) if (!uniek.has(s.id)) uniek.set(s.id, s)

  const items = [...uniek.values()]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map(s => {
      const woorden = (s.achternaam ?? '').trim().split(/\s+/).filter(Boolean)
      const laatste = woorden[woorden.length - 1] ?? ''
      return { id: s.id, voornaam: (s.voornaam ?? '').trim(), laatste, lengte: laatste ? 1 : 0 }
    })

  const toon = (i: typeof items[number]) =>
    i.lengte >= i.laatste.length ? i.laatste : i.laatste.slice(0, i.lengte) + '.'
  // Zonder punt vergelijken: 'Lo' (volledig woord) en 'Lo.' (prefix) botsen ook.
  const sleutel = (i: typeof items[number]) => `${i.voornaam} ${toon(i).replace(/\.$/, '')}`.toLowerCase()

  let verlengd = true
  while (verlengd) {
    verlengd = false
    const groepen = new Map<string, typeof items>()
    for (const i of items) groepen.set(sleutel(i), [...(groepen.get(sleutel(i)) ?? []), i])

    for (const groep of groepen.values()) {
      // Enkel verlengen als er echt verschillende namen in de groep zitten.
      const namen = new Set(groep.map(i => `${i.voornaam} ${i.laatste}`.toLowerCase()))
      if (namen.size < 2) continue
      for (const i of groep) {
        if (i.lengte < i.laatste.length) {
          i.lengte++
          verlengd = true
        }
      }
    }
  }

  const resultaat = new Map<string, string>()
  const teller = new Map<string, number>()
  for (const i of items) {
    const n = (teller.get(sleutel(i)) ?? 0) + 1
    teller.set(sleutel(i), n)
    resultaat.set(i.id, n === 1 ? toon(i) : `${toon(i)} (${n})`.trim())
  }
  return resultaat
}

export function weergaveNaam(voornaam: string | null, korteAchternaam: string | undefined) {
  return [(voornaam ?? '').trim(), korteAchternaam ?? ''].filter(Boolean).join(' ')
}

// Supabase geeft max. 1000 rijen per request; lange .in()-lijsten maken de URL te lang.
const PAGINA = 1000
const IN_BLOK = 100

type Pagina<T> = PromiseLike<{ data: T[] | null; error: unknown }>

// Haalt pagina per pagina op tot een pagina minder rijen geeft dan gevraagd.
// De query moet een stabiele volgorde hebben (order op id).
async function alleRijen<T>(query: (van: number, tot: number) => Pagina<T>): Promise<T[]> {
  const rijen: T[] = []
  for (let van = 0; ; van += PAGINA) {
    const { data, error } = await query(van, van + PAGINA - 1)
    if (error || !data) break
    rijen.push(...data)
    if (data.length < PAGINA) break
  }
  return rijen
}

// Zelfde als alleRijen, maar met de waarden voor .in() opgesplitst in blokken.
async function alleRijenIn<T>(waarden: string[], query: (blok: string[], van: number, tot: number) => Pagina<T>) {
  const rijen: T[] = []
  for (let i = 0; i < waarden.length; i += IN_BLOK) {
    const blok = waarden.slice(i, i + IN_BLOK)
    rijen.push(...await alleRijen((van, tot) => query(blok, van, tot)))
  }
  return rijen
}

// Alle spelers van een wedstrijd (deelnames + ingedeelde spelers, ook invallers), zodat
// schema en stand dezelfde verkortingen tonen.
export async function korteAchternamenVoorWedstrijd(admin: SupabaseClient, wedstrijdId: string) {
  const deelnames = await alleRijen<{ speler_id: string }>((van, tot) => admin
    .from('deelnames').select('speler_id').eq('wedstrijd_id', wedstrijdId).order('id').range(van, tot))

  const rondes = await alleRijen<{ id: string }>((van, tot) => admin
    .from('rondes').select('id').eq('wedstrijd_id', wedstrijdId).order('id').range(van, tot))

  const groepen = await alleRijenIn<{ id: string }>(rondes.map(r => r.id), (blok, van, tot) => admin
    .from('groepen').select('id').in('ronde_id', blok).order('id').range(van, tot))

  const groepSpelers = await alleRijenIn<{ speler_id: string }>(groepen.map(g => g.id), (blok, van, tot) => admin
    .from('groep_spelers').select('speler_id').in('groep_id', blok).order('id').range(van, tot))

  const spelerIds = [...new Set([...deelnames, ...groepSpelers].map(r => r.speler_id))]
  const spelers = await alleRijenIn<SpelerNaam>(spelerIds, (blok, van, tot) => admin
    .from('spelers').select('id, voornaam, achternaam').in('id', blok).order('id').range(van, tot))

  return korteAchternamen(spelers)
}
