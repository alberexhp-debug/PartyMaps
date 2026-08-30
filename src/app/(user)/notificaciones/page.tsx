'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDemoStore, type Notificacion, type NotiTipo } from '@/lib/stores/useDemoStore'
import { usePushSubscription } from '@/lib/hooks/usePushSubscription'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { useT, conParams, type ClaveI18n } from '@/lib/i18n'
import { ArrowLeft, Swords, AlertTriangle, Users, Trophy, Bell, BellOff, Ticket, CheckCheck, TrendingDown, Trash2, X } from 'lucide-react'

const ICONO: Record<NotiTipo, { icon: React.ElementType; color: string }> = {
  combate:      { icon: Swords, color: '#B6FF3A' },
  disputa:      { icon: AlertTriangle, color: '#FF6076' },
  lleno:        { icon: Users, color: '#FF8A5C' },
  'nuevo-torneo': { icon: Trophy, color: '#4F8EF7' },
  sistema:      { icon: Bell, color: '#9B82FF' },
  inscripcion:  { icon: Ticket, color: '#E0BE63' },
  inactividad:  { icon: TrendingDown, color: '#FFB03A' },
}

export default function NotificacionesPage() {
  const { t: tr } = useT()
  const router = useRouter()
  const toast = useToast()
  const push = usePushSubscription()
  const notis = useDemoStore(s => s.notificaciones)
  const descartadas = useDemoStore(s => s.descartadas)
  const marcarLeidas = useDemoStore(s => s.marcarLeidas)
  const descartarNoti = useDemoStore(s => s.descartarNoti)
  const descartarTodasNotis = useDemoStore(s => s.descartarTodasNotis)
  // R1: las descartadas (swipe/X) no se pintan; el estado persiste en el store.
  const visibles = notis.filter(n => !descartadas.includes(n.id))
  const noLeidas = visibles.filter(n => !n.leida).length

  useEffect(() => {
    const t = setTimeout(() => marcarLeidas(), 1200)
    return () => clearTimeout(t)
  }, [marcarLeidas])

  return (
    <div className="relative min-h-screen pb-10">
      <div className="px-4 pt-5 pb-3 safe-top sticky top-0 z-10 bg-[#0D0F15]/92 backdrop-blur-md border-b border-white/6">
      <div className="flex items-center gap-3 max-w-2xl mx-auto lg:max-w-none lg:mx-0">
        <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold">{tr('notis.eyebrow')}</p>
          <p className="text-base font-bold text-white">{tr('notis.titulo')} {noLeidas > 0 && <span className="text-[#B6FF3A]">· {noLeidas}</span>}</p>
        </div>
        {noLeidas > 0 && (
          <button onClick={marcarLeidas} className="inline-flex items-center gap-1 text-xs text-[#B6FF3A] font-semibold"><CheckCheck size={14} /> {tr('notis.leidas')}</button>
        )}
      </div>
      </div>

      <div className="px-4 pt-4 space-y-2 max-w-2xl mx-auto lg:max-w-none lg:mx-0">
        {/* Notificaciones push del dispositivo (antes vivía en el perfil) */}
        <div className="card-premium p-4 mb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', push.estado === 'activado' ? 'bg-[#4F8EF7]/15 text-[#4F8EF7]' : 'bg-white/5 text-[#6B6B85]')}>
                {push.estado === 'activado' ? <Bell size={18} /> : <BellOff size={18} />}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{tr('notis.push')}</p>
                <p className="text-xs text-[#A0A0B8] mt-0.5">
                  {push.estado === 'activado' && tr('notis.pushOn')}
                  {push.estado === 'desactivado' && tr('notis.pushOff')}
                  {push.estado === 'denegado' && tr('notis.pushDenegado')}
                  {push.estado === 'no-soportado' && tr('notis.pushNoSoportado')}
                </p>
              </div>
            </div>
            {push.estado === 'desactivado' && (
              <Button size="sm" loading={push.trabajando} onClick={async () => {
                const ok = await push.activar(); if (ok) toast.success(tr('notis.pushHechas')); else toast.error(tr('notis.pushError'))
              }}>{tr('notis.pushActivar')}</Button>
            )}
          </div>
        </div>

        {visibles.length > 0 && (
          <div className="flex justify-end pb-1">
            <button onClick={descartarTodasNotis} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#8B8BA8] hover:text-[#FF6076] transition-colors">
              <Trash2 size={12} /> {tr('notis.quitarTodas')}
            </button>
          </div>
        )}

        {visibles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center"><Bell size={28} className="text-[#8B8BA8]" /></div>
            <p className="text-white text-xl font-bold text-display">{tr('notis.vacio')}</p>
            <p className="text-[#A0A0B8] text-sm max-w-xs">{tr('notis.vacioTexto')}</p>
          </div>
        ) : visibles.map((n, i) => {
          // Separadores Hoy / Anteriores según la marca temporal relativa
          const esHoy = (c: string) => c === 'ahora' || c.includes('min') || (c.includes('h') && !c.includes('ayer'))
          const cabecera = (i === 0 && esHoy(n.cuando)) ? tr('notis.hoy')
            : (!esHoy(n.cuando) && (i === 0 || esHoy(visibles[i - 1].cuando))) ? tr('notis.anteriores')
            : null
          return (
            <div key={n.id}>
              {cabecera && <p className={`eyebrow eyebrow-muted ${i === 0 ? 'mb-2' : 'pt-3 mb-2'}`}>{cabecera}</p>}
              <NotiItem n={n} i={i} descartarLabel={tr('notis.descartar')} onDescartar={() => descartarNoti(n.id)} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Una notificación descartable (R1): swipe lateral en móvil y X al pasar el
// ratón en PC. El swipe solo se apropia del gesto si es claramente horizontal
// (así no roba el scroll vertical de la lista).
function NotiItem({ n, i, onDescartar, descartarLabel }: { n: Notificacion; i: number; onDescartar: () => void; descartarLabel: string }) {
  const { t: tr } = useT()
  const { icon: Icon, color } = ICONO[n.tipo] ?? ICONO.sistema
  // i18n (F9): si la noti trae claves, se traduce EN VIVO al idioma activo (con
  // {params}); si no (notis legacy persistidas) o la clave ya no existe, se
  // pinta el string guardado.
  const tituloTr = n.tituloKey ? tr(n.tituloKey as ClaveI18n) : null
  const cuerpoTr = n.cuerpoKey ? tr(n.cuerpoKey as ClaveI18n) : null
  const titulo = tituloTr && tituloTr !== n.tituloKey ? conParams(tituloTr, n.params) : n.titulo
  const cuerpo = cuerpoTr && cuerpoTr !== n.cuerpoKey ? conParams(cuerpoTr, n.params) : n.cuerpo
  const [dx, setDx] = useState(0)
  const [saliendo, setSaliendo] = useState(false)
  const gesto = useRef<{ x: number; y: number; eje: 'h' | 'v' | null } | null>(null)
  // El desplazamiento vive también en un ref: touchend puede llegar antes del
  // re-render y el estado `dx` de su closure estaría desfasado.
  const dxRef = useRef(0)

  const onTouchStart = (e: React.TouchEvent) => {
    gesto.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, eje: null }
  }
  const onTouchMove = (e: React.TouchEvent) => {
    const g = gesto.current
    if (!g) return
    const mx = e.touches[0].clientX - g.x
    const my = e.touches[0].clientY - g.y
    if (g.eje === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) g.eje = Math.abs(mx) > Math.abs(my) ? 'h' : 'v'
    if (g.eje === 'h') { dxRef.current = mx; setDx(mx) }
  }
  const onTouchEnd = () => {
    const g = gesto.current
    gesto.current = null
    if (g?.eje === 'h' && Math.abs(dxRef.current) > 90) {
      setSaliendo(true)
      setTimeout(onDescartar, 180)
    } else {
      dxRef.current = 0
      setDx(0)
    }
  }

  const arrastrando = gesto.current?.eje === 'h'
  const inner = (
    <div
      data-noti={n.id}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      className={`group relative flex items-start gap-3 rounded-2xl border px-4 py-3 transition-colors stagger-item ${n.href ? 'card-int' : ''} ${n.leida ? 'bg-white/[0.03] border-white/8' : 'bg-white/[0.06] border-white/12'}`}
      style={{
        ['--delay' as string]: `${Math.min(i, 10) * 55}ms`,
        transform: `translateX(${saliendo ? (dx < 0 ? -560 : 560) : dx}px)`,
        opacity: saliendo ? 0 : 1 - Math.min(Math.abs(dx) / 280, 0.6),
        transition: arrastrando ? 'none' : 'transform .18s ease, opacity .18s ease',
        touchAction: 'pan-y',
      }}
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl shrink-0 mt-0.5" style={{ background: `${color}1F`, color, border: `1px solid ${color}40` }}><Icon size={18} /></span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-white truncate">{titulo}</p>
          {!n.leida && <span className="w-2 h-2 rounded-full bg-[#B6FF3A] shrink-0" />}
        </div>
        <p className="text-[13px] text-[#B8B8CC] mt-0.5 leading-snug">{cuerpo}</p>
        <p className="text-[11px] text-[#6B6B85] mt-1">{n.cuando}</p>
      </div>
      {/* X de descarte en PC: aparece al pasar el ratón */}
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setSaliendo(true); setTimeout(onDescartar, 160) }}
        aria-label={descartarLabel}
        className="absolute top-2 right-2 z-10 hidden sm:flex h-7 w-7 rounded-full bg-white/8 border border-white/10 items-center justify-center text-[#8B8BA8] hover:text-white hover:bg-white/15 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
      >
        <X size={13} />
      </button>
    </div>
  )
  return n.href ? <Link href={n.href} className="block">{inner}</Link> : inner
}
