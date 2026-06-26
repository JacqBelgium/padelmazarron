-- ============================================================
-- PadelMazarron — Supabase SQL Migratie 001
-- Volledige database structuur v1
-- ============================================================

-- ──────────────────────────────────────────────
-- EXTENSIES
-- ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────
-- 1. CLUBS
-- ──────────────────────────────────────────────
create table clubs (
  id                          uuid primary key default uuid_generate_v4(),
  naam                        text not null,
  sport                       text not null default 'padel',
  subdomein                   text unique,
  logo_url                    text,
  taal                        text not null default 'nl',
  -- Abonnement (v1: altijd freemium, velden klaar voor v2)
  abonnement_type             text not null default 'freemium' check (abonnement_type in ('freemium','premium')),
  abonnement_status           text not null default 'actief' check (abonnement_status in ('actief','verlopen','gepauzeerd')),
  abonnement_start            date default current_date,
  abonnement_einde            date,
  betaald                     boolean default true,
  betaald_tot                 date,
  -- GDPR
  privacyverklaring_naam      text,
  privacyverklaring_email     text,
  created_at                  timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 2. GEBRUIKERS (beheerders & admins)
-- ──────────────────────────────────────────────
create table gebruikers (
  id                              uuid primary key default uuid_generate_v4(),
  club_id                         uuid references clubs(id) on delete cascade,
  auth_id                         uuid unique,           -- Supabase Auth UID
  email                           text not null unique,
  naam                            text not null,
  rol                             text not null default 'beheerder' check (rol in ('admin','beheerder')),
  is_verwerkingsverantwoordelijke boolean not null default false,
  speler_id                       uuid,                  -- FK naar spelers, ingevuld na aanmaken spelers tabel
  created_at                      timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 3. SPELERS
-- ──────────────────────────────────────────────
create table spelers (
  id                  uuid primary key default uuid_generate_v4(),
  club_id             uuid not null references clubs(id) on delete cascade,
  voornaam            text not null,
  achternaam          text not null,
  geslacht            text not null check (geslacht in ('M','V')),
  categorie           text not null default 'Alle' check (categorie in ('Alle','Junior','Senior','50+')),
  email               text not null,
  whatsapp            text,
  club_naam           text,                              -- Denormalized voor v2 multi-tenant query
  status              text not null default 'Actief' check (status in ('Actief','Afgemeld','Geblokkeerd','Verwijderd')),
  -- GDPR
  gdpr_toestemming    boolean not null default false,
  gdpr_datum          timestamptz,
  created_at          timestamptz not null default now(),
  unique(club_id, email)
);

-- FK van gebruikers naar spelers (nu spelers tabel bestaat)
alter table gebruikers
  add constraint fk_gebruikers_speler
  foreign key (speler_id) references spelers(id) on delete set null;

-- ──────────────────────────────────────────────
-- 4. WEDSTRIJDEN
-- ──────────────────────────────────────────────
create table wedstrijden (
  id                  uuid primary key default uuid_generate_v4(),
  club_id             uuid not null references clubs(id) on delete cascade,
  naam                text not null,
  datum_van           date not null,
  datum_tot           date,
  locatie             text,
  aantal_banen        int not null default 4,
  aanvangstijd        time,
  -- Speelparameters
  speelformaat        text not null default 'mixed_roulerend'
                        check (speelformaat in ('mixed_roulerend','dubbel_heren','dubbel_dames','mixed_vast','enkel_heren','enkel_dames')),
  schema_type         text not null default 'volledig'
                        check (schema_type in ('kort','volledig')),
  max_deelnemers      int not null default 16,           -- Altijd deelbaar door 4
  -- Status
  status              text not null default 'Concept'
                        check (status in ('Concept','Actief','Afgesloten')),
  created_at          timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 5. DEELNAMES (uitnodigingsflow)
-- ──────────────────────────────────────────────
create table deelnames (
  id                  uuid primary key default uuid_generate_v4(),
  wedstrijd_id        uuid not null references wedstrijden(id) on delete cascade,
  speler_id           uuid not null references spelers(id) on delete cascade,
  uitnodiging_status  text not null default 'uitgenodigd'
                        check (uitnodiging_status in ('uitgenodigd','bevestigd','afgemeld')),
  uitnodiging_token   text unique default encode(gen_random_bytes(32), 'hex'),
  uitgenodigd_op      timestamptz default now(),
  bevestigd_op        timestamptz,
  unique(wedstrijd_id, speler_id)
);

-- ──────────────────────────────────────────────
-- 6. RONDES
-- ──────────────────────────────────────────────
create table rondes (
  id                  uuid primary key default uuid_generate_v4(),
  wedstrijd_id        uuid not null references wedstrijden(id) on delete cascade,
  ronde_nummer        int not null,
  status              text not null default 'Open'
                        check (status in ('Open','Volledig','Afgesloten')),
  gestart_op          timestamptz,
  afgesloten_op       timestamptz,
  created_at          timestamptz not null default now(),
  unique(wedstrijd_id, ronde_nummer)
);

-- ──────────────────────────────────────────────
-- 7. GROEPEN
-- ──────────────────────────────────────────────
create table groepen (
  id                  uuid primary key default uuid_generate_v4(),
  ronde_id            uuid not null references rondes(id) on delete cascade,
  baan_nummer         int not null,
  created_at          timestamptz not null default now(),
  unique(ronde_id, baan_nummer)
);

-- ──────────────────────────────────────────────
-- 8. GROEP_SPELERS
-- ──────────────────────────────────────────────
create table groep_spelers (
  id                  uuid primary key default uuid_generate_v4(),
  groep_id            uuid not null references groepen(id) on delete cascade,
  speler_id           uuid not null references spelers(id) on delete cascade,
  is_invaller         boolean not null default false,
  unique(groep_id, speler_id)
);

-- ──────────────────────────────────────────────
-- 9. SETS
-- ──────────────────────────────────────────────
create table sets (
  id                  uuid primary key default uuid_generate_v4(),
  groep_id            uuid not null references groepen(id) on delete cascade,
  set_nummer          int not null check (set_nummer in (1,2,3)),
  -- Koppelindeling: set 1 = AB vs CD, set 2 = AC vs BD, set 3 = AD vs BC
  team1_speler1_id    uuid not null references spelers(id),
  team1_speler2_id    uuid not null references spelers(id),
  team2_speler1_id    uuid not null references spelers(id),
  team2_speler2_id    uuid not null references spelers(id),
  -- Uitslag
  games_team1         int check (games_team1 >= 0 and games_team1 <= 7),
  games_team2         int check (games_team2 >= 0 and games_team2 <= 7),
  -- Meta
  ingevoerd_op        timestamptz,
  ingevoerd_door      uuid references gebruikers(id),
  unique(groep_id, set_nummer)
);

-- ──────────────────────────────────────────────
-- 10. PUNTEN (afgeleide tabel — live stand)
-- ──────────────────────────────────────────────
create table punten (
  id                  uuid primary key default uuid_generate_v4(),
  wedstrijd_id        uuid not null references wedstrijden(id) on delete cascade,
  ronde_id            uuid not null references rondes(id) on delete cascade,
  speler_id           uuid not null references spelers(id) on delete cascade,
  set_id              uuid not null references sets(id) on delete cascade,
  games_gewonnen      int not null default 0,
  set_gewonnen        boolean not null default false,
  is_invaller         boolean not null default false,
  unique(set_id, speler_id)
);

-- ──────────────────────────────────────────────
-- 11. CORRECTIES (audit log)
-- ──────────────────────────────────────────────
create table correcties (
  id                  uuid primary key default uuid_generate_v4(),
  set_id              uuid not null references sets(id) on delete cascade,
  gecorrigeerd_door   uuid not null references gebruikers(id),
  oud_games_team1     int,
  oud_games_team2     int,
  nieuw_games_team1   int,
  nieuw_games_team2   int,
  reden               text,
  gecorrigeerd_op     timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 12. ALERTS
-- ──────────────────────────────────────────────
create table alerts (
  id                  uuid primary key default uuid_generate_v4(),
  wedstrijd_id        uuid not null references wedstrijden(id) on delete cascade,
  ronde_id            uuid not null references rondes(id) on delete cascade,
  groep_id            uuid not null references groepen(id) on delete cascade,
  verstuurd_door      uuid references gebruikers(id),
  type                text not null default 'herinnering_niet_gestart',
  verstuurd_op        timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 13. GDPR LOG
-- ──────────────────────────────────────────────
create table gdpr_log (
  id                  uuid primary key default uuid_generate_v4(),
  speler_id           uuid references spelers(id) on delete set null,
  club_id             uuid not null references clubs(id) on delete cascade,
  actie               text not null check (actie in ('toestemming_gegeven','afmelding','verwijdering_aangevraagd','verwijdering_uitgevoerd','inzage_aangevraagd')),
  uitgevoerd_door     uuid references gebruikers(id),
  notitie             text,
  created_at          timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- INDEXES (performance)
-- ──────────────────────────────────────────────
create index idx_spelers_club         on spelers(club_id);
create index idx_wedstrijden_club     on wedstrijden(club_id);
create index idx_deelnames_wedstrijd  on deelnames(wedstrijd_id);
create index idx_deelnames_speler     on deelnames(speler_id);
create index idx_rondes_wedstrijd     on rondes(wedstrijd_id);
create index idx_groepen_ronde        on groepen(ronde_id);
create index idx_groep_spelers_groep  on groep_spelers(groep_id);
create index idx_groep_spelers_speler on groep_spelers(speler_id);
create index idx_sets_groep           on sets(groep_id);
create index idx_punten_wedstrijd     on punten(wedstrijd_id);
create index idx_punten_speler        on punten(speler_id);
create index idx_punten_set           on punten(set_id);

-- ──────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Elke club ziet alleen zijn eigen data
-- ──────────────────────────────────────────────
alter table clubs          enable row level security;
alter table gebruikers     enable row level security;
alter table spelers        enable row level security;
alter table wedstrijden    enable row level security;
alter table deelnames      enable row level security;
alter table rondes         enable row level security;
alter table groepen        enable row level security;
alter table groep_spelers  enable row level security;
alter table sets           enable row level security;
alter table punten         enable row level security;
alter table correcties     enable row level security;
alter table alerts         enable row level security;
alter table gdpr_log       enable row level security;

-- Helper functie: geef club_id van ingelogde gebruiker
create or replace function auth_club_id()
returns uuid language sql stable as $$
  select club_id from gebruikers where auth_id = auth.uid()
$$;

-- Helper functie: is ingelogde gebruiker admin?
create or replace function is_admin()
returns boolean language sql stable as $$
  select exists (select 1 from gebruikers where auth_id = auth.uid() and rol = 'admin')
$$;

-- POLICIES: admin ziet alles, beheerder ziet alleen eigen club

-- clubs
create policy "club_eigen" on clubs
  using (is_admin() or id = auth_club_id());

-- gebruikers
create policy "gebruiker_eigen_club" on gebruikers
  using (is_admin() or club_id = auth_club_id());

-- spelers
create policy "spelers_eigen_club" on spelers
  using (is_admin() or club_id = auth_club_id());

-- wedstrijden
create policy "wedstrijden_eigen_club" on wedstrijden
  using (is_admin() or club_id = auth_club_id());

-- deelnames (via wedstrijd)
create policy "deelnames_eigen_club" on deelnames
  using (is_admin() or exists (
    select 1 from wedstrijden w
    where w.id = deelnames.wedstrijd_id and w.club_id = auth_club_id()
  ));

-- rondes (via wedstrijd)
create policy "rondes_eigen_club" on rondes
  using (is_admin() or exists (
    select 1 from wedstrijden w
    where w.id = rondes.wedstrijd_id and w.club_id = auth_club_id()
  ));

-- groepen (via ronde → wedstrijd)
create policy "groepen_eigen_club" on groepen
  using (is_admin() or exists (
    select 1 from rondes r
    join wedstrijden w on w.id = r.wedstrijd_id
    where r.id = groepen.ronde_id and w.club_id = auth_club_id()
  ));

-- groep_spelers (via groep → ronde → wedstrijd)
create policy "groep_spelers_eigen_club" on groep_spelers
  using (is_admin() or exists (
    select 1 from groepen g
    join rondes r on r.id = g.ronde_id
    join wedstrijden w on w.id = r.wedstrijd_id
    where g.id = groep_spelers.groep_id and w.club_id = auth_club_id()
  ));

-- sets
create policy "sets_eigen_club" on sets
  using (is_admin() or exists (
    select 1 from groepen g
    join rondes r on r.id = g.ronde_id
    join wedstrijden w on w.id = r.wedstrijd_id
    where g.id = sets.groep_id and w.club_id = auth_club_id()
  ));

-- punten
create policy "punten_eigen_club" on punten
  using (is_admin() or exists (
    select 1 from wedstrijden w
    where w.id = punten.wedstrijd_id and w.club_id = auth_club_id()
  ));

-- correcties
create policy "correcties_eigen_club" on correcties
  using (is_admin() or exists (
    select 1 from sets s
    join groepen g on g.id = s.groep_id
    join rondes r on r.id = g.ronde_id
    join wedstrijden w on w.id = r.wedstrijd_id
    where s.id = correcties.set_id and w.club_id = auth_club_id()
  ));

-- alerts
create policy "alerts_eigen_club" on alerts
  using (is_admin() or exists (
    select 1 from wedstrijden w
    where w.id = alerts.wedstrijd_id and w.club_id = auth_club_id()
  ));

-- gdpr_log
create policy "gdpr_eigen_club" on gdpr_log
  using (is_admin() or club_id = auth_club_id());

-- ──────────────────────────────────────────────
-- PUBLIEKE LEESTOEGANG (stand en schema)
-- Geen login nodig voor publieke pagina's
-- ──────────────────────────────────────────────

-- Publieke view: stand (voornaam + eerste letter achternaam)
create or replace view publieke_stand as
select
  p.wedstrijd_id,
  s.voornaam || ' ' || left(s.achternaam, 1) || '.' as weergave_naam,
  s.geslacht,
  sum(p.games_gewonnen)   as totaal_games,
  sum(case when p.set_gewonnen then 1 else 0 end) as totaal_sets,
  count(distinct p.ronde_id) as rondes_gespeeld
from punten p
join spelers s on s.id = p.speler_id
where p.is_invaller = false
group by p.wedstrijd_id, s.id, s.voornaam, s.achternaam, s.geslacht
order by totaal_games desc, totaal_sets desc;

-- Publieke view: schema (geen privédata)
create or replace view publiek_schema as
select
  g.id as groep_id,
  r.wedstrijd_id,
  r.ronde_nummer,
  g.baan_nummer,
  s.voornaam || ' ' || left(s.achternaam, 1) || '.' as weergave_naam,
  gs.is_invaller
from groepen g
join rondes r on r.id = g.ronde_id
join groep_spelers gs on gs.groep_id = g.id
join spelers s on s.id = gs.speler_id
order by r.ronde_nummer, g.baan_nummer;

-- ──────────────────────────────────────────────
-- SEED: PadelMazarron club aanmaken
-- ──────────────────────────────────────────────
insert into clubs (naam, sport, subdomein, taal, privacyverklaring_naam, privacyverklaring_email)
values (
  'PadelMazarron',
  'padel',
  'padelmazarron.vandersteen.be',
  'nl',
  'Bestuur PadelMazarron',
  'beheerder@padelmazarron.vandersteen.be'
);

