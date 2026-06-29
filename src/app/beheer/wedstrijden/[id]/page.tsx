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
    const ids = new Set((d ?? []).map((x: Deelname) =>
