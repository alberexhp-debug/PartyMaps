import Link from 'next/link'
import { Map } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-white/6 rounded-3xl flex items-center justify-center mb-6">
        <Map size={36} className="text-[#6B6B85]" />
      </div>
      <h1 className="text-5xl font-black text-white mb-2">404</h1>
      <p className="text-lg font-semibold text-white mb-2">Esta página no existe</p>
      <p className="text-sm text-[#6B6B85] mb-8 max-w-xs">
        Puede que el enlace haya cambiado o que la página ya no esté disponible.
      </p>
      <Link
        href="/mapa"
        className="px-6 py-3 bg-[#E94560] rounded-2xl text-white font-semibold text-sm hover:bg-[#c73652] transition-colors"
      >
        Ir al mapa
      </Link>
    </div>
  )
}
