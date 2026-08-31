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
import { ArrowLeft, Swords, AlertTriangle, Users, Trophy, Bell, Ticket, Trash2, X } from '@/components/todh/iconosTorneum'
import { BellOff, CheckCheck, TrendingDown } from 'lucide-react'

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

  // ── Swipe NATIVO (pedido 31-08, estilo iPhone/Android): la tarjeta acompaña
  // al dedo (o al ratón) revelando un fondo rojo con papelera; al pasar el
  // umbral sale deslizándose, se desvanece y el hueco se COLAPSA suave.
  // Pointer Events + touch-action pan-y: el navegador se queda el scroll
  // vertical y nos deja el gesto horizontal (los touch events de React son
  // pasivos y en móvil real la tarjeta no llegaba a moverse).
  const [dx, setDx] = useState(0)
  const [saliendo, setSaliendo] = useState(false)
  const [colapsando, setColapsando] = useState(false)
  const gesto = useRef<{ id: number; x: number; y: number; eje: 'h' | 'v' | null } | null>(null)
  const dxRef = useRef(0)
  const cajaRef = useRef<HTMLDivElement>(null)

  const descartar = (dir: 1 | -1) => {
    setSaliendo(true)
    setDx(dir * 560)
    // Fase 2: colapsar la altura para que la lista se cierre como en nativo
    setTimeout(() => setColapsando(true), 160)
    setTimeout(onDescartar, 380)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (saliendo) return
    gesto.current = { id: e.pointerId, x: e.clientX, y: e.clientY, eje: null }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesto.current
    if (!g || g.id !== e.pointerId) return
    const mx = e.clientX - g.x
    const my = e.clientY - g.y
    if (g.eje === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) {
      g.eje = Math.abs(mx) > Math.abs(my) ? 'h' : 'v'
      if (g.eje === 'h') {
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* puntero sintético (tests) */ }
      }
    }
    if (g.eje === 'h') { dxRef.current = mx; setDx(mx) }
  }
  const soltar = () => {
    const g = gesto.current
    gesto.current = null
    if (g?.eje === 'h' && Math.abs(dxRef.current) > 90) {
      descartar(dxRef.current < 0 ? -1 : 1)
    } else {
      dxRef.current = 0
      setDx(0)
    }
  }

  const arrastrando = gesto.current?.eje === 'h'
  const progreso = Math.min(Math.abs(dx) / 120, 1)
  const inner = (
    <div ref={cajaRef} className="relative overflow-hidden rounded-2xl transition-all duration-200 ease-out"
      style={colapsando ? { maxHeight: 0, opacity: 0, marginBottom: -8 } : { maxHeight: 200 }}>
      {/* Fondo rojo con papelera que se revela al arrastrar (nativo) */}
      <div aria-hidden className={`absolute inset-0 rounded-2xl bg-[#E63E54] flex items-center px-5 ${dx < 0 ? 'justify-end' : 'justify-start'}`}
        style={{ opacity: arrastrando || saliendo ? Math.max(progreso, 0.25) : 0, transition: arrastrando ? 'none' : 'opacity .18s ease' }}>
        <Trash2 size={20} className="text-white" style={{ transform: `scale(${0.7 + progreso * 0.5})` }} />
      </div>
      <div
        data-noti={n.id}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={soltar} onPointerCancel={soltar}
        className={`group relative flex items-start gap-3 rounded-2xl border px-4 py-3 transition-colors stagger-item ${n.href ? 'card-int' : ''} ${n.leida ? 'bg-[#141822] border-white/8' : 'bg-[#1A2030] border-white/12'}`}
        style={{
          ['--delay' as string]: `${Math.min(i, 10) * 55}ms`,
          transform: `translateX(${dx}px)`,
          opacity: saliendo ? 0 : 1 - Math.min(Math.abs(dx) / 400, 0.35),
          transition: arrastrando ? 'none' : 'transform .22s ease, opacity .22s ease',
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
          onClick={e => { e.preventDefault(); e.stopPropagation(); descartar(1) }}
          aria-label={descartarLabel}
          className="absolute top-2 right-2 z-10 hidden sm:flex h-7 w-7 rounded-full bg-white/8 border border-white/10 items-center justify-center text-[#8B8BA8] hover:text-white hover:bg-white/15 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
  return n.href ? <Link href={n.href} className="block" draggable={false} onClick={e => { if (Math.abs(dxRef.current) > 8) e.preventDefault() }}>{inner}</Link> : inner
}
