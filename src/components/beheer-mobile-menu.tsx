'use client'

import { useState } from 'react'

const links = [
  { href: '/beheer', label: 'Dashboard' },
  { href: '/beheer/spelers', label: 'Players' },
  { href: '/beheer/wedstrijden', label: 'Competitions' },
  { href: '/beheer/profiel', label: 'Change password' },
]

export default function BeheerMobileMenu() {
  const [open, setOpen] = useState(false)

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
          </nav>
        </>
      )}
    </div>
  )
}
