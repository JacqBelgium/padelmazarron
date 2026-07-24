import React from 'react'

export default function PrivacyPage() {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>

      {/* Header */}
      <div style={{ background: '#0A1628', padding: '40px 24px', textAlign: 'center' }}>
        <a href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px', display: 'block', marginBottom: '12px' }}>
          ← RacketComp
        </a>
        <div style={{ color: '#E8C547', fontWeight: 700, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
          Legal
        </div>
        <h1 style={{ color: '#ffffff', fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>
          Privacy Policy
        </h1>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '48px 24px' }}>

        <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
          <h2 style={{ color: '#0A1628', fontWeight: 800, fontSize: '16px', marginBottom: '12px' }}>Data controller</h2>
          <p style={{ color: '#6B7280', fontSize: '15px', lineHeight: 1.6, margin: '0 0 8px 0' }}>
            The board of PadelMazarron is responsible for the processing of personal data as described in this privacy policy.
          </p>
          <p style={{ color: '#6B7280', fontSize: '15px', margin: 0 }}>
            Contact: <a href="mailto:beheerder@padelmazarron.vandersteen.be" style={{ color: '#1F5C99' }}>beheerder@padelmazarron.vandersteen.be</a>
          </p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
          <h2 style={{ color: '#0A1628', fontWeight: 800, fontSize: '16px', marginBottom: '12px' }}>What data do we store?</h2>
          <ul style={{ color: '#6B7280', fontSize: '15px', lineHeight: 2, paddingLeft: '20px', margin: 0 }}>
            <li>First and last name</li>
            <li>Email address</li>
            <li>WhatsApp number (optional)</li>
            <li>Gender (for competition grouping)</li>
            <li>Match results within the competition</li>
          </ul>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
          <h2 style={{ color: '#0A1628', fontWeight: 800, fontSize: '16px', marginBottom: '12px' }}>Why do we use your data?</h2>
          <ul style={{ color: '#6B7280', fontSize: '15px', lineHeight: 2, paddingLeft: '20px', margin: 0 }}>
            <li>Organisation of the padel competition</li>
            <li>Communication about matches and results</li>
            <li>Publication of standings (first name + first letter of last name only)</li>
          </ul>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
          <h2 style={{ color: '#0A1628', fontWeight: 800, fontSize: '16px', marginBottom: '12px' }}>Your rights</h2>
          <ul style={{ color: '#6B7280', fontSize: '15px', lineHeight: 2, paddingLeft: '20px', margin: '0 0 16px 0' }}>
            <li>Right to access your personal data</li>
            <li>Right to correction of incorrect data</li>
            <li>Right to deletion of your data</li>
            <li>Right to object to processing</li>
          </ul>
          <p style={{ color: '#6B7280', fontSize: '15px', margin: 0 }}>
            Contact: <a href="mailto:beheerder@padelmazarron.vandersteen.be" style={{ color: '#1F5C99' }}>beheerder@padelmazarron.vandersteen.be</a>
          </p>
        </div>

        <div style={{ background: '#FEF3F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '28px', marginBottom: '40px' }}>
          <h2 style={{ color: '#0A1628', fontWeight: 800, fontSize: '16px', marginBottom: '12px' }}>Unsubscribe</h2>
          <p style={{ color: '#6B7280', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
            Would you like to unsubscribe and have your data deleted?
          </p>
          
            <a href="mailto:beheerder@padelmazarron.vandersteen.be?subject=Unsubscribe RacketComp&body=Please delete my personal data from the RacketComp application."
            style={{
              display: 'inline-block', background: '#DC2626', color: '#ffffff',
              padding: '10px 24px', borderRadius: '8px',
              textDecoration: 'none', fontWeight: 700, fontSize: '14px',
            }}
          >
            Unsubscribe and delete data
          </a>
        </div>

        <div style={{ textAlign: 'center' }}>
          <a href="/" style={{ color: '#9CA3AF', textDecoration: 'none', fontSize: '13px' }}>← Back to RacketComp</a>
        </div>

      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF', fontSize: '13px' }}>
        <a href="/" style={{ color: '#9CA3AF', textDecoration: 'none' }}>RacketComp</a>
      </footer>

    </div>
  )
}