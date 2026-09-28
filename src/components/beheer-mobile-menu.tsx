'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BeheerMobileMenu() {
  const [open, setOpen] = useState(false)
  const [activeCompetitionId, setActiveCompetitionId] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadActiveCompetition() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: gebruiker } = await supabase
          .from('gebruikers')
          .select('club_id')
          .eq('auth_id', user.id)
          .single()

        if (!gebruiker?.club_id) return

        const { data: wedstrijd } = await supabase
          .from('wedstrijden')
          .select('id')
          .eq('club_id', gebruiker.club_id)
          .eq('status', 'Actief')
          .limit(1)
          .maybeSingle()

        setActiveCompetitionId(wedstrijd?.id ?? null)
      } catch (error) {
        console.error('Could not load active competition for menu:', error)
        setActiveCompetitionId(null)
      }
    }

    void loadActiveCompetition()
  }, [supabase])

  const links = [
    { href: '/beheer', label: 'Dashboard' },
    { href: '/beheer/spelers', label: 'Players' },
    { href: '/beheer/wedstrijden', label: 'Competitions' },
    ...(activeCompetitionId
      ? [{ href: `/beheer/wedstrijden/${activeCompetitionId}/stand`, label: 'Standings' }]
      : []),
    { href: '/beheer/profiel', label: 'Change password' },
  ]

  return (
    <div className="beheer-mobile-menu">
      <button
        type="button"
        className="beheer-mobile-menu__toggle"
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        aria-controls="beheer-mobile-menu-links"
        onClick={() => setOpen((current) => !current)}
      >
        <span />
        <span />
        <span />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="beheer-mobile-menu__backdrop"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
          />
          <nav id="beheer-mobile-menu-links" className="beheer-mobile-menu__links" aria-label="Mobile navigation">
            {links.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </a>
            ))}
            {!activeCompetitionId && (
              <span className="beheer-mobile-menu__disabled-link" aria-disabled="true">
                No active competition
              </span>
            )}
          </nav>
        </>
      )}
    </div>
  )
}
