import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useIsDemo() {
  const [isDemo, setIsDemo] = useState(false)
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLaden(false); return }
      const { data } = await supabase
        .from('gebruikers')
        .select('is_demo')
        .eq('auth_id', user.id)
        .single()
      setIsDemo(data?.is_demo ?? false)
      setLaden(false)
    })
  }, [])

  return { isDemo, laden }
}