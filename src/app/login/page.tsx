'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [fout, setFout] = useState('')
  const [laden, setLaden] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)
    setFout('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: wachtwoord,
    })

    if (error) {
      setFout('Ongeldig e-mailadres of wachtwoord')
      setLaden(false)
    } else {
      router.push('/beheer')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-brand-500 mb-2">PadelMazarron</h1>
        <p className="text-gray-500 text-sm mb-8">Beheerderslogin</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-mailadres
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="jouw@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wachtwoord
            </label>
            <input
              type="password"
              value={wachtwoord}
              onChange={e => setWachtwoord(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="••••••••"
              required
            />
          </div>

          {fout && (
            <p className="text-red-500 text-sm">{fout}</p>
          )}

          <button
            type="submit"
            disabled={laden}
            className="w-full bg-brand-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {laden ? 'Bezig...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </main>
  )
}
