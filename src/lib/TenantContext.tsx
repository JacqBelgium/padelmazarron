'use client'

import React, { createContext, useContext } from 'react'
import { useTenant, DEFAULT_TENANT, type Tenant } from '@/lib/useTenant'

const TenantContext = createContext<Tenant & { laden: boolean }>({ ...DEFAULT_TENANT, laden: false })

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const tenant = useTenant()
  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>
}

export function useTenantContext() {
  return useContext(TenantContext)
}
