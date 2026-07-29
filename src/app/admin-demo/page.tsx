'use client'
import { useState } from 'react'
import { AnimatedValue } from '@/components/ui/CountUp'
import { useRouter } from 'next/navigation'
import { JUEGOS_LIST } from '@/lib/torneos/sample'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import {
  ArrowLeft, Gamepad2, Users, Store, Trophy, Wallet, BadgeCheck, ShieldAlert,
  Plus, Check, X, Settings2, KeyRound, Copy,
} from 'lucide-react'

type Juego = { id: string; nombre: string; corto: string; color: string; formatos: number; regla: string; activo: boolean }

const FORMATOS_DEF: Record<string, { formatos: number; regla: string }> = {
  smash:   { formatos: 5, regla: 'Auto-reporte por consenso' },
  magic:   { formatos: 3, regla: 'Suizo + decklist obligatoria' },
  pokemon: { formatos: 2, regla: 'City League oficial' },
  tft:     { formatos: 2, regla: 'Lobbies de 8 · puntos' },
  tekken:  { formatos: 2, regla: 'Auto-reporte por consenso' },
  sf6:     { formatos: 2, regla: 'Auto-reporte por consenso' },
  valorant: { formatos: 2, regla: 'Equipos de 5 · BO3' },
  lol:      { formatos: 2, regla: 'Equipos de 5 · BO3' },
  cod:      { formatos: 2, regla: 'Equipos de 4 · BO5' },
}
const FORMATO_FALLBACK = { formatos: 2, regla: 'Auto-reporte por consenso' }

export default function AdminDemoPage() {
  const router = useRouter()
  // Solicitud REAL de perfil de TO del usuario de la demo: aprobarla aquí le
  // activa el perfil dual (jugador + organizador) y le abre la consola.
  const perfilTO = useDemoStore(s => s.perfilTO)
  const aprobarTO = useDemoStore(s => s.aprobarTO)
  const rechazarTO = useDemoStore(s => s.rechazarTO)
  const [juegos, setJuegos] = useState<Juego[]>(
    JUEGOS_LIST.map(j => ({ id: j.id, nombre: j.nombre, corto: j.corto, color: j.color, ...(FORMATOS_DEF[j.id] ?? FORMATO_FALLBACK), activo: true }))
  )
  const [propuestas, setPropuestas] = useState([
    { id: 'p1', nombre: 'Guilty Gear Strive', to: 'Arcade Planet', color: '#FF5C8A' },
    { id: 'p2', nombre: 'Mortal Kombat 1', to: 'Respawn Bar', color: '#E0BE63' },
  ])
  const [verif, setVerif] = useState([
    { id: 'v1', tipo: 'Sede', nombre: 'Gamba Esports', extra: 'Malasaña · 24 setups' },
    { id: 'v2', tipo: 'Sede', nombre: 'Card Kingdom', extra: 'Salamanca · 16 mesas' },
  ])
  const [verOpen, setVerOpen] = useState(false)
  // Control de acceso (beta cerrada): la app entra por invitación
  const [betaCerrada, setBetaCerrada] = useState(true)
  const [codigos, setCodigos] = useState(['TOUR-B7K2', 'TOUR-M4X9'])
  const [copiado, setCopiado] = useState<string | null>(null)
  const nSedes = verif.filter(v => v.tipo === 'Sede').length
  const nOrg = (verif.filter(v => v.tipo === 'Organizador').length) + (perfilTO === 'pendiente' ? 1 : 0)
  const resolverVerif = (id: string) => setVerif(vs => vs.filter(v => v.id !== id))

  const toggle = (id: string) => setJuegos(js => js.map(j => j.id === id ? { ...j, activo: !j.activo } : j))
  const aprobar = (p: typeof propuestas[number]) => {
    setJuegos(js => [...js, { id: p.id, nombre: p.nombre, corto: p.nombre.split(' ')[0], color: p.color, formatos: 2, regla: 'Auto-reporte por consenso', activo: true }])
    setPropuestas(ps => ps.filter(x => x.id !== p.id))
  }

  return (
    <div className="relative min-h-screen pb-10 max-w-xl lg:max-w-6xl mx-auto">
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 safe-top sticky top-0 z-10 bg-[#0D0F15]/92 backdrop-blur-md border-b border-white/6">
        <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold">Panel Admin · Demo</p>
          <p className="text-base font-bold text-white">Tourneum · Plataforma</p>
        </div>
        <Settings2 size={18} className="text-[#8B8BA8]" />
      </div>

      <div className="px-5 pt-4">
        {/* KPIs plataforma */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI icon={<Trophy size={16} className="text-[#B6FF3A]" />} value="248" label="Torneos (mes)" />
          <KPI icon={<Users size={16} className="text-[#9B82FF]" />} value="6.4k" label="Jugadores" />
          <KPI icon={<Store size={16} className="text-[#4F8EF7]" />} value="12" label="Sedes activas" />
          <KPI icon={<Wallet size={16} className="text-[#E0BE63]" />} value="3.180€" label="Comisiones (mes)" />
        </div>

        {/* Control de acceso a la app (beta cerrada por invitación) */}
        <p className="eyebrow eyebrow-muted mt-6 mb-2.5">Acceso a la app</p>
        <div className="card-premium p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#4F8EF7]/15 text-[#4F8EF7]"><KeyRound size={18} /></span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Beta cerrada · acceso por invitación</p>
              <p className="text-xs text-[#8B8BA8]">{betaCerrada ? 'Solo entran cuentas con código de invitación' : 'Registro abierto: cualquiera puede crear cuenta'}</p>
            </div>
            <button onClick={() => setBetaCerrada(b => !b)} aria-label="Abrir o cerrar la beta" className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${betaCerrada ? 'bg-[#4F8EF7]' : 'bg-white/12'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${betaCerrada ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
          {betaCerrada && (
            <div className="mt-3 pt-3 border-t border-white/8">
              <div className="flex flex-wrap items-center gap-1.5">
                {codigos.map(c => (
                  <button key={c} onClick={() => { navigator.clipboard?.writeText(c); setCopiado(c); setTimeout(() => setCopiado(null), 1400) }}
                    className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-white/5 border border-white/12 font-mono text-[11px] font-bold tracking-wider text-white hover:border-[#4F8EF7]/50 transition-colors">
                    {copiado === c ? <Check size={11} className="text-[#B6FF3A]" /> : <Copy size={11} className="text-[#8B8BA8]" />} {c}
                  </button>
                ))}
                <button onClick={() => setCodigos(cs => [...cs, `TOUR-${Math.random().toString(36).slice(2, 6).toUpperCase()}`])}
                  className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-[#4F8EF7]/12 border border-[#4F8EF7]/40 text-[#4F8EF7] text-[11px] font-bold"><Plus size={12} /> Generar código</button>
              </div>
              <p className="mt-2 text-[11px] text-[#8B8BA8]">Cada código da un acceso. Los rankings se resetean al abrir el lanzamiento (avisado en la app).</p>
            </div>
          )}
        </div>

        {/* Verificación pendiente */}
        <p className="eyebrow eyebrow-muted mt-6 mb-2.5">Verificación pendiente</p>
        <div className="card-premium p-4 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5A623]/15 text-[#F5A623]"><BadgeCheck size={18} /></span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">
              {verif.length + nOrg === 0 ? 'Todo verificado' : `${nSedes ? `${nSedes} ${nSedes === 1 ? 'sede' : 'sedes'}` : ''}${nSedes && nOrg ? ' y ' : ''}${nOrg ? `${nOrg} ${nOrg === 1 ? 'organizador' : 'organizadores'}` : ''} por verificar`}
            </p>
            <p className="text-xs text-[#8B8BA8]">Revisa documentación antes de aprobar</p>
          </div>
          {(verif.length > 0 || perfilTO === 'pendiente') && (
            <button onClick={() => setVerOpen(o => !o)} className="h-9 px-4 rounded-lg bg-white/8 hover:bg-white/12 text-white text-xs font-bold transition-colors">{verOpen ? 'Cerrar' : 'Revisar'}</button>
          )}
        </div>
        {verOpen && (verif.length > 0 || perfilTO === 'pendiente') && (
          <div className="mt-2 space-y-2">
            {/* Solicitud real del usuario de la demo (perfil dual jugador → TO) */}
            {perfilTO === 'pendiente' && (
              <div className="card-premium p-3 flex items-center gap-3 border border-[#B6FF3A]/30">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#0A0A0F] font-black text-sm bg-[#B6FF3A]">T</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">Tú — jugador de la demo <span className="text-[10px] uppercase tracking-wide text-[#8B8BA8]">· Organizador</span></p>
                  <p className="text-[11px] text-[#8B8BA8] truncate">Solicitud de perfil dual · pendiente de entrevista</p>
                </div>
                <button onClick={rechazarTO} aria-label="Rechazar" className="h-8 w-8 rounded-lg bg-white/8 hover:bg-[#FF6B6B]/20 text-[#FF8A8A] flex items-center justify-center transition-colors"><X size={15} /></button>
                <button onClick={aprobarTO} aria-label="Aprobar" className="h-8 px-3 rounded-lg bg-[#B6FF3A] text-[#0A0A0F] text-xs font-bold flex items-center gap-1"><Check size={14} /> Aprobar</button>
              </div>
            )}
            {verif.map(v => (
              <div key={v.id} className="card-premium p-3 flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#0A0A0F] font-black text-sm" style={{ background: v.tipo === 'Sede' ? '#4F8EF7' : '#B6FF3A' }}>{v.nombre[0]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{v.nombre} <span className="text-[10px] uppercase tracking-wide text-[#8B8BA8]">· {v.tipo}</span></p>
                  <p className="text-[11px] text-[#8B8BA8] truncate">{v.extra}</p>
                </div>
                <button onClick={() => resolverVerif(v.id)} aria-label="Rechazar" className="h-8 w-8 rounded-lg bg-white/8 hover:bg-[#FF6B6B]/20 text-[#FF8A8A] flex items-center justify-center transition-colors"><X size={15} /></button>
                <button onClick={() => resolverVerif(v.id)} aria-label="Aprobar" className="h-8 px-3 rounded-lg bg-[#B6FF3A] text-[#0A0A0F] text-xs font-bold flex items-center gap-1"><Check size={14} /> Aprobar</button>
              </div>
            ))}
          </div>
        )}

        {/* Catálogo de juegos */}
        <div className="flex items-center justify-between mt-6 mb-2.5">
          <p className="eyebrow eyebrow-muted">Catálogo de juegos</p>
          <button className="inline-flex items-center gap-1 text-xs text-[#B6FF3A] font-semibold"><Plus size={13} /> Añadir</button>
        </div>
        <div className="space-y-2">
          {juegos.map(j => (
            <div key={j.id} className="card-premium p-3.5 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#0A0A0F] font-black shrink-0" style={{ background: j.color }}>{j.corto[0]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate flex items-center gap-1.5"><Gamepad2 size={13} style={{ color: j.color }} /> {j.nombre}</p>
                <p className="text-[11px] text-[#8B8BA8] font-mono-num">{j.formatos} formatos · {j.regla}</p>
              </div>
              <button onClick={() => toggle(j.id)} aria-label="Activar/desactivar" className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${j.activo ? 'bg-[#B6FF3A]' : 'bg-white/12'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${j.activo ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>

        {/* Propuestas de TOs */}
        <p className="eyebrow eyebrow-muted mt-6 mb-2.5">Propuestas de organizadores</p>
        <div className="space-y-2">
          {propuestas.length === 0 && <p className="text-sm text-[#8B8BA8] card-premium p-4 text-center">No hay propuestas pendientes.</p>}
          {propuestas.map(p => (
            <div key={p.id} className="card-premium p-3.5 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#0A0A0F] font-black shrink-0" style={{ background: p.color }}>{p.nombre[0]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{p.nombre}</p>
                <p className="text-[11px] text-[#8B8BA8]">Propuesto por {p.to}</p>
              </div>
              <button onClick={() => aprobar(p)} aria-label="Aprobar" className="h-9 w-9 rounded-lg bg-[#B6FF3A] text-[#0A0A0F] inline-flex items-center justify-center"><Check size={16} /></button>
              <button onClick={() => setPropuestas(ps => ps.filter(x => x.id !== p.id))} aria-label="Rechazar" className="h-9 w-9 rounded-lg bg-white/6 text-[#FF6076] inline-flex items-center justify-center"><X size={15} /></button>
            </div>
          ))}
        </div>

        {/* Inteligencia agregada (teaser) */}
        <div className="mt-6 card-premium p-4 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#9B82FF]/15 text-[#9B82FF]"><ShieldAlert size={18} /></span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Inteligencia agregada</p>
            <p className="text-xs text-[#8B8BA8]">Métricas anónimas por juego y región (RGPD) para editoras. Nunca datos personales.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function KPI({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="card-premium p-3.5">
      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center mb-2">{icon}</div>
      <AnimatedValue value={value} className="block text-2xl font-bold text-white text-display font-mono-num leading-none" />
      <p className="text-[10px] uppercase tracking-[0.12em] text-[#8B8BA8] font-semibold mt-1.5">{label}</p>
    </div>
  )
}
