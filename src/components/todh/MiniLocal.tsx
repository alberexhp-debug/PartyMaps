'use client'
import Link from 'next/link'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { useT } from '@/lib/i18n'
import { TORNEOS_SAMPLE, JUEGOS, type Local } from '@/lib/torneos/sample'
import { X, Star, Ruler, Monitor, Users, Wallet, CalendarClock, ChevronRight, Check, ShoppingBag } from 'lucide-react'
import { useState } from 'react'

// Mini-ficha pública de la sede (modal), simétrica al MiniPerfil de jugador.
// Se abre al pinchar la sede en la ficha de torneo o en el mapa: espacio, setups,
// tarifa para TOs y torneos activos en ese local.
export function MiniLocal({ local, onClose }: { local: Local; onClose: () => void }) {
  const { t: tr } = useT()
  const creados = useDemoStore(s => s.creados)
  const cancelados = useDemoStore(s => s.cancelados)
  const [solicitado, setSolicitado] = useState(false)
  const comprarBono = useDemoStore(s => s.comprarBono)
  const [comprado, setComprado] = useState<string | null>(null)
  // Tienda del local (reunión 5-jul): bonos y merch con comisión de la app
  const productos = [
    { titulo: 'Bono bebida + snack', precio: 4, emoji: '🥤' },
    { titulo: 'Menú día de torneo', precio: 8, emoji: '🌭' },
    { titulo: `Camiseta ${local.nombre}`, precio: 15, emoji: '👕' },
  ]
  const torneos = [...creados, ...TORNEOS_SAMPLE]
    .filter(t => t.localId === local.id && !cancelados.includes(t.id))
    .slice(0, 3)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden animate-slide-up-sm sm:animate-pop max-h-[88vh] overflow-y-auto">
        <div className="relative h-24" style={{ background: `radial-gradient(120% 140% at 0% 0%, ${local.color} 0%, ${local.color}55 40%, transparent 75%), #0E1119` }}>
          <button onClick={onClose} aria-label="Cerrar" className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/30 flex items-center justify-center text-white"><X size={16} /></button>
        </div>
        <div className="px-5 pb-6 -mt-10">
          <div className="flex items-end gap-3">
            <span className="inline-flex items-center justify-center rounded-2xl font-black text-[#0A0A0F] border-4 border-[#141822]" style={{ width: 72, height: 72, background: local.color, fontSize: 30 }}>{local.nombre[0]}</span>
            <div className="pb-1 min-w-0">
              <p className="text-lg font-bold text-white text-display leading-tight truncate">{local.nombre}</p>
              <p className="text-xs text-[#8B8BA8]">{local.zona} · {local.ciudad}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-bold text-[#E0BE63] bg-[#E0BE63]/12 border border-[#E0BE63]/40"><Star size={11} className="fill-[#E0BE63]" /> {local.rating} · {local.valoraciones} {tr('ml.resenas')}</span>
            {local.fundador && <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-black text-[#E0BE63] bg-[#E0BE63]/12 border border-[#E0BE63]/50">⚡ Sede Fundadora</span>}
            {local.tiposSetup.map(ts => (
              <span key={ts} className="px-2.5 h-7 inline-flex items-center rounded-full text-[11px] font-semibold bg-white/6 border border-white/10 text-[#D4D4E4]">{ts}</span>
            ))}
          </div>

          {/* Espacio del venue */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat icon={<Ruler size={14} className="text-[#4F8EF7]" />} label={tr('ml.espacio')} value={`${local.m2} m²`} />
            <Stat icon={<Monitor size={14} className="text-[#B6FF3A]" />} label="Setups" value={String(local.setups)} />
            <Stat icon={<Users size={14} className="text-[#9B82FF]" />} label={tr('ml.aforo')} value={String(local.aforo)} />
          </div>

          {/* Tarifa para TOs */}
          <div className="mt-3 flex items-center justify-between card-premium px-3.5 py-3 border border-[#B6FF3A]/25">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#B6FF3A]/15 text-[#B6FF3A]"><Wallet size={16} /></span>
              <div>
                <p className="text-xs text-[#8B8BA8] font-semibold uppercase tracking-wider">{tr('ml.paraTOs')}</p>
                <p className="text-sm font-bold text-white">{tr('ml.desde')} <span className="text-[#B6FF3A] font-mono-num">{local.precioNoche}€</span>/{tr('ml.noche')} · {local.mesas.length} mesas</p>
              </div>
            </div>
          </div>

          {/* Torneos activos en esta sede */}
          {torneos.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-[#8B8BA8] font-semibold uppercase tracking-wider mb-2">{tr('ml.torneosSede')}</p>
              <div className="space-y-1.5">
                {torneos.map(t => (
                  <Link key={t.id} href={`/torneo/${t.id}`} className="flex items-center gap-2.5 card-premium card-int px-3 py-2.5">
                    <span className="w-1 self-stretch rounded-full" style={{ background: JUEGOS[t.juego]?.color || '#B6FF3A' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-white truncate">{t.nombre}</p>
                      <p className="text-[11px] text-[#8B8BA8]">{t.fechaLabel} · <span className="font-mono-num">{t.inscritos}/{t.plazas}</span></p>
                    </div>
                    {t.enDirecto && <span className="badge-live shrink-0">Live</span>}
                    <ChevronRight size={14} className="text-[#6B6B85] shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tienda del local (bonos y merch — comisión Tourneum) */}
          <div className="mt-4">
            <p className="text-xs text-[#8B8BA8] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5"><ShoppingBag size={12} /> {tr('shop.titulo')}</p>
            <div className="space-y-1.5">
              {productos.map(pr => (
                <div key={pr.titulo} className="flex items-center gap-2.5 card-premium px-3 py-2.5">
                  <span className="text-lg">{pr.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-white truncate">{pr.titulo}</p>
                    <p className="text-[10px] text-[#8B8BA8]">{tr('shop.canjea')}</p>
                  </div>
                  <button onClick={() => { comprarBono(local.id, local.nombre, pr.titulo, pr.precio); setComprado(pr.titulo) }}
                    disabled={comprado === pr.titulo}
                    className={`h-8 px-3 rounded-lg text-[12px] font-bold transition-all ${comprado === pr.titulo ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border border-[#B6FF3A]/40' : 'bg-white/8 border border-white/15 text-white hover:bg-white/12'}`}>
                    {comprado === pr.titulo ? '✓ En cartera' : `${pr.precio}€`}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* CTA para TOs (demo) */}
          <button onClick={() => setSolicitado(true)} disabled={solicitado}
            className={`mt-4 w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${solicitado ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border border-[#B6FF3A]/40' : 'bg-[#B6FF3A] text-[#0A0A0F]'}`}>
            {solicitado ? <><Check size={16} /> {tr('ml.enviada')}</> : <><CalendarClock size={16} /> {tr('ml.solicitar')}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card-premium px-2 py-3 flex flex-col items-center gap-1">
      {icon}
      <span className="text-base font-bold text-white font-mono-num leading-none">{value}</span>
      <span className="text-[10px] text-[#8B8BA8] uppercase tracking-wider">{label}</span>
    </div>
  )
}
