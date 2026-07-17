'use client'

import React, { useEffect, useState } from 'react'

export default function LandingPage() {
  const [clubCount] = useState(1)

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
          <div style={{ color: '#E8C547', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}>
            RacketComp
          </div>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <a href="#how" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '14px' }}>How it works</a>
            <a href="#features" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '14px' }}>Features</a>
            <a href="/login" style={{
              background: '#E8C547', color: '#0A1628', padding: '8px 20px',
              borderRadius: '6px', textDecoration: 'none', fontSize: '14px', fontWeight: 700,
            }}>Admin login</a>
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
            color: '#ffffff', fontSize: 'clamp(36px, 6vw, 72px)',
            fontWeight: 900, lineHeight: 1.1, marginBottom: '24px',
            letterSpacing: '-2px', maxWidth: '800px',
          }}>
            Run your racket sport<br />
            <span style={{ color: '#E8C547' }}>competition.</span>
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
            <a href="#how" style={{
              background: '#E8C547', color: '#0A1628',
              padding: '16px 36px', borderRadius: '8px',
              textDecoration: 'none', fontWeight: 800, fontSize: '16px',
            }}>
              See how it works →
            </a>
            <a href="/login" style={{
              background: 'transparent', color: '#ffffff',
              padding: '16px 36px', borderRadius: '8px',
              textDecoration: 'none', fontWeight: 600, fontSize: '16px',
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              Admin login
            </a>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginTop: '24px' }}>
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