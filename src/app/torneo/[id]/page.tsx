'use client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import {
  getTorneo, getOrganizador, getLocal, JUEGOS, rankingPorJuego,
} from '@/lib/torneos/sample'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { GameKeyart } from '@/components/todh/GameKeyart'
import { InscripcionSheet } from '@/components/todh/InscripcionSheet'
import {
  ArrowLeft, Calendar, MapPin, Trophy, Users, Lock, Radio, Share2, ListTree, ShieldCheck,
  Check, Star, Coins, Wifi,
} from 'lucide-react'

// Comisión de plataforma por tramo (la paga el jugador encima del precio)
function comision(precio: number, inscritos: number): { pct: number; importe: number } {
  if (precio === 0) return { pct: 0, importe: 0 }
  const pct = inscritos <= 32 ? 6 : inscritos <= 128 ? 5 : 4
  return { pct, importe: +(precio * pct / 100).toFixed(2) }
}

// Reparto del bote por puesto (preset por defecto)
function repartoBote(bote: number): { puesto: string; pct: number; importe: number }[] {
  const presets = [
    { puesto: '1º', pct: 70 }, { puesto: '2º', pct: 20 }, { puesto: '3º', pct: 10 },
  ]
  return presets.map(p => ({ ...p, importe: Math.round(bote * p.pct / 100) }))
}

export default function TorneoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [sheet, setSheet] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const creado = useDemoStore(s => s.creados.find(c => c.id === id))
  const t = getTorneo(id) || creado
  const inscrito = useDemoStore(s => s.inscritos.includes(id))
  const inscribir = useDemoStore(s => s.inscribir)

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
  const org = t.organizadorId ? getOrganizador(t.organizadorId) : undefined
  const local = t.localId ? getLocal(t.localId) : undefined
  const completo = t.inscritos >= t.plazas
  const inscritosVis = t.inscritos + (inscrito ? 1 : 0)
  const pct = Math.min(100, Math.round((inscritosVis / t.plazas) * 100))
  const com = comision(t.precio, t.inscritos)
  const totalJugador = t.precio + com.importe
  const participantes = rankingPorJuego(t.juego).slice(0, 6)

  async function compartir() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (navigator.share) await navigator.share({ title: t!.nombre, url })
      else { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 1800) }
    } catch { /* cancelado */ }
  }

  function confirmarInscripcion() {
    inscribir(t!.id, t!.nombre)
    setSheet(false)
  }

  return (
    <div className="relative min-h-screen pb-28">
      {/* Banner */}
      <div className="relative h-48 overflow-hidden">
        <GameKeyart juegoId={t.juego} label={false} className="absolute inset-0" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(8,8,15,0.12) 28%, #0C0E13)' }} />
        <div className="relative flex items-center justify-between px-4 pt-5 safe-top">
          <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
          <div className="flex gap-2">
            {t.enDirecto && <Link href={`/torneo/${t.id}/directo`} className="inline-flex items-center gap-1 px-2.5 h-10 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-[#E63E54] text-white"><Radio size={12} className="animate-pulse-heat" /> En directo</Link>}
            <button onClick={compartir} aria-label="Compartir" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white relative">
              <Share2 size={16} />
              {copiado && <span className="absolute -bottom-7 right-0 whitespace-nowrap text-[10px] font-semibold text-[#0A0A0F] bg-[#B6FF3A] px-2 py-0.5 rounded-md">Enlace copiado</span>}
            </button>
          </div>
        </div>
        <div className="absolute bottom-3 left-5 right-5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-bold" style={{ background: `${juego.color}26`, color: juego.color, border: `1px solid ${juego.color}55` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: juego.color }} /> {juego.nombre}
          </span>
          {t.online && <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#4F8EF7]/20 text-[#4F8EF7] border border-[#4F8EF7]/40"><Wifi size={10} /> Online</span>}
        </div>
      </div>

      <div className="px-5">
        <h1 className="mt-3 text-2xl font-bold text-white text-display tracking-tight leading-tight">{t.nombre}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {t.vip && (
            <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/8 text-[#E0BE63] border border-[#D4A84B]/40"><Lock size={11} /> Exclusivo {t.vip}</span>
          )}
          {inscrito && (
            <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full text-[11px] font-bold bg-[#B6FF3A]/15 text-[#B6FF3A] border border-[#B6FF3A]/40"><Check size={12} /> Inscrito</span>
          )}
        </div>

        {t.descripcion && <p className="mt-3 text-sm text-[#B8B8CC] leading-relaxed">{t.descripcion}</p>}

        {/* Organizador */}
        {org && (
          <Link href={`/organizador/${org.id}`} className="mt-3 flex items-center gap-2.5 w-fit">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm text-[#0A0A0F]" style={{ background: org.color }}>{org.nombre[0]}</span>
            <span className="text-sm"><span className="text-[#8B8BA8]">Organiza · </span><span className="text-white font-semibold">{org.nombre}</span></span>
            {org.verificado && <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#4F8EF7] text-white text-[10px] font-bold">✓</span>}
            <span className="inline-flex items-center gap-0.5 text-[11px] text-[#E0BE63] font-semibold"><Star size={11} className="fill-[#E0BE63]" /> {org.rating}</span>
          </Link>
        )}

        {/* Directo */}
        {t.enDirecto && (
          <Link href={`/torneo/${t.id}/directo`} className="mt-4 block aspect-video w-full rounded-2xl border border-white/10 bg-black/40 relative overflow-hidden group">
            <GameKeyart juegoId={t.juego} label={false} className="absolute inset-0 opacity-40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#8B8BA8]">
              <div className="h-14 w-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform"><Radio size={22} className="text-white" /></div>
              <p className="text-sm font-semibold text-white">Ver emisión en directo</p>
            </div>
            <span className="absolute top-2.5 left-2.5 badge-live">Live</span>
            {t.viendo && <span className="absolute top-2.5 right-2.5 text-[11px] font-mono-num text-white bg-black/50 px-2 py-0.5 rounded-md">{t.viendo} viendo</span>}
          </Link>
        )}

        {/* Info */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <InfoCard icon={<Calendar size={15} className="text-[#B6FF3A]" />} label="Cuándo" value={t.fechaLabel} />
          <InfoCard icon={<MapPin size={15} className="text-[#4F8EF7]" />} label="Dónde" value={t.online ? 'Online' : `${t.local}${t.distanciaKm > 0 ? ` · ${t.distanciaKm} km` : ''}`} />
          <InfoCard icon={<Trophy size={15} className="text-[#9B82FF]" />} label="Formato" value={t.formato} />
          <InfoCard icon={<Coins size={15} className="text-[#E0BE63]" />} label={t.bote ? 'Bote en juego' : 'Inscripción'} value={t.bote ? `${t.bote}€` : t.precio === 0 ? 'Gratis' : `${t.precio}€`} />
        </div>

        {/* Inscritos */}
        <div className="mt-4 card-premium p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="inline-flex items-center gap-1.5 text-white font-semibold"><Users size={15} /> <span className="font-mono-num">{inscritosVis} / {t.plazas}</span> inscritos</span>
            <span className={completo && !inscrito ? 'text-[#FF8A5C] font-semibold text-sm' : 'text-[#B6FF3A] font-semibold text-sm'}>{completo && !inscrito ? 'Completo' : `${Math.max(0, t.plazas - inscritosVis)} plazas libres`}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/8 overflow-hidden">
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: completo ? '#FF8A5C' : `linear-gradient(90deg, ${juego.color}, #C8FF5C)` }} />
          </div>
        </div>

        {/* Premios */}
        {(t.bote ?? 0) > 0 && (
          <div className="mt-4">
            <p className="eyebrow eyebrow-muted mb-2">Reparto del bote</p>
            <div className="card-premium p-4 space-y-2.5">
              {repartoBote(t.bote!).map(r => (
                <div key={r.puesto} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-bold text-white font-mono-num">{r.puesto}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-white/8 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.puesto === '1º' ? '#E0BE63' : r.puesto === '2º' ? '#B8C0CC' : '#C08A4B' }} />
                  </div>
                  <span className="w-16 text-right text-sm font-bold text-white font-mono-num">{r.importe}€</span>
                </div>
              ))}
              <p className="text-[11px] text-[#8B8BA8] pt-1">El bote crece con cada inscripción. Reparto editable por el organizador.</p>
            </div>
          </div>
        )}

        {/* Participantes */}
        <div className="mt-4">
          <p className="eyebrow eyebrow-muted mb-2">Participantes destacados</p>
          <div className="flex items-center">
            {participantes.map((p, i) => {
              const cols = ['#E63E54', '#F4912B', '#4F8EF7', '#9B5DE5', '#2EC4B6', '#B6FF3A']
              return (
                <span key={p.id} className="inline-flex items-center justify-center rounded-full text-[#0A0A0F] font-black border-2 border-[#0C0C15]"
                  style={{ width: 38, height: 38, marginLeft: i ? -10 : 0, background: cols[i % cols.length], zIndex: 10 - i }}>
                  {p.nombre[0]}
                </span>
              )
            })}
            {t.inscritos > 6 && <span className="ml-3 text-sm text-[#B8B8CC] font-medium">+{t.inscritos - 6} más</span>}
          </div>
        </div>

        {/* Reglas */}
        <div className="mt-5">
          <p className="eyebrow eyebrow-muted mb-2">Reglas</p>
          <ul className="space-y-2 text-sm text-[#B8B8CC]">
            <li className="flex gap-2"><ShieldCheck size={16} className="text-[#B6FF3A] shrink-0 mt-0.5" /> {t.bestOf || 'Best of 3'} · formato {t.formato.toLowerCase()}.</li>
            <li className="flex gap-2"><ShieldCheck size={16} className="text-[#B6FF3A] shrink-0 mt-0.5" /> Check-in con QR y reporte de resultados por consenso.</li>
            <li className="flex gap-2"><ShieldCheck size={16} className="text-[#B6FF3A] shrink-0 mt-0.5" /> Seeding por ranking; el organizador resuelve las disputas.</li>
            {t.online && <li className="flex gap-2"><ShieldCheck size={16} className="text-[#B6FF3A] shrink-0 mt-0.5" /> Código de sala por el chat del combate.</li>}
          </ul>
        </div>

        {/* Sede */}
        {local && (
          <div className="mt-5">
            <p className="eyebrow eyebrow-muted mb-2">Sede</p>
            <div className="card-premium p-4 flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-[#0A0A0F] font-black" style={{ background: local.color }}>{local.nombre[0]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{local.nombre}</p>
                <p className="text-xs text-[#8B8BA8]">{local.zona} · {local.setups} setups · <span className="text-[#E0BE63]">★ {local.rating}</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Bracket */}
        <Link href={`/torneo/${t.id}/bracket`} className="mt-5 flex items-center justify-between card-premium card-int p-4">
          <span className="inline-flex items-center gap-2 text-white font-semibold"><ListTree size={18} className="text-[#9B82FF]" /> Ver bracket en vivo</span>
          <span className="text-[#8B8BA8] text-lg">›</span>
        </Link>
      </div>

      {/* CTA fija */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-5 pt-3 safe-bottom bg-gradient-to-t from-[#0C0E13] via-[#0C0E13] to-transparent">
        <div className="max-w-lg mx-auto">
          {inscrito ? (
            <Link href="/entradas" className="w-full h-14 rounded-2xl bg-[#B6FF3A]/15 border border-[#B6FF3A]/40 text-[#B6FF3A] font-bold flex items-center justify-center gap-2"><Check size={18} /> Inscrito · ver en mi cartera</Link>
          ) : t.vip ? (
            <button className="w-full h-14 rounded-2xl bg-white/8 border border-[#D4A84B]/40 text-[#E0BE63] font-bold flex items-center justify-center gap-2"><Lock size={16} /> Requiere tier {t.vip}</button>
          ) : completo ? (
            <button onClick={() => setSheet(true)} className="w-full h-14 rounded-2xl bg-[#FF8A5C]/15 border border-[#FF8A5C]/40 text-[#FF8A5C] font-bold">Apuntarme a la lista de espera</button>
          ) : (
            <button onClick={() => setSheet(true)} className="w-full h-14 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold text-[15px] shadow-[0_10px_30px_-8px_rgba(182,255,58,0.5)] active:scale-[0.99] transition-transform">
              Inscribirme · {totalJugador === 0 ? 'Gratis' : `${totalJugador}€`}
            </button>
          )}
        </div>
      </div>

      {sheet && (
        <InscripcionSheet
          torneo={t} juego={juego} comisionPct={com.pct} comisionImporte={com.importe}
          total={totalJugador} completo={completo}
          onClose={() => setSheet(false)} onConfirm={confirmarInscripcion}
        />
      )}
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
