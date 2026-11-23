// Competition settings shared by the new-competition form and the competition page.
import { parseDatum, rondeDatums } from './schema-planning'

export const MAX_DEELNEMERS_OPTIES = [4, 8, 12, 16] as const
export const STANDAARD_MAX_DEELNEMERS = 16
export const STANDAARD_RONDE_DUUR = 7
export const RONDE_DUUR_MIN = 1
export const RONDE_DUUR_MAX = 60
export const SPEELDUUR_MIN = 15
export const SPEELDUUR_MAX = 600
export const STANDAARD_FORFAIT_GAMES = 5
export const FORFAIT_GAMES_MIN = 0
export const FORFAIT_GAMES_MAX = 99

// Form values are kept as strings so optional fields can be empty.
export type InstellingenWaarden = {
  datumVan: string
  maxDeelnemers: string
  rondeDuurDagen: string
  aantalRondes: string
  speelduurMinuten: string
  spelregels: string
  forfaitGames: string
  // Show missed rounds (F) on the public standings and PDF. Editable at any time.
  toonForfaitsPubliek: boolean
}

export type InstellingenPayload = {
  datum_van: string
  datum_tot: string
  max_deelnemers: number
  ronde_duur_dagen: number
  aantal_rondes: number | null
  speelduur_minuten: number | null
  spelregels: string | null
  forfait_games: number
  toon_forfaits_publiek: boolean
}

export const legeInstellingen: InstellingenWaarden = {
  datumVan: '',
  maxDeelnemers: String(STANDAARD_MAX_DEELNEMERS),
  rondeDuurDagen: String(STANDAARD_RONDE_DUUR),
  aantalRondes: '',
  speelduurMinuten: '',
  spelregels: '',
  forfaitGames: String(STANDAARD_FORFAIT_GAMES),
  toonForfaitsPubliek: false,
}

type WedstrijdInstellingenBron = {
  datum_van?: string | null
  max_deelnemers?: number | null
  ronde_duur_dagen?: number | null
  aantal_rondes?: number | null
  speelduur_minuten?: number | null
  spelregels?: string | null
  forfait_games?: number | null
  toon_forfaits_publiek?: boolean | null
}

export function waardenUitWedstrijd(w: WedstrijdInstellingenBron): InstellingenWaarden {
  return {
    datumVan: w.datum_van ? w.datum_van.slice(0, 10) : '',
    maxDeelnemers: String(w.max_deelnemers ?? STANDAARD_MAX_DEELNEMERS),
    rondeDuurDagen: String(w.ronde_duur_dagen ?? STANDAARD_RONDE_DUUR),
    aantalRondes: w.aantal_rondes ? String(w.aantal_rondes) : '',
    speelduurMinuten: w.speelduur_minuten ? String(w.speelduur_minuten) : '',
    spelregels: w.spelregels ?? '',
    forfaitGames: String(w.forfait_games ?? STANDAARD_FORFAIT_GAMES),
    toonForfaitsPubliek: w.toon_forfaits_publiek === true,
  }
}

const geheelGetal = (waarde: string) => (/^\d+$/.test(waarde.trim()) ? Number(waarde.trim()) : NaN)

// Forfeit games: whole number from 0 to 99. It stays editable after the start (default for new forfeits only).
export function leesForfaitGames(waarde: string): { forfait_games: number } | { fout: string } {
  const games = geheelGetal(waarde)
  if (!Number.isInteger(games) || games < FORFAIT_GAMES_MIN || games > FORFAIT_GAMES_MAX)
    return { fout: `Forfait games must be a whole number from ${FORFAIT_GAMES_MIN} to ${FORFAIT_GAMES_MAX}.` }
  return { forfait_games: games }
}

// Number of rounds actually played: the entered value, or participants minus one when empty.
export function effectieveRondes(waarden: InstellingenWaarden): number | null {
  const max = geheelGetal(waarden.maxDeelnemers)
  if (!Number.isInteger(max) || max < 4) return null
  if (!waarden.aantalRondes.trim()) return max - 1
  const rondes = geheelGetal(waarden.aantalRondes)
  return Number.isInteger(rondes) && rondes >= 1 && rondes <= max - 1 ? rondes : null
}

// Real number of rounds of a competition: the existing rounds when it has any, otherwise
// aantal_rondes when set, otherwise max_deelnemers - 1.
export function aantalRondesVan(w: { aantal_rondes?: number | null; max_deelnemers?: number | null }, bestaandeRondes = 0) {
  if (bestaandeRondes > 0) return bestaandeRondes
  return w.aantal_rondes ?? Math.max(0, (w.max_deelnemers ?? 0) - 1)
}

// End date = start date + rounds * round length - 1 day, or null when the values are not valid yet.
export function berekenEinddatum(waarden: InstellingenWaarden): string | null {
  const start = parseDatum(waarden.datumVan)
  const rondes = effectieveRondes(waarden)
  const duur = geheelGetal(waarden.rondeDuurDagen)
  if (start === null || rondes === null || !Number.isInteger(duur) || duur < RONDE_DUUR_MIN || duur > RONDE_DUUR_MAX) return null
  return rondeDatums(start, duur, rondes)[rondes - 1].eind_datum
}

// Validates the form and returns the columns to write, or a message for the first problem found.
export function naarPayload(waarden: InstellingenWaarden): { payload: InstellingenPayload } | { fout: string } {
  if (parseDatum(waarden.datumVan) === null) return { fout: 'Enter a valid start date.' }

  const max = geheelGetal(waarden.maxDeelnemers)
  if (!(MAX_DEELNEMERS_OPTIES as readonly number[]).includes(max)) return { fout: 'Maximum participants must be 4, 8, 12 or 16.' }

  const duur = geheelGetal(waarden.rondeDuurDagen)
  if (!Number.isInteger(duur) || duur < RONDE_DUUR_MIN || duur > RONDE_DUUR_MAX)
    return { fout: `Round length must be between ${RONDE_DUUR_MIN} and ${RONDE_DUUR_MAX} days.` }

  let aantalRondes: number | null = null
  if (waarden.aantalRondes.trim()) {
    aantalRondes = geheelGetal(waarden.aantalRondes)
    if (!Number.isInteger(aantalRondes) || aantalRondes < 1 || aantalRondes > max - 1)
      return { fout: `Number of rounds must be between 1 and ${max - 1}.` }
  }

  let speelduur: number | null = null
  if (waarden.speelduurMinuten.trim()) {
    speelduur = geheelGetal(waarden.speelduurMinuten)
    if (!Number.isInteger(speelduur) || speelduur < SPEELDUUR_MIN || speelduur > SPEELDUUR_MAX)
      return { fout: `Match duration must be between ${SPEELDUUR_MIN} and ${SPEELDUUR_MAX} minutes.` }
  }

  const forfait = leesForfaitGames(waarden.forfaitGames)
  if ('fout' in forfait) return forfait

  const einddatum = berekenEinddatum(waarden)
  if (!einddatum) return { fout: 'Could not compute the end date.' }

  return {
    payload: {
      datum_van: waarden.datumVan,
      datum_tot: einddatum,
      max_deelnemers: max,
      ronde_duur_dagen: duur,
      aantal_rondes: aantalRondes,
      speelduur_minuten: speelduur,
      spelregels: waarden.spelregels.trim() || null,
      forfait_games: forfait.forfait_games,
      toon_forfaits_publiek: waarden.toonForfaitsPubliek,
    },
  }
}
