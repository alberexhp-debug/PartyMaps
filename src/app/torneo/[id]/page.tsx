'use client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { TORNEOS_SAMPLE, JUEGOS } from '@/lib/torneos/sample'
import {
  ArrowLeft, Calendar, MapPin, Trophy, Users, Lock, Radio, Share2, ListTree, ShieldCheck,
} from 'lucide-react'

export default function TorneoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const t = TORNEOS_SAMPLE.find(x => x.id === id)

  if (!t) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Trophy size={40} className="text-[#8B8BA8]" />
        <p className="text-lg font-bold text-white">Torneo no encontrado</p>
        <Link href="/explorar" className="px-4 h-10 inline-flex items-center rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-semibold">Volver a Explorar</Link>
      </div>
    )
  }

  const juego = JUEGOS[t.juego]
  const completo = t.inscritos >= t.plazas
  const pct = Math.min(100, Math.round((t.inscritos / t.plazas) * 100))

  return (
    <div className="relative min-h-screen pb-28">
      {/* Banner */}
      <div className="relative h-44 overflow-hidden" style={{ background: `linear-gradient(135deg, ${juego.color}33, #0C0C15 72%)` }}>
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 18% 0%, ${juego.color}45, transparent 60%)` }} />
        <div className="relative flex items-center justify-between px-4 pt-5 safe-top">
          <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
          <div className="flex gap-2">
            {t.enDirecto && <span className="inline-flex items-center gap-1 px-2.5 h-10 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-[#E63E54] text-white"><Radio size={12} className="animate-pulse-heat" /> En directo</span>}
            <button aria-label="Compartir" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white"><Share2 size={16} /></button>
          </div>
        </div>
        <div className="absolute bottom-3 left-5 right-5">
          <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-bold" style={{ background: `${juego.color}26`, color: juego.color, border: `1px solid ${juego.color}55` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: juego.color }} /> {juego.nombre}
          </span>
        </div>
      </div>

      <div className="px-5">
        <h1 className="mt-3 text-2xl font-bold text-white text-display tracking-tight leading-tight">{t.nombre}</h1>
        {t.vip && (
          <span className="mt-2 inline-flex items-center gap-1 px-2 h-7 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/8 text-[#E0BE63] border border-[#D4A84B]/40"><Lock size={11} /> Exclusivo {t.vip}</span>
        )}

        {/* Directo */}
        {t.enDirecto && (
          <div className="mt-4 aspect-video w-full rounded-2xl border border-white/10 bg-black/40 flex flex-col items-center justify-center gap-2 text-[#8B8BA8]">
            <div className="h-12 w-12 rounded-full bg-[#E63E54]/20 border border-[#E63E54]/50 flex items-center justify-center"><Radio size={20} className="text-[#FF6076]" /></div>
            <p className="text-sm font-semibold text-white">Emisión en directo</p>
            <p className="text-xs">YouTube / Twitch embebido</p>
          </div>
        )}

        {/* Info */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <InfoCard icon={<Calendar size={15} className="text-[#B6FF3A]" />} label="Cuándo" value={t.fechaLabel} />
          <InfoCard icon={<MapPin size={15} className="text-[#4F8EF7]" />} label="Dónde" value={`${t.local}${t.distanciaKm > 0 ? ` · ${t.distanciaKm} km` : ''}`} />
          <InfoCard icon={<Trophy size={15} className="text-[#9B82FF]" />} label="Formato" value={t.formato} />
          <InfoCard icon={<Users size={15} className="text-[#E0BE63]" />} label={t.bote ? 'Bote en juego' : 'Inscripción'} value={t.bote ? `${t.bote}€` : t.precio === 0 ? 'Gratis' : `${t.precio}€`} />
        </div>

        {/* Inscritos */}
        <div className="mt-4 card-premium p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="inline-flex items-center gap-1.5 text-white font-semibold"><Users size={15} /> {t.inscritos} / {t.plazas} inscritos</span>
            <span className={completo ? 'text-[#FF8A5C] font-semibold text-sm' : 'text-[#B6FF3A] font-semibold text-sm'}>{completo ? 'Completo' : `${t.plazas - t.inscritos} plazas libres`}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/8 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: completo ? '#FF8A5C' : '#B6FF3A' }} />
          </div>
        </div>

        {/* Reglas */}
        <div className="mt-5">
          <p className="eyebrow eyebrow-muted mb-2">Reglas</p>
          <ul className="space-y-2 text-sm text-[#B8B8CC]">
            <li className="flex gap-2"><ShieldCheck size={16} className="text-[#B6FF3A] shrink-0 mt-0.5" /> Best of 3 hasta top 8; Best of 5 en finales.</li>
            <li className="flex gap-2"><ShieldCheck size={16} className="text-[#B6FF3A] shrink-0 mt-0.5" /> Check-in con QR y reporte de resultados por consenso.</li>
            <li className="flex gap-2"><ShieldCheck size={16} className="text-[#B6FF3A] shrink-0 mt-0.5" /> Seeding por ranking; el TO resuelve las disputas.</li>
          </ul>
        </div>

        {/* Bracket */}
        <Link href="#" className="mt-5 flex items-center justify-between card-premium p-4 hover:-translate-y-0.5 transition-transform">
          <span className="inline-flex items-center gap-2 text-white font-semibold"><ListTree size={18} className="text-[#9B82FF]" /> Ver bracket en vivo</span>
          <span className="text-[#8B8BA8] text-lg">›</span>
        </Link>
      </div>

      {/* CTA fija */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-5 pt-3 safe-bottom bg-gradient-to-t from-[#08080F] via-[#08080F] to-transparent">
        <div className="max-w-lg mx-auto">
          {t.vip ? (
            <button className="w-full h-14 rounded-2xl bg-white/8 border border-[#D4A84B]/40 text-[#E0BE63] font-bold flex items-center justify-center gap-2"><Lock size={16} /> Requiere tier {t.vip}</button>
          ) : completo ? (
            <button className="w-full h-14 rounded-2xl bg-[#FF8A5C]/15 border border-[#FF8A5C]/40 text-[#FF8A5C] font-bold">Apuntarme a la lista de espera</button>
          ) : (
            <button className="w-full h-14 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold text-[15px] shadow-[0_10px_30px_-8px_rgba(182,255,58,0.5)] active:scale-[0.99] transition-transform">
              Inscribirme · {t.precio === 0 ? 'Gratis' : `${t.precio}€`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card-premium p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold mb-1">{icon}{label}</div>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  )
}
