'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDemoStore, type NotiTipo } from '@/lib/stores/useDemoStore'
import { ArrowLeft, Swords, AlertTriangle, Users, Trophy, Bell, Ticket, CheckCheck } from 'lucide-react'

const ICONO: Record<NotiTipo, { icon: React.ElementType; color: string }> = {
  combate:      { icon: Swords, color: '#B6FF3A' },
  disputa:      { icon: AlertTriangle, color: '#FF6076' },
  lleno:        { icon: Users, color: '#FF8A5C' },
  'nuevo-torneo': { icon: Trophy, color: '#4F8EF7' },
  sistema:      { icon: Bell, color: '#9B82FF' },
  inscripcion:  { icon: Ticket, color: '#E0BE63' },
}

export default function NotificacionesPage() {
  const router = useRouter()
  const notis = useDemoStore(s => s.notificaciones)
  const marcarLeidas = useDemoStore(s => s.marcarLeidas)
  const noLeidas = notis.filter(n => !n.leida).length

  useEffect(() => {
    const t = setTimeout(() => marcarLeidas(), 1200)
    return () => clearTimeout(t)
  }, [marcarLeidas])

  return (
    <div className="relative min-h-screen pb-10">
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 safe-top sticky top-0 z-10 bg-[#0D0F15]/92 backdrop-blur-md border-b border-white/6">
        <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold">Bandeja</p>
          <p className="text-base font-bold text-white">Notificaciones {noLeidas > 0 && <span className="text-[#B6FF3A]">· {noLeidas}</span>}</p>
        </div>
        {noLeidas > 0 && (
          <button onClick={marcarLeidas} className="inline-flex items-center gap-1 text-xs text-[#B6FF3A] font-semibold"><CheckCheck size={14} /> Leídas</button>
        )}
      </div>

      <div className="px-4 pt-4 space-y-2">
        {notis.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center"><Bell size={28} className="text-[#8B8BA8]" /></div>
            <p className="text-white text-xl font-bold text-display">Sin notificaciones</p>
            <p className="text-[#A0A0B8] text-sm max-w-xs">Te avisaremos de tus combates, disputas y torneos nuevos.</p>
          </div>
        ) : notis.map(n => {
          const { icon: Icon, color } = ICONO[n.tipo]
          const inner = (
            <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition-colors ${n.leida ? 'bg-white/[0.03] border-white/8' : 'bg-white/[0.06] border-white/12'}`}>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl shrink-0 mt-0.5" style={{ background: `${color}1F`, color, border: `1px solid ${color}40` }}><Icon size={18} /></span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white truncate">{n.titulo}</p>
                  {!n.leida && <span className="w-2 h-2 rounded-full bg-[#B6FF3A] shrink-0" />}
                </div>
                <p className="text-[13px] text-[#B8B8CC] mt-0.5 leading-snug">{n.cuerpo}</p>
                <p className="text-[11px] text-[#6B6B85] mt-1">{n.cuando}</p>
              </div>
            </div>
          )
          return n.href ? <Link key={n.id} href={n.href} className="block">{inner}</Link> : <div key={n.id}>{inner}</div>
        })}
      </div>
    </div>
  )
}
