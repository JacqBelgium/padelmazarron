import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function BeheerPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-brand-500">PadelMazarron — Beheer</h1>
        <span className="text-sm text-gray-500">{user.email}</span>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/beheer/spelers" className="bg-white rounded-xl border border-gray-100 p-6 hover:border-brand-500 transition-colors">
            <div className="text-2xl mb-2">👥</div>
            <h3 className="font-semibold text-gray-800">Spelers</h3>
            <p className="text-sm text-gray-500 mt-1">Beheer de deelnemers</p>
          </a>

          <a href="/beheer/wedstrijden" className="bg-white rounded-xl border border-gray-100 p-6 hover:border-brand-500 transition-colors">
            <div className="text-2xl mb-2">🏆</div>
            <h3 className="font-semibold text-gray-800">Wedstrijden</h3>
            <p className="text-sm text-gray-500 mt-1">Schema en rondes</p>
          </a>

          <a href="/beheer/uitslagen" className="bg-white rounded-xl border border-gray-100 p-6 hover:border-brand-500 transition-colors">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold text-gray-800">Uitslagen</h3>
            <p className="text-sm text-gray-500 mt-1">Invoer en correcties</p>
          </a>
        </div>
      </div>
    </main>
  )
}
