'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import type { Wedstrijd, Speler, Deelname } from '@/types/database'

export default function WedstrijdBeheerPage() {
  const [wedstrijd, setWedstrijd] = useState<Wedstrijd | null>(null)
  const [alleSpelers, setAlleSpelers] = useState<Speler[]>([])
  const [deelnames, setDeelnames] = useState<Deelname[]>([])
  const [geselecteerd, setGeselecteerd] = useState<Set<string>>(new Set())
  const [laden, setLaden] = useState(true)
  const [opslaan, setOpslaan] = useState(false)
  const [bericht, setBericht] = useState('')
  const [fout, setFout] = useState('')
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { laadData() }, [])

  async function laadData() {
    const [{ data: w }, { data: s }, { data: d }] = await Promise.all([
      supabase.from('wedstrijden').select('*').eq('id', params.id).single(),
      supabase.from('spelers').select('*').eq('status', 'Actief').order('achternaam'),
      supabase.from('deelnames').select('*').eq('wedstrijd_id', params.id),
    ])
    setWedstrijd(w)
    setAlleSpelers(s ?? [])
    setDeelnames(d ?? [])
    // Zet bestaande deelnemers als geselecteerd
    const ids = new Set((d ?? []).map((x: Deelname) => x.speler_id))
    setGeselecteerd(ids)
    setLaden(false)
  }

  function toggleSpeler(id: string) {
    if (wedstrijd?.status !== 'Concept') return
    setGeselecteerd(prev => {
      const nieuw = new Set(prev)
      if (nieuw.has(id)) nieuw.delete(id)
      else nieuw.add(id)
      return nieuw
    })
    setFout('')
    setBericht('')
  }

  async function handleKlaar() {
    const aantal = geselecteerd.size
    if (aantal === 0) { setFout('Selecteer minstens 4 spelers.'); return }
    if (aantal % 4 !== 0) { setFout(`${aantal} spelers geselecteerd — moet deelbaar zijn door 4 (bv. 4, 8, 12, 16).`); return }

    setOpslaan(true)
    setFout('')

    // Verwijder bestaande deelnames
    await supabase.from('deelnames').delete().eq('wedstrijd_id', params.id)

    // Voeg nieuwe deelnames toe
    const nieuweDeelnames = [...geselecteerd].map(speler_id => ({
      wedstrijd_id: params.id as string,
      speler_id,
      uitnodiging_status: 'bevestigd' as const,
    }))

    const { error } = await supabase.from('deelnames').insert(nieuweDeelnames)

    if (error) {
      setFout(`Fout: ${error.message}`)
    } else {
      setBericht(`✓ ${aantal} deelnemers opgeslagen!`)
      laadData()
    }
