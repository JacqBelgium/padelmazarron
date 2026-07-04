import React from 'react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-6 text-center">
        <h1 className="text-2xl font-bold text-blue-700">PadelMazarron</h1>
        <p className="text-gray-500 mt-1">Privacyverklaring</p>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">

        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
          <h2 className="font-semibold text-gray-800 text-lg">Verwerkingsverantwoordelijke</h2>
          <p className="text-gray-600 text-sm">Bestuur PadelMazarron is verantwoordelijk voor de verwerking van persoonsgegevens.</p>
          <p className="text-gray-600 text-sm">Contact: <a href="mailto:beheerder@padelmazarron.vandersteen.be" className="text-blue-600 hover:underline">beheerder@padelmazarron.vandersteen.be</a></p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
          <h2 className="font-semibold text-gray-800 text-lg">Welke gegevens bewaren we?</h2>
          <ul className="text-gray-600 text-sm space-y-1">
            <li>• Voornaam en achternaam</li>
            <li>• E-mailadres</li>
            <li>• WhatsApp nummer (optioneel)</li>
            <li>• Geslacht (voor competitie-indeling)</li>
            <li>• Speelresultaten binnen de competitie</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
          <h2 className="font-semibold text-gray-800 text-lg">Waarvoor gebruiken we uw gegevens?</h2>
          <ul className="text-gray-600 text-sm space-y-1">
            <li>• Organisatie van de padel competitie</li>
            <li>• Communicatie over wedstrijden en uitslagen</li>
            <li>• Publicatie van de puntenstand (voornaam + eerste letter achternaam)</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
          <h2 className="font-semibold text-gray-800 text-lg">Uw rechten</h2>
          <ul className="text-gray-600 text-sm space-y-1">
            <li>• Recht op inzage van uw gegevens</li>
            <li>• Recht op correctie van onjuiste gegevens</li>
            <li>• Recht op verwijdering van uw gegevens</li>
            <li>• Recht op bezwaar tegen de verwerking</li>
          </ul>
          <p className="text-gray-600 text-sm">Contact: <a href="mailto:beheerder@padelmazarron.vandersteen.be" className="text-blue-600 hover:underline">beheerder@padelmazarron.vandersteen.be</a></p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
          <h2 className="font-semibold text-gray-800 text-lg">Afmelden</h2>
          <p className="text-gray-600 text-sm">Wilt u zich afmelden en uw gegevens laten verwijderen?</p>
          <a href="mailto:beheerder@padelmazarron.vandersteen.be?subject=Afmelding PadelMazarron&body=Gelieve mijn gegevens te verwijderen."
            className="inline-block bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100">
            Afmelden en gegevens verwijderen
          </a>
        </div>

        <div className="text-center">
          <a href="/" className="text-sm text-gray-400 hover:text-gray-600">Terug naar home</a>
        </div>

      </div>
    </div>
  )
}