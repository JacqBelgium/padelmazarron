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
    console.log('Inloggen met:', email)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: wachtwoord,
    })

    console.log('Resultaat:', data, error)

    if (error) {
      setFout(`Fout: ${error.message}`)
      setLaden(false)
    } else {
      router.push('/beheer')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-lg">
        <h1 className="text-3xl font-bold text-brand-500 mb-2">PadelMazarron</h1>
        <p className="text-gray-500 mb-10">Beheerderslogin</p>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              E-mailadres
            </label>
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-brand-500"
              placeholder="jouw@email.com"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Wachtwoord (tijdelijk zichtbaar)
            </label>
            <input
              type="text"
              value={wachtwoord}
              onChange={e => setWachtwoord(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-brand-500"
              placeholder="jouw wachtwoord"
              autoComplete="off"
            />
            <p className="text-sm text-gray-400 mt-1">Ingevuld: {wachtwoord}</p>
          </div>

          {fout && (
            <p className="text-red-500 text-base font-medium">{fout}</p>
          )}

          <button
            type="submit"
            disabled={laden}
            className="w-full bg-brand-500 text-white rounded-lg py-3 text-base font-medium hover:bg-brand-600 disabled:opacity-50"
          >
            {laden ? 'Bezig...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </main>
  )
}
