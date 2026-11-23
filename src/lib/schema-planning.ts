// Pure helpers for planning a schedule: shuffling players and computing round dates.

/**
 * Fisher-Yates shuffle into a new array. `willekeurig(max)` must return a uniformly random
 * integer in [0, max); pass crypto.randomInt for cryptographically random positions.
 */
export function schud<T>(items: readonly T[], willekeurig: (max: number) => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = willekeurig(i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const DAG_MS = 24 * 60 * 60 * 1000
const datumPatroon = /^(\d{4})-(\d{2})-(\d{2})/

// Parses the date part (YYYY-MM-DD) of a date or timestamp string as a UTC day; null when invalid.
export function parseDatum(waarde: unknown): number | null {
  if (typeof waarde !== 'string') return null
  const match = waarde.match(datumPatroon)
  if (!match) return null
  const [, jaar, maand, dag] = match.map(Number)
  const ms = Date.UTC(jaar, maand - 1, dag)
  const controle = new Date(ms)
  if (controle.getUTCFullYear() !== jaar || controle.getUTCMonth() !== maand - 1 || controle.getUTCDate() !== dag) return null
  return ms
}

// Today's date in the Europe/Brussels time zone as YYYY-MM-DD.
export function vandaagBrussel(nu: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit' }).format(nu)
}

function formatDatum(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Round r (1-based) starts on datumVan + (r - 1) * duurDagen and ends duurDagen - 1 days later.
 * All arithmetic is in UTC; dates are returned as YYYY-MM-DD.
 */
export function rondeDatums(datumVanMs: number, duurDagen: number, aantalRondes: number) {
  return Array.from({ length: aantalRondes }, (_, index) => {
    const start = datumVanMs + index * duurDagen * DAG_MS
    return { ronde: index + 1, start_datum: formatDatum(start), eind_datum: formatDatum(start + (duurDagen - 1) * DAG_MS) }
  })
}
