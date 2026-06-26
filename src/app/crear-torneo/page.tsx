'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { JUEGOS, type TorneoSample, type FormatoTorneo, type Tier } from '@/lib/torneos/sample'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { GameKeyart } from '@/components/todh/GameKeyart'
import { cn } from '@/lib/utils'
import { ArrowLeft, Calendar, Users, Lock, MapPin, Globe, Check, Eye } from 'lucide-react'

let creadoSeq = 0

const FORMATOS = ['Doble eliminación', 'Eliminación simple', 'Suizo', 'Pools → Top cut', 'Round robin']
const CIERRES = ['Al empezar', '1 hora antes', '1 día antes', 'Manual']
const REPARTOS = ['100%', '70/30', '70/20/10', '50/30/20']
const ACCESOS = [
  { id: 'abierto', label: 'Abierto', color: '#B6FF3A' },
  { id: 'oro', label: 'Oro', color: '#E0BE63' },
  { id: 'diamante', label: 'Diamante', color: '#6FD3F2' },
  { id: 'platino', label: 'Platino', color: '#C9CCD6' },
] as const

export default function CrearTorneoPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [juego, setJuego] = useState('smash')
  const [formato, setFormato] = useState(FORMATOS[0])
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('18:00')
  const [plazas, setPlazas] = useState(32)
  const [precio, setPrecio] = useState(8)
  const [acceso, setAcceso] = useState<typeof ACCESOS[number]['id']>('abierto')
  const [sala, setSala] = useState<'local' | 'online'>('local')
  const [cierre, setCierre] = useState(CIERRES[1])
  const [reparto, setReparto] = useState(REPARTOS[1])
  const [publicado, setPublicado] = useState<TorneoSample | null>(null)
  const crearTorneo = useDemoStore(s => s.crearTorneo)
  const j = JUEGOS[juego]

  function publicar() {
    if (!nombre.trim()) return
    const id = `c${Date.now().toString(36)}${creadoSeq++}`
    const fechaLabel = fecha
      ? `${new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} · ${hora}`
      : `Próximamente · ${hora}`
    const vipMap: Record<string, Tier | null> = { abierto: null, oro: 'Oro', diamante: 'Diamante', platino: 'Platino' }
    const t: TorneoSample = {
      id, nombre: nombre.trim(), juego, formato: formato as FormatoTorneo, fechaLabel,
      online: sala === 'online', local: sala === 'online' ? 'Online' : 'Tu sala', localId: sala === 'online' ? undefined : 'gamba',
      ciudad: sala === 'online' ? 'Online' : 'Madrid', distanciaKm: sala === 'online' ? 0 : 1.2,
      inscritos: 0, plazas, precio, bote: precio > 0 ? Math.round(plazas * precio * 0.8) : 0,
      enDirecto: false, vip: vipMap[acceso], organizadorId: 'lima', popularidad: 50,
      bestOf: 'Bo3', descripcion: `Torneo de ${j.nombre}. Formato ${(formato as string).toLowerCase()}. Cierre de inscripciones: ${cierre.toLowerCase()}.`,
    }
    crearTorneo(t)
    setPublicado(t)
  }

  return (
    <div className="relative min-h-screen pb-28 max-w-xl lg:max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 safe-top sticky top-0 z-10 bg-[#0C0E13]/92 backdrop-blur-md border-b border-white/6">
        <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
        <div>
          <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold">Consola del TO</p>
          <p className="text-base font-bold text-white">Crear torneo</p>
        </div>
      </div>

      {/* Vista previa en vivo */}
      <div className="px-5 pt-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#8B8BA8] font-bold mb-2">Vista previa en vivo</p>
        <div className="ring-grad card-premium card-int relative overflow-hidden rounded-2xl flex items-stretch">
          <GameKeyart juegoId={juego} className="w-[92px] shrink-0" />
          <div className="flex-1 p-3.5 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10px] font-bold" style={{ background: `${j.color}1F`, color: j.color, border: `1px solid ${j.color}44` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: j.color }} /> {j.corto}
              </span>
              {acceso !== 'abierto' && <span className="ml-auto inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/8 text-[#E0BE63] border border-[#D4A84B]/40"><Lock size={9} /> {acceso}</span>}
            </div>
            <p className="font-bold text-white text-display tracking-tight text-[15px] leading-snug truncate">{nombre || 'Nombre de tu torneo'}</p>
            <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[#A0A0B8] min-w-0">
              <span className="inline-flex items-center gap-1 text-white shrink-0"><Calendar size={11} className="text-[#B6FF3A]" /> {fecha ? new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Fecha'} · {hora}</span>
              <span className="text-[#3A3A4A]">·</span>
              <span className="inline-flex items-center gap-1">{sala === 'online' ? <Globe size={11} /> : <MapPin size={11} />} {sala === 'online' ? 'Online' : 'Tu sala'}</span>
            </div>
            <div className="mt-2.5 flex items-end justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="inline-flex items-center gap-1 text-[#8B8BA8]"><Users size={10} /> <span className="font-mono-num text-[#B8B8CC]">0/{plazas}</span></span>
                  <span className="font-semibold text-[#B6FF3A]">Abierta</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: '4%', background: `linear-gradient(90deg, ${j.color}, #C8FF5C)` }} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[8px] text-[#8B8BA8] uppercase tracking-[0.12em] font-bold">{precio > 0 ? 'Bote' : 'Entrada'}</p>
                <p className="text-[15px] font-bold text-white font-mono-num leading-none mt-0.5">{precio > 0 ? `${Math.round(plazas * precio * 0.8)}€` : 'Free'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-6">
        {/* Lo básico */}
        <Section title="Lo básico">
          <Field label="Nombre del torneo">
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Lima Smash Weekly #43"
              className="w-full h-12 px-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[#6B6B85] focus:border-[#B6FF3A]/60 outline-none transition-colors" />
          </Field>
          <Field label="Juego">
            <div className="flex flex-wrap gap-2">
              {Object.values(JUEGOS).map(g => {
                const on = juego === g.id
                return (
                  <button key={g.id} onClick={() => setJuego(g.id)}
                    className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold transition-all border"
                    style={on ? { background: `${g.color}26`, color: g.color, borderColor: `${g.color}88` } : { background: 'rgba(255,255,255,0.04)', color: '#B8B8CC', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: g.color }} /> {g.corto}
                  </button>
                )
              })}
            </div>
          </Field>
          <Field label="Formato">
            <div className="flex flex-wrap gap-2">
              {FORMATOS.map(f => (
                <Chip key={f} on={formato === f} onClick={() => setFormato(f)}>{f}</Chip>
              ))}
            </div>
          </Field>
        </Section>

        {/* Cuándo y dónde */}
        <Section title="Cuándo y dónde">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B6FF3A] pointer-events-none" />
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                  className="w-full h-12 pl-9 pr-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#B6FF3A]/60 outline-none [color-scheme:dark]" />
              </div>
            </Field>
            <Field label="Hora">
              <input type="time" value={hora} onChange={e => setHora(e.target.value)}
                className="w-full h-12 px-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#B6FF3A]/60 outline-none [color-scheme:dark]" />
            </Field>
          </div>
          <Field label="Sala">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setSala('local')} className={cn('flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-semibold border transition-all',
                sala === 'local' ? 'bg-[#B6FF3A]/12 text-white border-[#B6FF3A]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10')}>
                <MapPin size={15} /> Local físico
              </button>
              <button onClick={() => setSala('online')} className={cn('flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-semibold border transition-all',
                sala === 'online' ? 'bg-[#B6FF3A]/12 text-white border-[#B6FF3A]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10')}>
                <Globe size={15} /> Online
              </button>
            </div>
          </Field>
          <Field label="Cierre de inscripciones">
            <div className="flex flex-wrap gap-2">
              {CIERRES.map(c => <Chip key={c} on={cierre === c} onClick={() => setCierre(c)}>{c}</Chip>)}
            </div>
          </Field>
        </Section>

        {/* Plazas y precio */}
        <Section title="Plazas y precio">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plazas">
              <div className="flex items-center gap-2">
                <Stepper value={plazas} onDec={() => setPlazas(p => Math.max(4, p - 4))} onInc={() => setPlazas(p => p + 4)} icon={<Users size={14} />} />
              </div>
            </Field>
            <Field label="Inscripción (€)">
              <div className="flex items-center gap-2">
                <Stepper value={precio} onDec={() => setPrecio(p => Math.max(0, p - 1))} onInc={() => setPrecio(p => p + 1)} suffix={precio === 0 ? 'Gratis' : '€'} />
              </div>
            </Field>
          </div>
          <p className="text-[11px] text-[#8B8BA8]">Comisión TODH: 6% hasta 32, 5% hasta 128, 4% por encima. Gratis → sin comisión.</p>
        </Section>

        {/* Premios */}
        <Section title="Premios (bote por % de inscripciones)">
          <div className="flex flex-wrap gap-2">
            {REPARTOS.map(r => <Chip key={r} on={reparto === r} onClick={() => setReparto(r)}>{r}</Chip>)}
          </div>
          {precio > 0 && (
            <p className="text-[12px] text-[#B8B8CC]">Bote estimado a llenar: <span className="text-[#B6FF3A] font-bold">{Math.round(plazas * precio * 0.8)}€</span></p>
          )}
        </Section>

        {/* Acceso */}
        <Section title="Acceso">
          <div className="flex flex-wrap gap-2">
            {ACCESOS.map(a => {
              const on = acceso === a.id
              return (
                <button key={a.id} onClick={() => setAcceso(a.id)}
                  className="inline-flex items-center gap-1.5 px-3 h-10 rounded-xl text-sm font-semibold transition-all border"
                  style={on ? { background: `${a.color}22`, color: a.color, borderColor: `${a.color}77` } : { background: 'rgba(255,255,255,0.04)', color: '#B8B8CC', borderColor: 'rgba(255,255,255,0.08)' }}>
                  {a.id !== 'abierto' && <Lock size={12} />} {a.label}
                </button>
              )
            })}
          </div>
        </Section>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-5 pt-3 safe-bottom bg-gradient-to-t from-[#0C0E13] via-[#0C0E13] to-transparent">
        <div className="max-w-lg mx-auto">
          <button onClick={publicar} className="w-full h-14 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold text-[15px] shadow-[0_10px_30px_-8px_rgba(182,255,58,0.5)] active:scale-[0.99] transition-transform disabled:opacity-50"
            disabled={!nombre.trim()}>
            Publicar torneo de {j.corto}
          </button>
        </div>
      </div>

      {/* Éxito */}
      {publicado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />
          <div className="relative w-full max-w-sm card-premium p-6 text-center animate-pop">
            <div className="h-16 w-16 mx-auto rounded-full bg-[#B6FF3A]/15 border border-[#B6FF3A]/40 flex items-center justify-center"><Check size={32} className="text-[#B6FF3A]" /></div>
            <p className="mt-4 text-xl font-bold text-white text-display">¡Torneo publicado!</p>
            <p className="mt-1.5 text-sm text-[#B8B8CC]">«{publicado.nombre}» ya es visible en Explorar y tu comunidad recibirá el aviso.</p>
            <div className="mt-5 space-y-2">
              <Link href={`/torneo/${publicado.id}`} className="w-full h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-bold flex items-center justify-center gap-2"><Eye size={16} /> Ver la ficha</Link>
              <Link href="/explorar" className="w-full h-12 rounded-xl bg-white/8 text-white font-semibold flex items-center justify-center">Ir a Explorar</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <p className="eyebrow eyebrow-muted">{title}</p>
      {children}
    </section>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-semibold text-[#B8B8CC]">{label}</label>
      {children}
    </div>
  )
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn('px-3 h-9 rounded-xl text-xs font-semibold transition-all border',
      on ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border-[#B6FF3A]/45' : 'bg-white/4 text-[#B8B8CC] border-white/10 hover:text-white')}>
      {children}
    </button>
  )
}
function Stepper({ value, onDec, onInc, suffix, icon }: { value: number; onDec: () => void; onInc: () => void; suffix?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center w-full h-12 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <button onClick={onDec} className="h-full px-3.5 text-lg font-bold text-[#B8B8CC] hover:text-white hover:bg-white/5">−</button>
      <span className="flex-1 text-center text-white font-bold text-numeric inline-flex items-center justify-center gap-1">{icon}{suffix === 'Gratis' ? 'Gratis' : <>{value}{suffix ? <span className="text-[#8B8BA8] text-sm ml-0.5">{suffix}</span> : ''}</>}</span>
      <button onClick={onInc} className="h-full px-3.5 text-lg font-bold text-[#B8B8CC] hover:text-white hover:bg-white/5">+</button>
    </div>
  )
}
