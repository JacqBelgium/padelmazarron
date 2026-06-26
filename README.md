# PadelMazarron — Racket Sport Club Competitie App

**Stack:** Next.js 14 · Supabase · Resend · Vercel · GitHub

**Live:** [padelmazarron.vandersteen.be](https://padelmazarron.vandersteen.be)

## Lokaal starten

```bash
# 1. Dependencies installeren
npm install

# 2. Environment variables instellen
cp .env.local.example .env.local
# Vul in: Supabase URL, anon key, service role key, Resend API key

# 3. Supabase database aanmaken
# Ga naar supabase.com -> nieuw project -> SQL Editor
# Plak inhoud van: supabase/migrations/20240601000001_initial_schema.sql

# 4. Development server starten
npm run dev
```

## Project structuur

```
src/
  app/           # Next.js App Router pagina's
  components/    # React componenten
  lib/
    supabase/    # Supabase client (browser + server)
    schema-algoritme.ts   # American Tournament algoritme
    puntentelling.ts      # Puntentelling logica
  types/
    database.ts  # TypeScript types voor alle tabellen
supabase/
  migrations/    # SQL migraties
```

## Modules (bouwvolgorde)

- [ ] Module 1: Spelersdata CRUD + uitnodigingsflow (Resend)
- [ ] Module 2: Wedstrijdbeheer + schema generatie
- [ ] Module 3: Uitslag invoer + correctie + live stand
- [ ] Module 4: PDF export
- [ ] Module 5: Alert functie
- [ ] GDPR pagina + privacyverklaring
