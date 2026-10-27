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

        if (configError) throw configError

        let naam: string | null = config?.naam?.trim() || null

        if (!naam) {
          const { data: club, error: clubError } = await supabase
            .from('clubs')
            .select('naam')
            .eq('id', gebruiker.club_id)
            .maybeSingle()

          if (clubError) {
            if (!config) throw clubError
            console.error('Could not load club name:', clubError.message)
          }
          naam = club?.naam || null
        }

        if (!config) {
          if (naam) setTenant({ ...DEFAULT_TENANT, naam })
          return
        }

        setTenant({
          primaryColor: config.primary_color || DEFAULT_TENANT.primaryColor,
          secondaryColor: config.secondary_color || DEFAULT_TENANT.secondaryColor,
          logoUrl: config.logo_url || null,
          naam: naam || DEFAULT_TENANT.naam,
        })
      } catch (error) {
        console.error('Could not load tenant config:', error instanceof Error ? error.message : (error as { message?: string })?.message ?? 'unknown error')
      } finally {
        setLaden(false)
      }
    }

    void laadTenant()
  }, [])

  return { ...tenant, laden, updateTenant: setTenant }
}
