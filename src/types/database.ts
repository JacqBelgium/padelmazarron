// ============================================================
// Database Types — PadelMazarron v1
// ============================================================

export type AbonnementType = 'freemium' | 'premium'
export type AbonnementStatus = 'actief' | 'verlopen' | 'gepauzeerd'
export type Geslacht = 'M' | 'V'
export type Categorie = 'Alle' | 'Junior' | 'Senior' | '50+'
export type SpelerStatus = 'Actief' | 'Afgemeld' | 'Geblokkeerd' | 'Verwijderd'
export type WedstrijdStatus = 'Concept' | 'Actief' | 'Afgesloten'
export type Speelformaat = 'mixed_roulerend' | 'dubbel_heren' | 'dubbel_dames' | 'mixed_vast' | 'enkel_heren' | 'enkel_dames'
export type SchemaType = 'kort' | 'volledig'
export type RondeStatus = 'Open' | 'Volledig' | 'Afgesloten'
export type UitnodigingStatus = 'uitgenodigd' | 'bevestigd' | 'afgemeld'
export type GebruikerRol = 'admin' | 'beheerder'
export type GdprActie = 'toestemming_gegeven' | 'afmelding' | 'verwijdering_aangevraagd' | 'verwijdering_uitgevoerd' | 'inzage_aangevraagd'

export interface Club {
  id: string; naam: string; sport: string; subdomein: string | null
  logo_url: string | null; taal: string
  abonnement_type: AbonnementType; abonnement_status: AbonnementStatus
  abonnement_start: string | null; abonnement_einde: string | null
  betaald: boolean; betaald_tot: string | null
  privacyverklaring_naam: string | null; privacyverklaring_email: string | null
  created_at: string
}

export interface Gebruiker {
  id: string; club_id: string | null; auth_id: string | null
  email: string; naam: string; rol: GebruikerRol
  is_verwerkingsverantwoordelijke: boolean; speler_id: string | null
  created_at: string
}

export interface Speler {
  id: string; club_id: string; voornaam: string; achternaam: string
  geslacht: Geslacht; categorie: Categorie; email: string
  whatsapp: string | null; club_naam: string | null; status: SpelerStatus
  gdpr_toestemming: boolean; gdpr_datum: string | null; created_at: string
}

export interface Wedstrijd {
  id: string; club_id: string; naam: string; datum_van: string
  datum_tot: string | null; locatie: string | null; aantal_banen: number
  aanvangstijd: string | null; speelformaat: Speelformaat
  schema_type: SchemaType; max_deelnemers: number
  status: WedstrijdStatus; created_at: string
}

export interface Deelname {
  id: string; wedstrijd_id: string; speler_id: string
  uitnodiging_status: UitnodigingStatus; uitnodiging_token: string
  uitgenodigd_op: string | null; bevestigd_op: string | null
}

export interface Ronde {
  id: string; wedstrijd_id: string; ronde_nummer: number
  status: RondeStatus; gestart_op: string | null
  afgesloten_op: string | null; created_at: string
}

export interface Groep {
  id: string; ronde_id: string; baan_nummer: number; created_at: string
}

export interface GroepSpeler {
  id: string; groep_id: string; speler_id: string; is_invaller: boolean
}

export interface Set {
  id: string; groep_id: string; set_nummer: 1 | 2 | 3
  team1_speler1_id: string; team1_speler2_id: string
  team2_speler1_id: string; team2_speler2_id: string
  games_team1: number | null; games_team2: number | null
  ingevoerd_op: string | null; ingevoerd_door: string | null
}

export interface Punt {
  id: string; wedstrijd_id: string; ronde_id: string
  speler_id: string; set_id: string; games_gewonnen: number
  set_gewonnen: boolean; is_invaller: boolean
}

export interface Correctie {
  id: string; set_id: string; gecorrigeerd_door: string
  oud_games_team1: number | null; oud_games_team2: number | null
  nieuw_games_team1: number | null; nieuw_games_team2: number | null
  reden: string | null; gecorrigeerd_op: string
}

export interface Alert {
  id: string; wedstrijd_id: string; ronde_id: string; groep_id: string
  verstuurd_door: string | null; type: string; verstuurd_op: string
}

export interface GdprLog {
  id: string; speler_id: string | null; club_id: string
  actie: GdprActie; uitgevoerd_door: string | null
  notitie: string | null; created_at: string
}

// Samengestelde query types
export interface GroepMetSpelers extends Groep {
  spelers: (GroepSpeler & { speler: Speler })[]
}
export interface SetMetSpelers extends Set {
  team1_speler1: Speler; team1_speler2: Speler
  team2_speler1: Speler; team2_speler2: Speler
}
export interface RondeMetGroepen extends Ronde {
  groepen: (GroepMetSpelers & { sets: SetMetSpelers[] })[]
}
export interface PubliekeStandRij {
  wedstrijd_id: string; weergave_naam: string
  geslacht: Geslacht; totaal_games: number
  totaal_sets: number; rondes_gespeeld: number
}
