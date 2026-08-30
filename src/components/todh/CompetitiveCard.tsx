'use client'
import { useState } from 'react'
import { JUEGOS, usuarioStatDe, puestoUsuario, diasSinJugar, DIAS_INACTIVIDAD, type StatUsuario } from '@/lib/torneos/sample'
import { PERSONAJES } from '@/lib/torneos/personajes'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { useEsCuentaFresca } from '@/lib/stores/useSesionStore'
import { GameKeyart } from './GameKeyart'
import { GameIcon } from '@/components/todh/GameIcon'
import { CountUp } from '@/components/ui/CountUp'
import { PersonajeIcon } from '@/components/todh/PersonajeChip'
import { Pencil, X, Check, TrendingDown } from 'lucide-react'
import { RangoChip, RangoProgreso } from '@/components/todh/RangoChip'
import { useT } from '@/lib/i18n'

export function CompetitiveCard() {
  const { t: tr } = useT()
  const juego = useDemoStore(s => s.juegoPerfil)
  const setJuego = useDemoStore(s => s.setJuegoPerfil)
  const mainsGuardados = useDemoStore(st => st.mainsPerfil[juego])
  // Contador REAL de personajes jugados (doble reporte verificado): se fusiona
  // con los mains elegidos a mano — los jugados que no son mains también salen.
  const jugados = useDemoStore(st => st.personajesJugados[juego])
  const [picker, setPicker] = useState(false)
  // Cuenta nueva (fresca): identidad competitiva desde cero — rango inicial E,
  // 0 pts, 0 sets, sin decay ni racha; los mains se eligen a mano.
  const fresca = useEsCuentaFresca()
  const STAT_CERO: StatUsuario = { rating: 0, v: 0, d: 0, mejor: '—', mains: [], racha: [] }
  // Stats desde la fuente única (sample.ts): las mismas que ve el ranking
  const s = fresca ? STAT_CERO : usuarioStatDe(juego)
  const pos = fresca ? null : puestoUsuario(juego)
  const j = JUEGOS[juego]
  const wr = s.v + s.d > 0 ? Math.round((s.v / (s.v + s.d)) * 100) : 0
  const mains = mainsGuardados ?? s.mains
  // Más jugados de verdad (por partidas verificadas) que no están entre los mains
  const extras = Object.entries(jugados ?? {})
    .sort((x, y) => y[1] - x[1])
    .filter(([nombre]) => !mains.includes(nombre))
    .slice(0, Math.max(0, 4 - mains.length))
    .map(([nombre]) => nombre)
  const pool = PERSONAJES[juego]
  const diasInact = fresca ? null : diasSinJugar(juego)

  return (
    <div className="ring-grad relative overflow-hidden rounded-2xl border border-white/8" style={{ background: '#171B25' }}>
      <GameKeyart juegoId={juego} label={false} className="absolute inset-x-0 top-0 h-24" />
      <div className="absolute inset-x-0 top-0 h-24" style={{ background: 'linear-gradient(to bottom, transparent 18%, #171B25)' }} />

      <div className="relative p-4">
        {/* Nivel cuenta (fundador + temporada), separado de la identidad por juego */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3 pb-3 border-b border-white/10">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/70 font-bold">Identidad</span>
          <div className="flex items-center gap-1.5">
            {!fresca && <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10px] font-black border border-[#E0BE63]/50 bg-[#E0BE63]/12 text-[#E0BE63]" title="Fundador de Torneum">⚡ Fundador #12</span>}
            <span className="inline-flex items-center px-2 h-6 rounded-full text-[10px] font-bold bg-white/6 text-[#8B8BA8] border border-white/10" title="Los rangos se reinician cada temporada">{tr('rk.temporada')}</span>
          </div>
        </div>
        {/* Identidad por juego. Con barra de scroll fina visible: hay más juegos
            de los que caben y sin ella en escritorio no había forma de llegar. */}
        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1.5" style={{ scrollbarWidth: 'thin' }}>
          {Object.keys(JUEGOS).map(g => {
            const on = juego === g
            const jj = JUEGOS[g]
            return (
              <button key={g} onClick={() => setJuego(g)}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-bold transition-all border"
                style={on
                  ? { background: `${jj.color}26`, color: jj.color, borderColor: `${jj.color}88` }
                  : { background: 'rgba(255,255,255,.06)', color: '#9A9AAE', borderColor: 'transparent' }}>
                <GameIcon juegoId={g} size={12} /> {jj.corto}
              </button>
            )
          })}
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#8B8BA8] font-bold mb-0.5">Rating</p>
            <p className="text-[50px] font-bold text-score leading-none" style={{ color: j.color }}><CountUp key={juego} value={s.rating} duration={1100} /></p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end">
              <RangoChip rating={s.rating} size="md" />
            </div>
            <p className="text-xs text-[#8B8BA8] mt-1.5 font-mono-num">{pos == null ? tr('cc.sinSets') : `#${pos} · ${wr}% WR`}</p>
          </div>
        </div>

        {/* Progreso hacia el siguiente rango (sistema de puntos de la reunión) */}
        <div className="mt-3"><RangoProgreso rating={s.rating} /></div>
        {/* Inactividad real (fuera «rango activo»): solo al superar 45 días sin
            jugar este juego aparece el aviso de pérdida de puntos; si no, nada. */}
        {diasInact != null && diasInact > DIAS_INACTIVIDAD && (
          <div className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-[#FFB03A]/35 bg-[#FFB03A]/10 px-3 py-2.5">
            <TrendingDown size={15} className="text-[#FFB03A] mt-0.5 shrink-0" />
            <p className="text-[11px] leading-snug text-[#D9C79A]">
              <strong className="text-[#FFB03A]">{diasInact} {tr('inact.diasSin')} {j.corto}.</strong>{' '}
              {tr('inact.decae')}
            </p>
          </div>
        )}

        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-white/4 border border-white/8 px-3 py-2">
            <p className="text-[10px] text-[#8B8BA8] uppercase tracking-wider font-semibold">{tr('mp.record')}</p>
            <p className="text-sm font-bold text-white font-mono-num">{s.v}V · {s.d}D</p>
          </div>
          <div className="rounded-xl bg-white/4 border border-white/8 px-3 py-2">
            <p className="text-[10px] text-[#8B8BA8] uppercase tracking-wider font-semibold">Mejor puesto</p>
            <p className="text-sm font-bold text-[#E0BE63]">🏆 {s.mejor}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-[#8B8BA8] uppercase tracking-wider font-semibold">Mains</span>
          {mains.map(m => (
            <span key={m} className="pl-1 pr-2.5 h-6 inline-flex items-center gap-1 rounded-full text-[11px] font-semibold bg-white/6 border border-white/10 text-[#D4D4E4]">
              <PersonajeIcon juegoId={juego} nombre={m} px={17} /> {m}
              {!!jugados?.[m] && <span className="text-[10px] text-[#8B8BA8] font-mono-num" title={`${jugados[m]} partidas verificadas`}>×{jugados[m]}</span>}
            </span>
          ))}
          {/* Jugados de verdad (reportes verificados) que no son mains elegidos */}
          {extras.map(m => (
            <span key={m} className="pl-1 pr-2.5 h-6 inline-flex items-center gap-1 rounded-full text-[11px] font-semibold bg-white/4 border border-dashed border-white/12 text-[#9A9AAE]">
              <PersonajeIcon juegoId={juego} nombre={m} px={17} /> {m}
              <span className="text-[10px] text-[#8B8BA8] font-mono-num" title={`${jugados?.[m]} partidas verificadas`}>×{jugados?.[m]}</span>
            </span>
          ))}
          {/* Sin mains todavía (cuenta nueva): CTA explícita para elegirlos */}
          {pool && mains.length === 0 && extras.length === 0 && (
            <button onClick={() => setPicker(true)}
              className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-bold bg-[#B6FF3A]/12 border border-[#B6FF3A]/40 text-[#B6FF3A] hover:bg-[#B6FF3A]/20 transition-colors">
              <Pencil size={10} /> {tr('cc.elegirMains')}
            </button>
          )}
          {pool && (mains.length > 0 || extras.length > 0) && (
            <button onClick={() => setPicker(true)} aria-label="Editar mains"
              className="h-6 w-6 rounded-full bg-white/6 border border-white/10 text-[#8B8BA8] hover:text-white flex items-center justify-center transition-colors">
              <Pencil size={11} />
            </button>
          )}
        </div>
        {picker && pool && <MainsPicker juego={juego} actuales={mains} onClose={() => setPicker(false)} />}

        {/* Racha reciente (solo con sets jugados) */}
        {s.racha.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] text-[#8B8BA8] uppercase tracking-wider font-semibold">Racha</span>
            <div className="flex items-center gap-1">
              {s.racha.map((r, i) => (
                <span key={i} className={`w-6 h-6 rounded-md inline-flex items-center justify-center text-[11px] font-black font-mono-num ${r === 'V' ? 'bg-[#2ED47A]/18 text-[#2ED47A]' : 'bg-[#FF6B6B]/18 text-[#FF6B6B]'}`}>{r}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Selector de mains con los iconos del pool del juego (máx. 3, persiste por juego).
// Con rosters grandes (Smash: 100+) hay buscador y rejilla de 4 columnas.
function MainsPicker({ juego, actuales, onClose }: { juego: string; actuales: string[]; onClose: () => void }) {
  const setMainsPerfil = useDemoStore(s => s.setMainsPerfil)
  const [sel, setSel] = useState<string[]>(actuales.filter(m => PERSONAJES[juego]?.some(p => p.nombre === m)))
  const [filtro, setFiltro] = useState('')
  const j = JUEGOS[juego]
  const todos = PERSONAJES[juego] ?? []
  const pool = filtro ? todos.filter(p => p.nombre.toLowerCase().includes(filtro.toLowerCase())) : todos
  const grande = todos.length > 15

  const toggle = (nombre: string) => setSel(prev =>
    prev.includes(nombre) ? prev.filter(x => x !== nombre) : prev.length >= 3 ? prev : [...prev, nombre])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-sm sm:max-w-md bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#141822] px-5 pt-4 pb-3 z-10 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[15px] font-bold text-white">Tus mains de {j?.corto ?? juego}</p>
              <p className="text-[11px] text-[#8B8BA8]">Elige hasta 3 · se muestran en tu perfil y ranking</p>
            </div>
            <button onClick={onClose} aria-label="Cerrar" className="h-8 w-8 rounded-full bg-white/8 flex items-center justify-center text-[#B8B8CC]"><X size={16} /></button>
          </div>
          {grande && (
            <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder={`Buscar entre ${todos.length}…`} autoFocus
              className="mt-2.5 w-full h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none" />
          )}
        </div>
        <div className={`px-4 py-4 grid gap-2 ${grande ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {pool.length === 0 && <p className="col-span-full text-center text-sm text-[#8B8BA8] py-6">Sin resultados para «{filtro}».</p>}
          {pool.map(p => {
            const on = sel.includes(p.nombre)
            return (
              <button key={p.nombre} onClick={() => toggle(p.nombre)}
                className="flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all"
                style={on
                  ? { background: `${p.color}1A`, borderColor: `${p.color}77` }
                  : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <PersonajeIcon juegoId={juego} nombre={p.nombre} px={34} />
                <span className={`text-[11px] font-bold leading-tight text-center ${on ? 'text-white' : 'text-[#B8B8CC]'}`}>{p.nombre}</span>
                {on && <Check size={12} className="text-[#B6FF3A]" />}
              </button>
            )
          })}
        </div>
        <div className="sticky bottom-0 bg-[#141822] px-4 pb-5 pt-2 border-t border-white/5">
          <button onClick={() => { setMainsPerfil(juego, sel); onClose() }} disabled={sel.length === 0}
            className="w-full h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-bold disabled:opacity-40">
            Guardar {sel.length ? `(${sel.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
