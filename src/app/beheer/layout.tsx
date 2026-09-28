import type { ReactNode } from 'react'
import BeheerMobileMenu from '@/components/beheer-mobile-menu'
import './responsive.css'

export default function BeheerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <BeheerMobileMenu />
    </>
  )
}
