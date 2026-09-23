'use client'

import React from 'react'

function ClubZoeker() {
  const [zoekterm, setZoekterm] = React.useState('')
  const [resultaten, setResultaten] = React.useState<any[]>([])
  const [laden, setLaden] = React.useState(false)
  const [gezoekt, setGezoekt] = React.useState(false)

  async function zoek() {
    if (!zoekterm.trim()) return
    setLaden(true)
    setGezoekt(true)
    const { createClient } = await import('@supabase/supabase-js')
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await client
      .from('clubs')
      .select('id, naam, sport')
      .ilike('naam', `%${zoekterm}%`)
    setResultaten(data ?? [])
    setLaden(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', maxWidth: '480px', margin: '0 auto 24px' }}>
        <input
          type="text"
          value={zoekterm}
          onChange={e => setZoekterm(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && zoek()}
          placeholder="Enter club name..."
          style={{
            flex: 1, padding: '14px 20px', borderRadius: '8px',
            border: '2px solid #E5E7EB', fontSize: '16px',
            outline: 'none',
          }}
        />
        <button
          onClick={zoek}
          disabled={laden}
          style={{
            background: '#1F5C99', color: '#fff', padding: '14px 24px',
            borderRadius: '8px', border: 'none', fontWeight: 700,
            fontSize: '15px', cursor: 'pointer',
          }}
        >
          {laden ? '...' : 'Search'}
        </button>
      </div>

      {gezoekt && resultaten.length === 0 && (
        <p style={{ color: '#9CA3AF', fontSize: '15px' }}>No club found. Contact us to register your club.</p>
      )}

      {resultaten.map(club => (
        <a key={club.id} href={`/club/${club.id}`} style={{
          display: 'block', background: '#F5F7FA', border: '1px solid #E5E7EB',
          borderRadius: '10px', padding: '16px 24px', marginBottom: '12px',
          textDecoration: 'none', textAlign: 'left',
        }}>
          <div style={{ fontWeight: 700, color: '#0A1628', fontSize: '16px' }}>{club.naam}</div>
          <div style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>{club.sport}</div>
        </a>
      ))}
    </div>
  )
}

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", margin: 0, padding: 0 }}>

      {/* HERO */}
      <section style={{
        background: '#0A1628',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Court lines decoration */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: `
            linear-gradient(to right, #fff 1px, transparent 1px),
            linear-gradient(to bottom, #fff 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }} />

        {/* Nav */}
        <nav style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '24px 48px', position: 'relative', zIndex: 10,
        }}>
          <a href="https://racketcomp.eu" aria-label="RacketComp home" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#fff', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}>
            <svg width="40" height="40" viewBox="0 0 503 496" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display: 'block' }}>
              <path d="M120.22 64.5C128.86 64.13 137.52 64.63 146.16 64.66C163.33 64.72 180.52 64.64 197.69 64.67C243.42 64.73 289.2 65.03 334.95 64.71C353.19 64.59 371.42 64.65 389.65 64.54C405.54 64.45 416.32 62.63 430.74 70.67C444.75 78.49 446.89 95.43 447.02 109.67C447.14 123.51 447.12 137.34 447.15 151.17C447.27 194.49 447.14 237.82 447.01 281.14C446.93 305.91 447.49 330.71 447 355.47C446.79 366.25 447.07 377.07 447.01 387.85C446.91 406.25 446.85 418.61 430.89 430.65C422.45 437.02 411.5 436.76 401.53 436.79C386.95 436.85 372.34 436.54 357.75 436.78C292.41 437.89 227 436.32 161.66 436.77C148.44 436.86 135.22 436.73 121.99 436.73C107.2 436.73 92.9 435.98 82.86 423.55C71.32 409.27 74.03 390.07 74.26 372.8C74.71 339.71 74.63 306.48 74.2 273.39C73.63 229.34 73.79 185.19 74.18 141.14C74.27 130.65 74.14 120.16 74.19 109.67C74.21 105.88 73.57 101.53 74.14 97.82C75.05 91.96 77.44 85.75 80.33 80.56C81.72 78.05 84.65 75.7 86.79 73.82C97.56 64.36 106.69 65.08 120.22 64.5ZM303.94 256.46C304.86 254.69 307.44 254.48 309.32 253.86C313.53 252.49 318.18 251.1 322.01 248.79C338.74 238.67 351.31 225.27 353.85 204.99C354.75 197.81 354.06 190.85 352.16 183.95C340.42 141.4 290.26 138.82 253.78 138.81C246.79 138.81 239.8 138.83 232.8 138.81C222.77 138.79 212.74 138.85 202.7 138.82C191.31 138.77 179.9 138.99 168.5 138.85C162.43 138.77 154.47 137.49 148.65 139.19C148.65 141.05 148.65 142.92 148.65 144.79C152.28 146.91 156.41 147.89 160.04 150.3C164.63 153.34 168.7 159.11 170.74 164.2C171.36 165.74 171.43 167.74 172.18 169.17C172.48 169.76 173.23 169.97 173.48 170.59C174.59 173.3 173.59 181.22 173.59 184.46C173.59 195.87 173.36 207.26 173.45 218.67C173.52 227.65 172.96 236.58 172.96 245.57C172.96 264.44 173.44 283.24 173.44 302.12C173.44 314.78 175.59 330.4 168.73 341.76C164.99 347.94 160.26 352.3 153.45 354.81C151.75 355.44 150.09 355.48 148.48 356.39C148.48 358.21 148.48 360.03 148.48 361.86C150.44 363.17 153.41 362.62 155.73 362.66C161.81 362.77 167.9 362.56 173.98 362.61C190.39 362.72 206.81 362.59 223.23 362.6C231.07 362.6 240.22 363.97 247.88 362.32C247.88 360.19 247.88 358.06 247.88 355.93C243.86 354.35 239.54 353.33 235.92 350.75C233.14 348.78 231.46 346.09 229.75 343.26C220.92 328.66 223.02 311.78 223 295.28C222.99 287.04 221.73 271.63 223.23 264.23C225.76 263.14 229.15 263.67 231.89 263.67C237.42 263.67 250.05 262.48 254.69 264.18C260.76 276.31 267 288.52 272.58 300.87C274.32 304.72 277.04 308.15 278.84 311.93C285.25 325.41 289.7 334.75 301 344.97C303.18 346.95 305.71 349.47 308.32 350.86C309.59 351.55 311.08 351.73 312.4 352.28C317.65 354.5 322.61 357.25 328.19 358.79C333.8 360.33 339.99 360.62 345.75 361.39C354.09 362.5 364.42 364.02 372.7 362.21C372.7 360.07 372.7 357.93 372.7 355.79C367.32 353.58 361.94 351.65 357.38 347.89C356.26 346.96 355.74 345.61 354.75 344.59C349.28 339.01 343.86 332.4 340.27 325.3C339.32 323.43 338.95 321.34 337.89 319.48C332.05 309.28 326.65 298.86 321.67 288.26C319.65 283.96 316.54 280.12 314.5 275.83C313.5 273.71 313.07 271.45 311.76 269.43C308.99 265.19 305.85 261.22 303.94 256.46ZM223.46 238.73C221.84 235.15 223.01 225.27 223 220.95C222.97 204.9 220.48 186.83 231.16 173.47C242.69 159.02 274.13 160.94 286.59 173.31C303.95 190.54 301.24 221.3 279.71 233.89C269.15 240.06 251.52 239.06 239.64 238.98C234.52 238.95 228.42 239.92 223.46 238.73Z" fill="#dfb63c" fillRule="evenodd" stroke="#dfb63c" strokeWidth="0.25" strokeLinejoin="round"/>
              <path d="M303.94 256.46C305.85 261.22 308.99 265.19 311.76 269.43C313.07 271.45 313.5 273.71 314.5 275.83C316.54 280.12 319.65 283.96 321.67 288.26C326.65 298.86 332.05 309.28 337.89 319.48C338.95 321.34 339.32 323.43 340.27 325.3C343.86 332.4 349.28 339.01 354.75 344.59C355.74 345.61 356.26 346.96 357.38 347.89C361.94 351.65 367.32 353.58 372.7 355.79C372.7 357.93 372.7 360.07 372.7 362.21C364.42 364.02 354.09 362.5 345.75 361.39C339.99 360.62 333.8 360.33 328.19 358.79C322.61 357.25 317.65 354.5 312.4 352.28C311.08 351.73 309.59 351.55 308.32 350.86C305.71 349.47 303.18 346.95 301 344.97C289.7 334.75 285.25 325.41 278.84 311.93C277.04 308.15 274.32 304.72 272.58 300.87C267 288.52 260.76 276.31 254.69 264.18C250.05 262.48 237.42 263.67 231.89 263.67C229.15 263.67 225.76 263.14 223.23 264.23C221.73 271.63 222.99 287.04 223 295.28C223.02 311.78 220.92 328.66 229.75 343.26C231.46 346.09 233.14 348.78 235.92 350.75C239.54 353.33 243.86 354.35 247.88 355.93C247.88 358.06 247.88 360.19 247.88 362.32C240.22 363.97 231.07 362.6 223.23 362.6C206.81 362.59 190.39 362.72 173.98 362.61C167.9 362.56 161.81 362.77 155.73 362.66C153.41 362.62 150.44 363.17 148.48 361.86C148.48 360.03 148.48 358.21 148.48 356.39C150.09 355.48 151.75 355.44 153.45 354.81C160.26 352.3 164.99 347.94 168.73 341.76C175.59 330.4 173.44 314.78 173.44 302.12C173.44 283.24 172.96 264.44 172.96 245.57C172.96 236.58 173.52 227.65 173.45 218.67C173.36 207.26 173.59 195.87 173.59 184.46C173.59 181.22 174.59 173.3 173.48 170.59C173.23 169.97 172.48 169.76 172.18 169.17C171.43 167.74 171.36 165.74 170.74 164.2C168.7 159.11 164.63 153.34 160.04 150.3C156.41 147.89 152.28 146.91 148.65 144.79C148.65 142.92 148.65 141.05 148.65 139.19C154.47 137.49 162.43 138.77 168.5 138.85C179.9 138.99 191.31 138.77 202.7 138.82C212.74 138.85 222.77 138.79 232.8 138.81C239.8 138.83 246.79 138.81 253.78 138.81C290.26 138.82 340.42 141.4 352.16 183.95C354.06 190.85 354.75 197.81 353.85 204.99C351.31 225.27 338.74 238.67 322.01 248.79C318.18 251.1 313.53 252.49 309.32 253.86C307.44 254.48 304.86 254.69 303.94 256.46ZM223.46 238.73C228.42 239.92 234.52 238.95 239.64 238.98C251.52 239.06 269.15 240.06 279.71 233.89C301.24 221.3 303.95 190.54 286.59 173.31C274.13 160.94 242.69 159.02 231.16 173.47C220.48 186.83 222.97 204.9 223 220.95C223.01 225.27 221.84 235.15 223.46 238.73Z" fill="#010001" fillRule="evenodd" stroke="#010001" strokeWidth="0.25" strokeLinejoin="round"/>
            </svg>
            <span style={{ color: '#fff', fontWeight: 900 }}>RacketComp</span>
          </a>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <a href="#how" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '14px' }}>How it works</a>
            <a href="#features" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '14px' }}>Features</a>
            <a href="/login" style={{
              background: '#E8C547', color: '#0A1628', padding: '8px 20px',
              borderRadius: '6px', textDecoration: 'none', fontSize: '14px', fontWeight: 700,
            }}>Club Admin</a>
          </div>
        </nav>

        {/* Hero content */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          textAlign: 'center', padding: '48px',
          position: 'relative', zIndex: 10,
        }}>
          <div style={{
            display: 'inline-block', background: 'rgba(232,197,71,0.15)',
            border: '1px solid rgba(232,197,71,0.3)',
            color: '#E8C547', padding: '6px 16px', borderRadius: '20px',
            fontSize: '12px', fontWeight: 600, letterSpacing: '1px',
            textTransform: 'uppercase', marginBottom: '32px',
          }}>
            Padel · Tennis · Badminton · Squash · Pickleball
          </div>

          <h1 style={{
            color: '#fff', fontFamily: 'Inter, sans-serif',
            fontSize: 'clamp(42px, 6vw, 76px)', fontWeight: 'normal',
            lineHeight: 0.98, marginBottom: '24px',
            letterSpacing: '-0.065em', maxWidth: '800px',
          }}>
            Run your racket sport<br />
            <span style={{ color: '#fff' }}>competition.</span>
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.65)', fontSize: 'clamp(16px, 2vw, 20px)',
            maxWidth: '560px', lineHeight: 1.6, marginBottom: '48px',
          }}>
            The American Tournament platform for racket sport clubs.
            Automated schedules, live standings, and score management —
            all in one place.
          </p>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href="/login?demo=true" style={{
              background: '#E8C547', color: '#0A1628',
              padding: '16px 36px', borderRadius: '8px',
              textDecoration: 'none', fontWeight: 800, fontSize: '16px',
            }}>
              🔍 Try demo
            </a>
            <a href="#find" style={{
              background: 'transparent', color: '#ffffff',
              padding: '16px 36px', borderRadius: '8px',
              textDecoration: 'none', fontWeight: 600, fontSize: '16px',
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              My Competition
            </a>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginTop: '24px' }}>
            Free for clubs · No credit card required
          </p>
        </div>

        {/* Bottom fade */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '120px',
          background: 'linear-gradient(to bottom, transparent, #F5F7FA)',
        }} />
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ background: '#F5F7FA', padding: '96px 48px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <p style={{ color: '#1F5C99', fontWeight: 700, fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>How it works</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, color: '#0A1628', marginBottom: '64px', letterSpacing: '-1px', maxWidth: '600px' }}>
            From zero to full competition in minutes.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px' }}>
            {[
              { step: '01', title: 'Add your players', desc: 'Register participants with name, gender, and contact details.' },
              { step: '02', title: 'Create a competition', desc: 'Set the format: American Tournament, short (5 rounds) or full (15 rounds).' },
              { step: '03', title: 'Generate the schedule', desc: 'The algorithm automatically assigns players to courts and rounds.' },
              { step: '04', title: 'Enter results & follow standings', desc: 'Enter scores after each match. The live leaderboard updates instantly.' },
            ].map(item => (
              <div key={item.step}>
                <div style={{ color: '#E8C547', fontWeight: 900, fontSize: '32px', marginBottom: '16px', lineHeight: 1 }}>{item.step}</div>
                <h3 style={{ color: '#0A1628', fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ color: '#6B7280', fontSize: '15px', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR WHO */}
      <section style={{ background: '#ffffff', padding: '96px 48px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <p style={{ color: '#1F5C99', fontWeight: 700, fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>For who</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, color: '#0A1628', marginBottom: '64px', letterSpacing: '-1px' }}>
            Built for clubs of all sizes.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '32px' }}>
            {[
              { icon: '🏟️', title: 'Club administrators', desc: 'Manage players, generate schedules, enter scores and send reminders — all from one dashboard.' },
              { icon: '🎾', title: 'Players', desc: 'Follow the live standings and check your schedule online. No login required.' },
              { icon: '🏆', title: 'Tournament organizers', desc: 'Run American Tournaments for padel, tennis, badminton, squash or pickleball with any number of participants.' },
            ].map(item => (
              <div key={item.title} style={{
                border: '1px solid #E5E7EB', borderRadius: '12px', padding: '32px',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>{item.icon}</div>
                <h3 style={{ color: '#0A1628', fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ color: '#6B7280', fontSize: '15px', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ background: '#F5F7FA', padding: '96px 48px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <p style={{ color: '#1F5C99', fontWeight: 700, fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>Features</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, color: '#0A1628', marginBottom: '64px', letterSpacing: '-1px' }}>
            Everything your competition needs.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px' }}>
            {[
              { icon: '⚡', title: 'Auto schedule', desc: 'Mathematically proven American Tournament algorithm.' },
              { icon: '📊', title: 'Live standings', desc: 'Real-time leaderboard separated by gender.' },
              { icon: '📧', title: 'Reminders', desc: 'Automatic email alerts for groups that haven\'t played yet.' },
              { icon: '📄', title: 'PDF export', desc: 'Download schedule and standings as a PDF to print.' },
              { icon: '🌐', title: 'Public pages', desc: 'Share schedule and standings without login.' },
              { icon: '🔒', title: 'GDPR compliant', desc: 'Privacy-first design with consent management.' },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '24px', flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <h3 style={{ color: '#0A1628', fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{item.title}</h3>
                  <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FIND YOUR CLUB */}
      <section id="find" style={{ background: '#ffffff', padding: '96px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p style={{ color: '#1F5C99', fontWeight: 700, fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>Find your club</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: '#0A1628', marginBottom: '40px', letterSpacing: '-1px' }}>
            Already a member?<br />Find your club competition.
          </h2>
          <ClubZoeker />
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#0A1628', padding: '96px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ color: '#ffffff', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, marginBottom: '24px', letterSpacing: '-1px' }}>
            Ready to run your<br />
            <span style={{ color: '#E8C547' }}>next competition?</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '18px', marginBottom: '40px', lineHeight: 1.6 }}>
            Contact us to set up your club. Free for the first season.
          </p>
          <a href="mailto:info@vandersteen.be" style={{
            background: '#E8C547', color: '#0A1628',
            padding: '16px 40px', borderRadius: '8px',
            textDecoration: 'none', fontWeight: 800, fontSize: '16px',
            display: 'inline-block',
          }}>
            Get started →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#060E1A', padding: '32px 48px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ color: '#E8C547', fontWeight: 800, fontSize: '16px' }}>RacketComp</div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <a href="/privacy" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px' }}>Privacy</a>
            <a href="/login" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px' }}>Admin login</a>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>© 2026 RacketComp</div>
        </div>
      </footer>

    </div>
  )
}