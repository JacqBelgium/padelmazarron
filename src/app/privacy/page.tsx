export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-6 text-center">
        <h1 className="text-2xl font-bold text-brand-500">PadelMazarron</h1>
        <p className="text-gray-500 mt-1">Privacyverklaring</p>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">

        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-lg">Verwerkingsverantwoordelijke</h2>
          <p className="text-gray-600 text-sm">
            Bestuur PadelMazarron is verantwoordelijk voor de verwerking van persoonsgegevens
            zoals beschreven in deze privacyverklaring.
          </p>
          <p className="text-gray-600 text-sm">
            Contact: <a href="mailto:beheerder@padelmazarron.vandersteen.be"
            className="text-brand-500 hover:underline">beheerder@padelmazarron.vandersteen.be</a>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-lg">Welke gegevens bewaren we?</h2>
          <ul className="text-gray-600 text-sm space-y-2">
            <li>• Voornaam en achternaam</li>
            <li>• E-mailadres</li>
            <li>• WhatsApp nummer (optioneel)</li>
            <li>• Geslacht (voor competitie-indeling)</li>
            <li>• Speelresultaten binnen de competitie</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-lg">Waarvoor gebruiken we uw gegevens?</h2>
          <ul className="text-gray-600 text-sm space-y-2">
            <li>• Organisatie van de padel competitie</li>
            <li>• Communicatie over wedstrijden en uitslagen</li>
            <li>• Publicatie van de puntenstand (voornaam + eerste letter achternaam)</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-lg">Uw rechten</h2>
          <ul className="text-gray-600 text-sm space-y-2">
            <li>• <strong>Recht op inzage:</strong> u kunt opvragen welke gegevens we van u bewaren</li>
            <li>• <strong>Recht op correctie:</strong> u kunt onjuiste gegevens laten aanpassen</li>
            <li>• <strong>Recht op verwijdering:</strong> u kunt vragen uw gegevens te verwijderen</li>
            <li>• <strong>Recht op bezwaar:</strong> u kunt bezwaar maken tegen de verwerking</li>
          </ul>
          <p className="text-gray-600 text-sm mt-2">
            Voor het uitoefenen van uw rechten kunt u contact opnemen via
            <a href="mailto:beheerder@padelmazarron.vandersteen.be"
            className="text-brand-500 hover:underline ml-1">
              beheerder@padelmazarron.vandersteen.be
            </a>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-lg">Afmelden</h2>
          <p className="text-gray-600 text-sm">
            Wilt u zich afmelden voor de competitie en uw gegevens laten verwijderen?
            Stuur een e-mail naar de beheerder.
          </p>
          
            href="mailto:beheerder@padelmazarron.vandersteen.be?subject=Afmelding PadelMazarron&body=Gelieve mijn gegevens te verwijderen uit de PadelMazarron competitie-app."
            className="inline-block bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100"
          >
            Afmelden en gegevens verwijderen
          </a>
        </div>

        <div className="text-center">
          <a href="/" className="text-sm text-gray-400 hover:text-gray-600">← Terug naar home</a>
        </div>

      </div>
    </main>
  )
}