'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getTorneo, getLocal, JUEGOS } from '@/lib/torneos/sample'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { MapaMesas } from '@/components/todh/MapaMesas'
import { ArrowLeft, Vibrate, Check, ListTree, MapPin, Users } from 'lucide-react'

// Vista "te toca" del jugador: el plano del local con SU mesa resaltada y el móvil
// vibrando hasta que confirme que va de camino. Pensada para enterarse aunque tenga
// el móvil guardado y esté en la otra punta del local.
export default function MesaPage() {
  return (
    <Suspense fallback={null}>
      <MesaContent />
    </Suspense>
  )
}

function MesaContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const params = useSearchParams()
  const n = parseInt(params.get('n') || '3', 10)
  const vs = params.get('vs') || 'Tu combate'

  const creado = useDemoStore(s => s.creados.find(c => c.id === id))
  const t = getTorneo(id) || creado
  const local = getLocal(t?.localId || 'gamba')
  const mesasOverride = useDemoStore(s => s.mesasSede[local?.id ?? ''])
  const mesas = mesasOverride ?? local?.mesas ?? []
  const mesa = mesas.find(m => m.n === n)
  const juego = t ? JUEGOS[t.juego] : undefined

  const [confirmado, setConfirmado] = useState(false)
  const vibrando = useRef<ReturnType<typeof setInterval> | null>(null)

  // Vibración persistente hasta confirmar (en móviles compatibles; en escritorio
  // queda el pulso visual). Patrón insistente tipo alarma suave.
  useEffect(() => {
    if (confirmado) return
    const patron = [350, 180, 350, 180, 600]
    const vibrar = () => { try { navigator.vibrate?.(patron) } catch { /* sin soporte */ } }
    vibrar()
    vibrando.current = setInterval(vibrar, 2200)
    return () => {
      if (vibrando.current) clearInterval(vibrando.current)
      try { navigator.vibrate?.(0) } catch { /* sin soporte */ }
    }
  }, [confirmado])

  if (!t || !local) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-bold text-white">Torneo no encontrado</p>
        <Link href="/explorar" className="px-4 h-10 inline-flex items-center rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-semibold">Volver a Explorar</Link>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen pb-32 lg:pb-12 max-w-xl lg:max-w-5xl mx-auto">
      <div className="flex items-center gap-3 px-4 lg:px-6 pt-5 pb-3 safe-top">
        <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold truncate">{t.nombre}</p>
          <p className="text-base font-bold text-white truncate">{vs}</p>
        </div>
        {juego && (
          <span className="inline-flex items-center gap-1.5 px-2 h-7 rounded-full text-[10px] font-bold shrink-0" style={{ background: `${juego.color}1F`, color: juego.color, border: `1px solid ${juego.color}44` }}>
            {juego.corto}
          </span>
        )}
      </div>

      {/* Escritorio: plano grande a la izquierda + aviso/datos/acción a la derecha */}
      <div className="px-4 lg:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:items-start lg:mt-2">
        {/* Aviso vibrante */}
        <div className="lg:col-start-2 lg:row-start-1">
        {!confirmado ? (
          <div className="rounded-2xl border border-[#B6FF3A]/50 bg-[#B6FF3A]/[0.10] p-4 flex items-center gap-3" style={{ animation: 'pulse-heat 1.4s ease-in-out infinite' }}>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#B6FF3A]/20 text-[#B6FF3A] shrink-0"><Vibrate size={20} /></span>
            <div>
              <p className="text-[15px] font-bold text-white leading-tight">¡Te toca! Ve a la <span className="text-[#B6FF3A]">mesa {n}</span></p>
              <p className="text-xs text-[#B8B8CC] mt-0.5">El móvil vibrará hasta que confirmes que vas de camino.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#B6FF3A]/40 bg-[#B6FF3A]/[0.08] p-4 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#B6FF3A] text-[#0A0A0F] shrink-0"><Check size={20} /></span>
            <div>
              <p className="text-[15px] font-bold text-white leading-tight">Confirmado, te esperan en la mesa {n}</p>
              <p className="text-xs text-[#B8B8CC] mt-0.5">El organizador ya sabe que vas de camino.</p>
            </div>
          </div>
        )}
        </div>

        {/* Plano con la mesa resaltada */}
        <div className="mt-4 lg:mt-0 lg:col-start-1 lg:row-start-1 lg:row-span-2">
          <MapaMesas mesas={mesas} destacada={n} />
          <p className="mt-2 text-[11px] text-[#8B8BA8] text-center">Plano de {local.nombre} · tu mesa parpadea en verde</p>
        </div>

        <div className="lg:col-start-2 lg:row-start-2">
        {/* Datos de la mesa y la sede */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="card-premium p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold mb-1"><Users size={13} className="text-[#9B82FF]" /> Mesa {n}</div>
            <p className="text-sm font-bold text-white capitalize">{mesa ? `${mesa.tipo} · ${mesa.plazas} plazas` : 'Por asignar'}</p>
          </div>
          <div className="card-premium p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold mb-1"><MapPin size={13} className="text-[#4F8EF7]" /> Sede</div>
            <p className="text-sm font-bold text-white truncate">{local.nombre} · {local.zona}</p>
          </div>
        </div>

        <Link href={`/torneo/${t.id}/bracket`} className="mt-3 flex items-center justify-between card-premium card-int p-4">
          <span className="inline-flex items-center gap-2 text-white font-semibold text-sm"><ListTree size={17} className="text-[#9B82FF]" /> Ver el bracket</span>
          <span className="text-[#8B8BA8] text-lg">›</span>
        </Link>

        {/* Acción (escritorio, en columna) */}
        <div className="hidden lg:block mt-4">
          {!confirmado ? (
            <button onClick={() => setConfirmado(true)}
              className="w-full h-13 py-3.5 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold text-[15px] shadow-[0_10px_30px_-8px_rgba(182,255,58,0.5)] flex items-center justify-center gap-2">
              <Check size={18} /> Confirmo, voy de camino
            </button>
          ) : (
            <Link href={`/torneo/${t.id}/directo`}
              className="w-full h-13 py-3.5 rounded-2xl bg-white/8 border border-white/12 text-white font-bold text-[15px] flex items-center justify-center gap-2">
              Abrir chat del combate
            </Link>
          )}
        </div>
        </div>
      </div>

      {/* CTA fija (móvil/tablet) */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-20 px-4 pb-3 pt-3 bg-gradient-to-t from-[#0D0F15] via-[#0D0F15] to-transparent">
        <div className="max-w-lg mx-auto">
          {!confirmado ? (
            <button onClick={() => setConfirmado(true)}
              className="w-full h-14 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold text-[15px] shadow-[0_10px_30px_-8px_rgba(182,255,58,0.5)] active:scale-[0.99] transition-transform flex items-center justify-center gap-2">
              <Check size={18} /> Confirmo, voy de camino
            </button>
          ) : (
            <Link href={`/torneo/${t.id}/directo`}
              className="w-full h-14 rounded-2xl bg-white/8 border border-white/12 text-white font-bold text-[15px] flex items-center justify-center gap-2">
              Abrir chat del combate
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
