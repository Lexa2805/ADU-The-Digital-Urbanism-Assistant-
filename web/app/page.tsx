import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-purple-700 mb-4">
              ADU - Asistent Digital de Urbanism
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Platforma digitală care simplifică procedurile de urbanism pentru cetățeni
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/chat"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-purple-700 transition-all hover:shadow-xl"
            >
              <span>💬</span>
              <span>Începe o conversație</span>
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white border-2 border-purple-600 px-8 py-4 text-lg font-semibold text-purple-600 shadow-lg hover:bg-purple-50 transition-all"
            >
              <span>📤</span>
              <span>Încarcă documente</span>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="text-5xl mb-4">🤖</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Asistent AI Inteligent
            </h3>
            <p className="text-gray-600">
              Întreabă asistentul despre orice procedură de urbanism și primește răspunsuri instant, 
              personalizate pentru situația ta.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Checklist Automat
            </h3>
            <p className="text-gray-600">
              Află exact ce documente îți trebuie pentru autorizația ta, 
              fără să mai citești regulamente complicate.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="text-5xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Tracking în Timp Real
            </h3>
            <p className="text-gray-600">
              Urmărește statusul dosarului tău pas cu pas, 
              de la depunere până la obținerea autorizației.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-2xl shadow-xl p-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Cum funcționează?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <span className="text-2xl font-bold text-purple-600">1</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Întreabă</h4>
              <p className="text-sm text-gray-600">
                Descrie ce lucrare vrei să realizezi în chat
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <span className="text-2xl font-bold text-purple-600">2</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Primești Lista</h4>
              <p className="text-sm text-gray-600">
                AI-ul îți oferă documentele necesare
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Încarcă</h4>
              <p className="text-sm text-gray-600">
                Încarcă documentele direct în platformă
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <span className="text-2xl font-bold text-purple-600">4</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Urmărește</h4>
              <p className="text-sm text-gray-600">
                Monitorizează progresul dosarului tău
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">Ai deja un dosar în curs?</p>
          <Link
            href="/citizen/requests"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
          >
            <span>Vezi dosarele tale</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-500 text-sm">
            © 2025 ADU - Asistent Digital de Urbanism. Toate drepturile rezervate.
          </p>
        </div>
      </footer>
    </div>
  );
}
