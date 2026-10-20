'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDemo } from '@/lib/useDemo'
import { DEFAULT_TENANT } from '@/lib/useTenant'
import TenantNav from '@/components/TenantNav'
import { useTenantContext } from '@/lib/TenantContext'

const HEX_KLEUR = /^#[0-9A-Fa-f]{6}$/
const LOGO_MAX_BYTES = 500 * 1024
const LOGO_TYPE = 'image/png'

const labelStyle = { display: 'block', color: '#4B5563', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }

const fieldStyle = {
  width: '100%',
  padding: '12px 16px',
  background: '#F9FAFB',
  border: '1px solid #D1D5DB',
  borderRadius: '8px',
  color: '#111827',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

function KleurVeld({ id, label, waarde, onChange }: { id: string; label: string; waarde: string; onChange: (waarde: string) => void }) {
  const geldig = HEX_KLEUR.test(waarde)
  return (
    <div style={{ marginBottom: '20px' }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input
          type="color"
          aria-label={`${label} picker`}
          value={geldig ? waarde : '#000000'}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          style={{ width: '52px', height: '46px', padding: '2px', border: '1px solid #D1D5DB', borderRadius: '8px', background: '#fff', cursor: 'pointer', flexShrink: 0 }}
        />
        <input
          id={id}
          type="text"
          value={waarde}
          onChange={(event) => onChange(event.target.value.trim())}
          maxLength={7}
          placeholder="#000000"
          style={{ ...fieldStyle, fontFamily: 'monospace', borderColor: geldig ? '#D1D5DB' : '#FCA5A5' }}
        />
      </div>
      {!geldig && <p style={{ color: '#B91C1C', fontSize: '12px', margin: '6px 0 0' }}>Use a hex colour like #0A1628</p>}
    </div>
  )
}

export default function InstellingenPage() {
  const supabase = useMemo(() => createClient(), [])
  const { primaryColor, secondaryColor, updateTenant } = useTenantContext()
  const { isDemo } = useDemo()
  const router = useRouter()
  const [laden, setLaden] = useState(true)
  const [opslaan, setOpslaan] = useState(false)
  const [clubId, setClubId] = useState<string | null>(null)
  const [naam, setNaam] = useState('')
  const [primair, setPrimair] = useState(DEFAULT_TENANT.primaryColor)
  const [secundair, setSecundair] = useState(DEFAULT_TENANT.secondaryColor)
  const [logoUrl, setLogoUrl] = useState('')
  const [logoBestand, setLogoBestand] = useState<File | null>(null)
  const [logoVoorbeeld, setLogoVoorbeeld] = useState<string | null>(null)
  const [logoFout, setLogoFout] = useState('')
  const bestandInput = useRef<HTMLInputElement>(null)
  const [succes, setSucces] = useState('')
  const [fout, setFout] = useState('')

  useEffect(() => {
    async function laadInstellingen() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/login')
          return
        }

        const { data: gebruiker } = await supabase
          .from('gebruikers')
          .select('club_id')
          .eq('auth_id', user.id)
          .single()

        if (!gebruiker?.club_id) {
          setFout('No club is linked to your account.')
          return
        }
        setClubId(gebruiker.club_id)

        const [{ data: config, error: configError }, { data: club }] = await Promise.all([
          supabase
            .from('tenant_config')
            .select('primary_color, secondary_color, logo_url, naam')
            .eq('club_id', gebruiker.club_id)
            .maybeSingle(),
          supabase.from('clubs').select('naam').eq('id', gebruiker.club_id).single(),
        ])

        if (configError) throw configError

        setNaam(config?.naam || club?.naam || '')
        setPrimair(config?.primary_color || DEFAULT_TENANT.primaryColor)
        setSecundair(config?.secondary_color || DEFAULT_TENANT.secondaryColor)
        setLogoUrl(config?.logo_url || '')
      } catch (error) {
        console.error('Could not load tenant settings:', error)
        setFout('Could not load your current settings.')
      } finally {
        setLaden(false)
      }
    }

    void laadInstellingen()
  }, [router, supabase])

  useEffect(() => {
    return () => {
      if (logoVoorbeeld) URL.revokeObjectURL(logoVoorbeeld)
    }
  }, [logoVoorbeeld])

  function kiesLogo(event: ChangeEvent<HTMLInputElement>) {
    const bestand = event.target.files?.[0]
    event.target.value = ''
    setLogoFout('')
    if (!bestand) return

    if (bestand.type !== LOGO_TYPE || !bestand.name.toLowerCase().endsWith('.png')) {
      setLogoFout('Logo must be a PNG file.')
      return
    }
    if (bestand.size > LOGO_MAX_BYTES) {
      setLogoFout(`Logo is too large (${Math.ceil(bestand.size / 1024)}KB). Maximum is 500KB.`)
      return
    }

    setLogoBestand(bestand)
    setLogoVoorbeeld(URL.createObjectURL(bestand))
  }

  function verwijderLogo() {
    setLogoBestand(null)
    setLogoVoorbeeld(null)
    setLogoUrl('')
    setLogoFout('')
  }

  async function bewaar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFout('')
    setSucces('')

    if (isDemo) return
    if (!clubId) {
      setFout('No club is linked to your account.')
      return
    }
    if (!naam.trim()) {
      setFout('Club name is required.')
      return
    }
    if (!HEX_KLEUR.test(primair) || !HEX_KLEUR.test(secundair)) {
      setFout('Colours must be hex values like #0A1628.')
      return
    }

    setOpslaan(true)
    try {
      let nieuweLogoUrl = logoUrl || null
      if (logoBestand) {
        const pad = `${clubId}.png`
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(pad, logoBestand, { upsert: true, contentType: logoBestand.type, cacheControl: '3600' })
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(pad)
        // Same filename on every upload, so add a version to bypass cached copies of the old logo
        nieuweLogoUrl = `${publicUrl}?v=${Date.now()}`
      }

      const waarden = {
        naam: naam.trim(),
        primary_color: primair,
        secondary_color: secundair,
        logo_url: nieuweLogoUrl,
      }

      const { data: bestaand, error: zoekError } = await supabase
        .from('tenant_config')
        .select('club_id')
        .eq('club_id', clubId)
        .maybeSingle()
      if (zoekError) throw zoekError

      const { error } = bestaand
        ? await supabase.from('tenant_config').update(waarden).eq('club_id', clubId)
        : await supabase.from('tenant_config').insert({ club_id: clubId, ...waarden })
      if (error) throw error

      updateTenant({ naam: waarden.naam, primaryColor: primair, secondaryColor: secundair, logoUrl: waarden.logo_url })
      setLogoUrl(nieuweLogoUrl ?? '')
      setLogoBestand(null)
      setLogoVoorbeeld(null)
      setSucces('Settings saved.')
    } catch (error) {
      console.error('Could not save tenant settings:', error)
      const bericht = error && typeof error === 'object' && 'message' in error ? String(error.message) : ''
      setFout(bericht ? `Could not save settings: ${bericht}` : 'Could not save settings. Please try again.')
    } finally {
      setOpslaan(false)
    }
  }

  if (laden) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', background: primaryColor }}>
        <div style={{ color: secondaryColor }}>Loading...</div>
      </div>
    )
  }

  const kleurenGeldig = HEX_KLEUR.test(primair) && HEX_KLEUR.test(secundair)
  const preview = {
    naam: naam.trim() || DEFAULT_TENANT.naam,
    primaryColor: HEX_KLEUR.test(primair) ? primair : DEFAULT_TENANT.primaryColor,
    secondaryColor: HEX_KLEUR.test(secundair) ? secundair : DEFAULT_TENANT.secondaryColor,
    logoUrl: logoVoorbeeld || logoUrl || null,
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>
      <TenantNav back={{ href: '/beheer', label: 'Dashboard' }} />

      {isDemo && (
        <div style={{ background: '#FEF9C3', borderBottom: '1px solid #FDE68A', padding: '10px 32px', textAlign: 'center' }}>
          <span style={{ color: '#854D0E', fontSize: '13px', fontWeight: 600 }}>🔍 Demo mode — read only</span>
        </div>
      )}

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ background: primaryColor, borderRadius: '14px', padding: '32px', marginBottom: '24px' }}>
          <p style={{ color: secondaryColor, fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 8px' }}>SETTINGS</p>
          <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>Club branding</h1>
        </div>

        <section style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <p style={{ ...labelStyle, marginBottom: '12px' }}>Preview</p>
          <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #E5E7EB', pointerEvents: 'none' }}>
            <TenantNav back={{ href: '#', label: 'Dashboard' }} theme={preview} />
          </div>
        </section>

        <section style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '32px', maxWidth: '520px' }}>
          <form onSubmit={bewaar}>
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="club-naam" style={labelStyle}>Club name</label>
              <input
                id="club-naam"
                type="text"
                value={naam}
                onChange={(event) => setNaam(event.target.value)}
                required
                style={fieldStyle}
              />
            </div>

            <KleurVeld id="primary-color" label="Primary colour" waarde={primair} onChange={setPrimair} />
            <KleurVeld id="secondary-color" label="Secondary colour" waarde={secundair} onChange={setSecundair} />

            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="logo-upload" style={labelStyle}>Logo <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional, PNG, max 500KB)</span></label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: preview.primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  {preview.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview.logoUrl} alt="Logo preview" width={40} height={40} style={{ display: 'block', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>None</span>
                  )}
                </div>
                <input
                  ref={bestandInput}
                  id="logo-upload"
                  type="file"
                  accept=".png,image/png"
                  onChange={kiesLogo}
                  disabled={isDemo}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => bestandInput.current?.click()}
                  disabled={isDemo}
                  style={{ padding: '10px 16px', background: '#fff', color: '#111827', border: '1px solid #D1D5DB', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: isDemo ? 'not-allowed' : 'pointer' }}
                >
                  {preview.logoUrl ? 'Change logo' : 'Upload logo'}
                </button>
                {preview.logoUrl && (
                  <button
                    type="button"
                    onClick={verwijderLogo}
                    disabled={isDemo}
                    style={{ padding: '10px 12px', background: 'transparent', color: '#6B7280', border: 'none', fontSize: '14px', cursor: isDemo ? 'not-allowed' : 'pointer' }}
                  >
                    Remove
                  </button>
                )}
              </div>
              {logoBestand && <p style={{ color: '#6B7280', fontSize: '12px', margin: '6px 0 0' }}>{logoBestand.name} will be uploaded when you save.</p>}
              {logoFout && <p role="alert" style={{ color: '#B91C1C', fontSize: '12px', margin: '6px 0 0' }}>{logoFout}</p>}
            </div>

            {fout && (
              <div role="alert" style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#B91C1C', fontSize: '14px' }}>
                {fout}
              </div>
            )}

            {succes && (
              <div role="status" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#15803D', fontSize: '14px' }}>
                {succes}
              </div>
            )}

            <button
              type="submit"
              disabled={opslaan || isDemo || !kleurenGeldig}
              style={{ width: '100%', padding: '14px', background: secondaryColor, color: primaryColor, border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '15px', cursor: opslaan || isDemo || !kleurenGeldig ? 'not-allowed' : 'pointer', opacity: opslaan || isDemo || !kleurenGeldig ? 0.7 : 1 }}
            >
              {opslaan ? 'Saving...' : 'Save settings'}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
