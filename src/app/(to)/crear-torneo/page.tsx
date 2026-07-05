'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { JUEGOS, LOCALES, FORMATOS_SUGERIDOS, type TorneoSample, type Tier, type Juego, type Local } from '@/lib/torneos/sample'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { useT } from '@/lib/i18n'
import { GameKeyart, TorneoArt } from '@/components/todh/GameKeyart'
import { BannerPicker } from '@/components/todh/BannerPicker'
import { cn } from '@/lib/utils'
import { ArrowLeft, Calendar, Users, Lock, MapPin, Globe, Check, Eye, Plus, Search, X, Star, Map as MapIcon, ImagePlus } from 'lucide-react'

let creadoSeq = 0

const CIERRES = ['Al empezar', '1 hora antes', '1 día antes', 'Manual']
const REPARTOS = ['100%', '70/30', '70/20/10', '50/30/20']
const ACCESOS = [
  { id: 'abierto', label: 'Abierto', color: '#B6FF3A' },
  { id: 'oro', label: 'Oro', color: '#E0BE63' },
  { id: 'diamante', label: 'Diamante', color: '#6FD3F2' },
  { id: 'platino', label: 'Platino', color: '#C9CCD6' },
] as const

// Distancia de muestra a cada sede (con backend real sale de la geolocalización).
const DIST_KM: Record<string, number> = { gamba: 1.2, dragon: 2.6, cardkingdom: 3.1, arcade: 4.8, respawn: 5.4 }

const EMOJIS_JUEGO = ['🎮', '🕹️', '🎲', '🃏', '♟️', '⚽', '🏓', '🎯', '🧩', '🤖']
const COLORES_JUEGO = ['#FF7A5C', '#5CC8FF', '#C05CFF', '#3FA65C', '#FF5CA8', '#E0BE63']

// Fotos de muestra para premios en producto (sobres, merch, periféricos…).
const PREMIOS_PRESET = [
  'https://images.unsplash.com/photo-1606167668584-78701c57f13d?w=600&q=80',
  'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600&q=80',
  'https://images.unsplash.com/photo-1615680022647-99c397cbcaea?w=600&q=80',
  'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&q=80',
]

export default function CrearTorneoPage() {
  const { t: tr } = useT()
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [juego, setJuego] = useState('smash')
  const [formato, setFormato] = useState('Doble eliminación')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('18:00')
  const [plazas, setPlazas] = useState(32)
  const [precio, setPrecio] = useState(8)
  const [acceso, setAcceso] = useState<typeof ACCESOS[number]['id']>('abierto')
  const [sala, setSala] = useState<'local' | 'online'>('local')
  const [sedeId, setSedeId] = useState<string | null>(null)
  const [pickerSede, setPickerSede] = useState(false)
  const [cierre, setCierre] = useState(CIERRES[1])
  const [reparto, setReparto] = useState(REPARTOS[1])
  const [comentarios, setComentarios] = useState('')
  const [premiosImgs, setPremiosImgs] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [banner, setBanner] = useState<string | undefined>(undefined)
  const [nuevoJuego, setNuevoJuego] = useState(false)
  const [publicado, setPublicado] = useState<TorneoSample | null>(null)
  const crearTorneo = useDemoStore(s => s.crearTorneo)
  const juegosCustom = useDemoStore(s => s.juegosCustom)
  // juegosCustom en la dependencia: al añadir un juego la lista se recalcula.
  const juegos = useMemo(() => Object.values(JUEGOS), [juegosCustom])
  const j = JUEGOS[juego]
  const sede = sedeId ? LOCALES[sedeId] : null

  function publicar() {
    if (!nombre.trim()) return
    // La sede debe admitir el aforo del torneo: si no llega, se obliga a cambiarla.
    if (sala === 'local' && (!sede || sede.aforo < plazas)) { setPickerSede(true); return }
    const id = `c${Date.now().toString(36)}${creadoSeq++}`
    const fechaLabel = fecha
      ? `${new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} · ${hora}`
      : `Próximamente · ${hora}`
    const vipMap: Record<string, Tier | null> = { abierto: null, oro: 'Oro', diamante: 'Diamante', platino: 'Platino' }
    const t: TorneoSample = {
      id, nombre: nombre.trim(), juego, formato: formato.trim() || 'Formato por anunciar', fechaLabel,
      online: sala === 'online',
      local: sala === 'online' ? 'Online' : sede!.nombre, localId: sala === 'online' ? undefined : sede!.id,
      ciudad: sala === 'online' ? 'Online' : sede!.ciudad, distanciaKm: sala === 'online' ? 0 : (DIST_KM[sede!.id] ?? 2),
      inscritos: 0, plazas, precio, bote: precio > 0 ? Math.round(plazas * precio * 0.8) : 0,
      enDirecto: false, vip: vipMap[acceso], organizadorId: 'lima', popularidad: 50,
      bestOf: 'Bo3', descripcion: `Torneo de ${j.nombre}. Formato: ${formato.trim() || 'por anunciar'}. Cierre de inscripciones: ${cierre.toLowerCase()}.`,
      comentarios: comentarios.trim() || undefined,
      premiosImgs: premiosImgs.length ? premiosImgs : undefined,
      videoUrl: videoUrl.trim() || undefined,
      banner,
    }
    crearTorneo(t)
    setPublicado(t)
  }

  return (
    <div className="relative min-h-screen pb-28 lg:pb-16 max-w-xl lg:max-w-6xl mx-auto lg:mx-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 safe-top sticky top-0 z-10 bg-[#0D0F15]/92 backdrop-blur-md border-b border-white/6">
        <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
        <div>
          <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold">Consola del TO</p>
          <p className="text-base font-bold text-white">{tr('ct.titulo')}</p>
        </div>
      </div>

      {/* Escritorio: formulario a la izquierda + vista previa sticky a la derecha.
          Móvil: vista previa arriba y formulario en columna. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10 lg:px-8 lg:items-start lg:mt-6">
      {/* Vista previa en vivo */}
      <div className="px-5 pt-4 lg:px-0 lg:pt-0 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#8B8BA8] font-bold mb-2">{tr('ct.vistaPrevia')}</p>
        <div className="ring-grad card-premium card-int relative overflow-hidden rounded-2xl flex items-stretch">
          <TorneoArt t={{ juego, banner }} className="w-[92px] shrink-0" />
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
              <span className="inline-flex items-center gap-1 truncate">{sala === 'online' ? <Globe size={11} /> : <MapPin size={11} />} {sala === 'online' ? 'Online' : sede?.nombre || 'Elige sede'}</span>
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
        {/* Publicar (solo escritorio; en móvil está la CTA fija) */}
        <button onClick={publicar} disabled={!nombre.trim()}
          className="hidden lg:flex mt-4 w-full h-13 py-3.5 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold text-[15px] shadow-[0_10px_30px_-8px_rgba(182,255,58,0.5)] items-center justify-center disabled:opacity-50">
          {tr('ct.publicar')} {j.corto}
        </button>
      </div>

      <div className="px-5 pt-5 space-y-6 lg:px-0 lg:pt-0 lg:col-start-1 lg:row-start-1">
        {/* Lo básico */}
        <Section title={tr('ct.basico')}>
          <Field label="Nombre del torneo">
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Lima Smash Weekly #43"
              className="w-full h-12 px-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[#6B6B85] focus:border-[#B6FF3A]/60 outline-none transition-colors" />
          </Field>
          <Field label="Juego">
            <div className="flex flex-wrap gap-2">
              {juegos.map(g => {
                const on = juego === g.id
                return (
                  <button key={g.id} onClick={() => setJuego(g.id)}
                    className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold transition-all border"
                    style={on ? { background: `${g.color}26`, color: g.color, borderColor: `${g.color}88` } : { background: 'rgba(255,255,255,0.04)', color: '#B8B8CC', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: g.color }} /> {g.corto}
                  </button>
                )
              })}
              <button onClick={() => setNuevoJuego(v => !v)}
                className={cn('inline-flex items-center gap-1 px-3 h-9 rounded-xl text-xs font-bold border border-dashed transition-all',
                  nuevoJuego ? 'border-[#B6FF3A]/60 text-[#B6FF3A] bg-[#B6FF3A]/8' : 'border-white/20 text-[#B8B8CC] hover:text-white')}>
                <Plus size={13} /> {tr('ct.anadirJuego')}
              </button>
            </div>
            {nuevoJuego && <NuevoJuegoForm onCreado={id => { setJuego(id); setNuevoJuego(false) }} />}
          </Field>
          <Field label="Formato (texto libre — cada juego tiene los suyos)">
            <input value={formato} onChange={e => setFormato(e.target.value)} placeholder="Ej. Suizo 6 rondas + top 8, Bo3"
              className="w-full h-12 px-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[#6B6B85] focus:border-[#B6FF3A]/60 outline-none transition-colors" />
            <div className="flex flex-wrap gap-2 mt-2">
              {FORMATOS_SUGERIDOS.map(f => (
                <Chip key={f} on={formato === f} onClick={() => setFormato(f)}>{f}</Chip>
              ))}
            </div>
          </Field>
        </Section>

        {/* Imagen / banner del torneo */}
        <Section title={tr('ct.imagen')}>
          <BannerPicker juegoId={juego} value={banner} onChange={setBanner} />
        </Section>

        {/* Cuándo y dónde */}
        <Section title={tr('ct.cuandoDonde')}>
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
              <button onClick={() => { setSala('local'); if (!sede) setPickerSede(true) }} className={cn('flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-semibold border transition-all',
                sala === 'local' ? 'bg-[#B6FF3A]/12 text-white border-[#B6FF3A]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10')}>
                <MapPin size={15} /> Sede física
              </button>
              <button onClick={() => setSala('online')} className={cn('flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-semibold border transition-all',
                sala === 'online' ? 'bg-[#B6FF3A]/12 text-white border-[#B6FF3A]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10')}>
                <Globe size={15} /> Online
              </button>
            </div>
            {/* Sede asignada como perfil de la app (tipo contacto) */}
            {sala === 'local' && (
              sede ? (
                <div className={`mt-2 card-premium p-3 ${sede.aforo < plazas ? 'border border-[#FF6B6B]/50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-[#0A0A0F] font-black" style={{ background: sede.color }}>{sede.nombre[0]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{sede.nombre}</p>
                      <p className="text-[11px] text-[#8B8BA8]">{sede.zona} · aforo <span className="font-mono-num">{sede.aforo}</span> · {sede.setups} setups · <span className="text-[#E0BE63]">★ {sede.rating}</span> · desde <span className="font-mono-num">{sede.precioNoche}€</span>/noche</p>
                    </div>
                    <button onClick={() => setPickerSede(true)} className="h-9 px-3 rounded-lg bg-white/8 text-white text-xs font-bold shrink-0">Cambiar</button>
                  </div>
                  {sede.aforo < plazas && (
                    <p className="mt-2 text-[11px] font-bold text-[#FF8A8A]">Esta sede admite {sede.aforo} personas y tu torneo es de {plazas}. Elige otra sede o baja las plazas.</p>
                  )}
                </div>
              ) : (
                <button onClick={() => setPickerSede(true)} className="mt-2 w-full h-12 rounded-xl border border-dashed border-white/20 text-[#B8B8CC] text-sm font-semibold flex items-center justify-center gap-2 hover:text-white transition-colors">
                  <Search size={15} /> {tr('ct.elegirSede')}
                </button>
              )
            )}
          </Field>
          <Field label="Cierre de inscripciones">
            <div className="flex flex-wrap gap-2">
              {CIERRES.map(c => <Chip key={c} on={cierre === c} onClick={() => setCierre(c)}>{c}</Chip>)}
            </div>
          </Field>
        </Section>

        {/* Plazas y precio */}
        <Section title={tr('ct.plazasPrecio')}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plazas">
              <div className="flex items-center gap-2">
                <Stepper value={plazas} onDec={() => setPlazas(p => Math.max(4, p - 4))} onInc={() => setPlazas(p => precio === 0 ? Math.min(32, p + 4) : p + 4)} icon={<Users size={14} />} />
              {precio === 0 && plazas >= 32 && (
                <p className="mt-1.5 text-[11px] text-[#E0BE63] font-semibold">Torneos gratis: hasta 32 plazas. Los tiers de TO (Oro/Platino/Diamante) desbloquean brackets más grandes.</p>
              )}
              </div>
            </Field>
            <Field label="Inscripción (€)">
              <div className="flex items-center gap-2">
                <Stepper value={precio} onDec={() => setPrecio(p => { const np = Math.max(0, p - 1); if (np === 0) setPlazas(pl => Math.min(32, pl)); return np })} onInc={() => setPrecio(p => p + 1)} suffix={precio === 0 ? 'Gratis' : '€'} />
              </div>
            </Field>
          </div>
          <p className="text-[11px] text-[#8B8BA8]">Comisión Tourneum sobre el jugador: 6% hasta 32 plazas · 8% hasta 128 · 10% en majors (la app aporta más cuanto más grande). Gratis → sin comisión.</p>
        </Section>

        {/* Premios */}
        <Section title={tr('ct.premios')}>
          <div className="flex flex-wrap gap-2">
            {REPARTOS.map(r => <Chip key={r} on={reparto === r} onClick={() => setReparto(r)}>{r}</Chip>)}
          </div>
          {precio > 0 && (
            <p className="text-[12px] text-[#B8B8CC]">Bote estimado a llenar: <span className="text-[#B6FF3A] font-bold">{Math.round(plazas * precio * 0.8)}€</span></p>
          )}
        </Section>

        {/* Vídeo o directo del torneo */}
        <Section title={tr('ct.videoDirecto')}>
          <Field label="URL de YouTube o Twitch — se verá incrustado en la ficha del torneo">
            <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} type="url"
              placeholder="Ej. https://youtube.com/watch?v=… o https://twitch.tv/tucanal"
              className="w-full h-12 px-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-[#6B6B85] focus:border-[#B6FF3A]/60 outline-none transition-colors" />
            <p className="text-[11px] text-[#8B8BA8]">Vale un tráiler, el VOD de la edición anterior o el canal donde emitirás el directo.</p>
          </Field>
        </Section>

        {/* Otros comentarios + premios en producto */}
        <Section title={tr('ct.comentarios')}>
          <Field label="Reglas extra, premios en producto, avisos…">
            <textarea value={comentarios} onChange={e => setComentarios(e.target.value)} rows={3}
              placeholder="Ej. Al top 4 también le caen 2 cajas de sobres de la colección nueva. Trae tu mando."
              className="w-full px-3.5 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-[#6B6B85] focus:border-[#B6FF3A]/60 outline-none transition-colors resize-none" />
          </Field>
          <Field label="Fotos de los premios en producto">
            <div className="grid grid-cols-4 gap-2">
              {PREMIOS_PRESET.map(url => {
                const on = premiosImgs.includes(url)
                return (
                  <button key={url} onClick={() => setPremiosImgs(p => on ? p.filter(u => u !== url) : [...p, url])}
                    className={cn('relative aspect-square rounded-xl overflow-hidden border-2 transition-all', on ? 'border-[#B6FF3A]' : 'border-white/10 opacity-80 hover:opacity-100')}>
                    { /* eslint-disable-next-line @next/next/no-img-element */ }
                    <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    {on && <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-[#B6FF3A] text-[#0A0A0F] flex items-center justify-center"><Check size={12} /></span>}
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-[#8B8BA8] flex items-center gap-1"><ImagePlus size={12} /> En la versión real subirás tus propias fotos; en la demo elige de la galería.</p>
          </Field>
        </Section>

        {/* Acceso */}
        <Section title={tr('ct.acceso')}>
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
      </div>{/* fin grid escritorio */}

      {/* CTA (móvil/tablet) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-4 pb-5 pt-3 safe-bottom bg-gradient-to-t from-[#0D0F15] via-[#0D0F15] to-transparent">
        <div className="max-w-lg mx-auto">
          <button onClick={publicar} className="w-full h-14 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold text-[15px] shadow-[0_10px_30px_-8px_rgba(182,255,58,0.5)] active:scale-[0.99] transition-transform disabled:opacity-50"
            disabled={!nombre.trim()}>
            {tr('ct.publicar')} {j.corto}
          </button>
        </div>
      </div>

      {/* Selector de sede (perfil de local de la app) */}
      {pickerSede && (
        <SedePicker
          plazas={plazas}
          onClose={() => setPickerSede(false)}
          onPick={l => { setSedeId(l.id); setSala('local'); setPickerSede(false) }}
        />
      )}

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

// Alta de un juego no contemplado en la app: nombre + icono; el color se asigna solo.
function NuevoJuegoForm({ onCreado }: { onCreado: (id: string) => void }) {
  const crearJuego = useDemoStore(s => s.crearJuego)
  const juegosCustom = useDemoStore(s => s.juegosCustom)
  const [nombre, setNombre] = useState('')
  const [emoji, setEmoji] = useState(EMOJIS_JUEGO[0])

  function crear() {
    const limpio = nombre.trim()
    if (!limpio) return
    const id = 'cj-' + limpio.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const color = COLORES_JUEGO[Object.keys(juegosCustom).length % COLORES_JUEGO.length]
    const j: Juego = { id, nombre: limpio, corto: limpio.length > 14 ? limpio.slice(0, 12) + '…' : limpio, color, emoji }
    crearJuego(j)
    onCreado(id)
  }

  return (
    <div className="mt-2 card-premium p-3.5 space-y-3 animate-slide-up-sm">
      <p className="text-[11px] text-[#8B8BA8]">¿Tu juego no está en la lista? Añádelo y organiza igualmente: el catálogo oficial crece con lo que la comunidad organiza.</p>
      <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del juego · Ej. Guilty Gear Strive" autoFocus
        onKeyDown={e => { if (e.key === 'Enter') crear() }}
        className="w-full h-11 px-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-[#6B6B85] focus:border-[#B6FF3A]/60 outline-none" />
      <div className="flex items-center gap-1.5 flex-wrap">
        {EMOJIS_JUEGO.map(e => (
          <button key={e} onClick={() => setEmoji(e)}
            className={cn('h-9 w-9 rounded-lg text-lg flex items-center justify-center border transition-all', emoji === e ? 'border-[#B6FF3A]/70 bg-[#B6FF3A]/12' : 'border-white/10 bg-white/4')}>
            {e}
          </button>
        ))}
      </div>
      <button onClick={crear} disabled={!nombre.trim()}
        className="w-full h-10 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold disabled:opacity-40">
        Añadir «{nombre.trim() || 'juego'}»
      </button>
    </div>
  )
}

// Selector de sede: perfiles de local de la app, como asignar un contacto.
function SedePicker({ plazas, onClose, onPick }: { plazas: number; onClose: () => void; onPick: (l: Local) => void }) {
  const [q, setQ] = useState('')
  // Solo se ofrecen sedes cuyo AFORO admite las plazas configuradas del torneo.
  const conAforo = Object.values(LOCALES).filter(l => l.aforo >= plazas)
  const excluidas = Object.keys(LOCALES).length - conAforo.length
  const locales = conAforo.filter(l =>
    (l.nombre + ' ' + l.zona).toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#141822] px-5 pt-4 pb-3 z-10 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[15px] font-bold text-white">Elige la sede</p>
              <p className="text-[11px] text-[#8B8BA8]">Con aforo para <span className="text-[#B6FF3A] font-bold font-mono-num">{plazas}</span> jugadores{excluidas > 0 ? ` · ${excluidas} ${excluidas === 1 ? 'local oculto' : 'locales ocultos'} por aforo` : ''}</p>
            </div>
            <button onClick={onClose} aria-label="Cerrar" className="h-8 w-8 rounded-full bg-white/8 flex items-center justify-center text-[#B8B8CC]"><X size={16} /></button>
          </div>
          <div className="mt-3 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8BA8]" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar local o zona…" autoFocus
              className="w-full h-11 pl-9 pr-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none" />
          </div>
        </div>
        <div className="px-4 py-3 space-y-1.5">
          {locales.map(l => (
            <button key={l.id} onClick={() => onPick(l)}
              className="w-full flex items-center gap-3 card-premium card-int p-3 text-left">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-[#0A0A0F] font-black text-lg shrink-0" style={{ background: l.color }}>{l.nombre[0]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{l.nombre}</p>
                <p className="text-[11px] text-[#8B8BA8]">{l.zona} · aforo <span className="font-mono-num text-white">{l.aforo}</span> · {l.setups} setups · <span className="inline-flex items-center gap-0.5 text-[#E0BE63]"><Star size={9} className="fill-[#E0BE63]" /> {l.rating}</span></p>
              </div>
              <span className="text-[11px] font-bold text-[#B6FF3A] font-mono-num shrink-0">{l.precioNoche}€/noche</span>
            </button>
          ))}
          {locales.length === 0 && <p className="text-center text-sm text-[#8B8BA8] py-6">Ninguna sede admite {plazas} jugadores con esa búsqueda. Baja las plazas o descubre más sedes en el mapa.</p>}
          <Link href="/mapa" className="w-full h-11 rounded-xl border border-dashed border-white/20 text-[#B8B8CC] text-sm font-semibold flex items-center justify-center gap-2 hover:text-white transition-colors">
            <MapIcon size={15} /> Descubrir sedes en el mapa
          </Link>
        </div>
      </div>
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
