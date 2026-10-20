'use client'

import React, { createContext, useContext } from 'react'
import { useTenant, DEFAULT_TENANT, type Tenant } from '@/lib/useTenant'

interface TenantContextValue extends Tenant {
  laden: boolean
  updateTenant: (tenant: Tenant) => void
}

const TenantContext = createContext<TenantContextValue>({ ...DEFAULT_TENANT, laden: false, updateTenant: () => {} })

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const tenant = useTenant()
  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>
}

export function useTenantContext() {
  return useContext(TenantContext)
}
