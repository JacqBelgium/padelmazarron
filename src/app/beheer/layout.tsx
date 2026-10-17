import type { ReactNode } from 'react'
import BeheerMobileMenu from '@/components/beheer-mobile-menu'
import { TenantProvider } from '@/lib/TenantContext'
import './responsive.css'

export default function BeheerLayout({ children }: { children: ReactNode }) {
  return (
    <TenantProvider>
      {children}
      <BeheerMobileMenu />
    </TenantProvider>
  )
}
