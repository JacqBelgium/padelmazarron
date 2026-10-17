import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Tenant {
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  naam: string
}

export const DEFAULT_TENANT: Tenant = {
  primaryColor: '#0A1628',
  secondaryColor: '#E8C547',
  logoUrl: null,
  naam: 'RacketComp',
}

export function useTenant() {
  const [tenant, setTenant] = useState<Tenant>(DEFAULT_TENANT)
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function laadTenant() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: gebruiker } = await supabase
          .from('gebruikers')
          .select('club_id')
          .eq('auth_id', user.id)
          .single()

        if (!gebruiker?.club_id) return

        const { data: config, error: configError } = await supabase
          .from('tenant_config')
          .select('primary_color, secondary_color, logo_url, naam')
          .eq('club_id', gebruiker.club_id)
          .maybeSingle()

        console.log('[useTenant] tenant_config raw data:', config, 'error:', configError, 'club_id:', gebruiker.club_id)

        if (!config) {
          console.log('[useTenant] no tenant_config found, final primaryColor:', DEFAULT_TENANT.primaryColor)
          return
        }

        const primaryColor = config.primary_color || DEFAULT_TENANT.primaryColor
        console.log('[useTenant] final primaryColor:', primaryColor)

        setTenant({
          primaryColor,
          secondaryColor: config.secondary_color || DEFAULT_TENANT.secondaryColor,
          logoUrl: config.logo_url || null,
          naam: config.naam || DEFAULT_TENANT.naam,
        })
      } catch (error) {
        console.error('Could not load tenant config:', error)
      } finally {
        setLaden(false)
      }
    }

    void laadTenant()
  }, [])

  return { ...tenant, laden }
}
