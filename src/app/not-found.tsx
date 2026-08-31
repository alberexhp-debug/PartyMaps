import Link from 'next/link'
import { Trophy } from '@/components/todh/iconosTorneum'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-white/6 rounded-3xl flex items-center justify-center mb-6">
        <Trophy size={36} className="text-[#6B6B85]" />
      </div>
      <h1 className="text-5xl font-black text-white text-display mb-2">404</h1>
      <p className="text-lg font-semibold text-white mb-2">Esta página no existe</p>
      <p className="text-sm text-[#6B6B85] mb-8 max-w-xs">
        Puede que el enlace haya cambiado o que el torneo ya no esté disponible.
      </p>
      <Link
        href="/explorar"
        className="px-6 py-3 bg-[#B6FF3A] rounded-2xl text-[#0A0A0F] font-semibold text-sm hover:bg-[#A6EE2B] transition-colors"
      >
        Explorar torneos
      </Link>
    </div>
  )
}
