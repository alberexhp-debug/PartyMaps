'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  UserPlus, Users, Share2, Check, X, Trash2, Plus, Crown, ArrowLeft,
  MessagesSquare, Send, Search, Swords, ChevronRight, Megaphone, BellPlus,
} from 'lucide-react'
import { JUEGOS, JUEGOS_LIST, ORGANIZADORES, rankingPorJuego, plantillaDe, type Jugador } from '@/lib/torneos/sample'
import { useDemoStore, nombreCuentaDemo, tagCuentaDemo, claveAmigos, type GrupoChat, type MensajeGrupo, type MensajeAmigos } from '@/lib/stores/useDemoStore'
import { useSesionStore, CUENTAS_DIRECTORIO } from '@/lib/stores/useSesionStore'
import { MiniPerfilCuenta, AvatarCuenta } from '@/components/todh/MiniPerfilCuenta'
import { CREW_USUARIO, nivelCrew, puntuacionCrew } from '@/lib/torneos/crews'
import { tagUsuarioDe } from '@/lib/torneos/tags'
import { CrewEmblema } from '@/components/todh/CrewEmblema'
import { CrearCrewSheet } from '@/components/todh/CrearCrewSheet'
import { MiniPerfil } from '@/components/todh/MiniPerfil'
import { PersonajeIcon } from '@/components/todh/PersonajeChip'
import { GameIcon } from '@/components/todh/GameIcon'
import { useT, conParams } from '@/lib/i18n'

// CHAT (paquete Chat 30-08 — antes «Amigos»): el hub social del nav. Cuatro
// pestañas: Amigos (con buscador por nombre o `nombre#XABCD` exacto),
// Grupos de chat, Crews y DIFUSIÓN — canales de SOLO lectura de los TOs que
// sigues (`seguidos` del store): anuncios de fechas y avisos, sin campo de
// escribir. Si no sigues al TO, su canal ofrece «Seguir para ver sus anuncios».

// Canales de difusión sembrados (contenido de muestra, como los mensajes de los
// grupos: no se traduce). El orgId ata el canal a ORGANIZADORES y a `seguidos`.
const CANALES_DIFUSION: { orgId: string; anuncios: { texto: string; hora: string }[] }[] = [
  {
    orgId: 'lima',
    anuncios: [
      { texto: '📅 Lima Smash Weekly #43 — jueves 19:30 en Gamba Arcade. ¡Plazas abiertas!', hora: 'hace 2 h' },
      { texto: '🏆 Smash Arena Madrid — Major: sáb 5 jul. Bo5 desde top 8 y streaming en Twitch.', hora: 'ayer' },
      { texto: '⚠️ El Weekly de la semana que viene se adelanta al miércoles: la sede cierra el jueves.', hora: 'hace 3 días' },
      { texto: '🎟️ Últimas 6 plazas para el Tekken 8 Arena Night. No te quedes fuera.', hora: 'hace 5 días' },
    ],
  },
  {
    orgId: 'dragon-to',
    anuncios: [
      { texto: '🃏 Liga Magic Madrid — jornada 6 este viernes, formato Pioneer.', hora: 'hace 1 h' },
      { texto: '📅 Commander Night: dom 29 jun, mesas de 4 y entrada gratis.', hora: 'ayer' },
      { texto: '⚠️ Cambio de sede: desde julio la liga se muda a La Comarca (Lavapiés).', hora: 'hace 4 días' },
    ],
  },
]

// Perfil competitivo de muestra de cada amigo (por nombre) para enriquecer la lista
const POOL_JUGADORES: Jugador[] = JUEGOS_LIST.flatMap(j => rankingPorJuego(j.id))
const jugadorDe = (nombre: string) => POOL_JUGADORES.find(p => p.nombre === nombre)
const NOMBRES_UNICOS = [...new Set(POOL_JUGADORES.map(p => p.nombre))]

function avatarColor(name: string) {
  const c = ['#E63E54', '#F4912B', '#4F8EF7', '#9B5DE5', '#2EC4B6', '#B6FF3A']
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return c[h % c.length]
}

function Avatar({ nombre, size = 40 }: { nombre: string; size?: number }) {
  const ini = (nombre?.trim()?.[0] || '?').toUpperCase()
  return (
    <span className="shrink-0 overflow-hidden rounded-full flex items-center justify-center font-black text-[#0A0A0F]"
      style={{ width: size, height: size, fontSize: size * 0.4, background: avatarColor(nombre || '?') }}>
      {ini}
    </span>
  )
}

export default function AmigosPage() {
  const { t: tr } = useT()
  const router = useRouter()
  const amigos = useDemoStore(s => s.amigos)
  const solicitudes = useDemoStore(s => s.solicitudesAmistad)
  const grupos = useDemoStore(s => s.gruposChat)
  const agregarAmigo = useDemoStore(s => s.agregarAmigo)
  const quitarAmigo = useDemoStore(s => s.quitarAmigo)
  const responderAmistad = useDemoStore(s => s.responderAmistad)
  const salirGrupo = useDemoStore(s => s.salirGrupoChat)

  const crews = useDemoStore(s => s.crews)
  // ── Mundo compartido (30-08): amistades ENTRE cuentas demo ──
  const sesionEmail = useSesionStore(s => s.sesion?.email?.toLowerCase() ?? null)
  const perfiles = useDemoStore(s => s.perfilesCuentas)
  const amistades = useDemoStore(s => s.amistadesCuentas)
  const solicitarCuenta = useDemoStore(s => s.solicitarAmistadCuenta)
  const responderCuenta = useDemoStore(s => s.responderAmistadCuenta)
  const quitarCuenta = useDemoStore(s => s.quitarAmigoCuenta)
  const [tab, setTab] = useState<'amigos' | 'grupos' | 'crews' | 'difusion'>('amigos')
  const [crear, setCrear] = useState(false)
  const [crearCrew, setCrearCrew] = useState(false)
  const [buscar, setBuscar] = useState('')
  const [verJugador, setVerJugador] = useState<Jugador | null>(null)
  const [verCuenta, setVerCuenta] = useState<string | null>(null)
  const [chatDe, setChatDe] = useState<string | null>(null)
  // (E) Chat directo con una cuenta amiga (hilo en el mundo común)
  const [chatCuenta, setChatCuenta] = useState<string | null>(null)
  const grupoChat = grupos.find(g => g.id === chatDe) ?? null

  // Directorio de cuentas buscables (visibles, rol jugador, sin la propia):
  // nombre/tag/foto los publica cada dueño en su perfil (perfilesCuentas).
  const dirCuentas = CUENTAS_DIRECTORIO
    .map(c => c.email.toLowerCase())
    .filter(email => email !== sesionEmail)
    .map(email => ({ email, nombre: nombreCuentaDemo(email, perfiles), tag: tagCuentaDemo(email, perfiles) }))
  const relacionCon = (email: string) =>
    amistades.find(a => (a.de === sesionEmail && a.a === email) || (a.de === email && a.a === sesionEmail))
  const solicitudesCuenta = sesionEmail ? amistades.filter(a => a.a === sesionEmail && a.estado === 'pendiente') : []
  const amigosCuenta = sesionEmail
    ? amistades.filter(a => a.estado === 'aceptada' && (a.de === sesionEmail || a.a === sesionEmail)).map(a => a.de === sesionEmail ? a.a : a.de)
    : []
  const pendAmistades = solicitudes.length + solicitudesCuenta.length

  // Buscador: por nombre sigue siendo parcial; si el texto lleva `#`, la
  // búsqueda pasa a EXACTA `nombre#XABCD` (case-insensitive) — el tag de cada
  // jugador del pool es determinista (tagUsuarioDe), estable entre sesiones.
  const q = buscar.trim()
  const candidatos = q.length > 0
    ? (q.includes('#')
        ? NOMBRES_UNICOS.filter(n => !amigos.includes(n) && `${n}#${tagUsuarioDe(n)}`.toLowerCase() === q.replace(/\s+/g, '').toLowerCase())
        : NOMBRES_UNICOS.filter(n => !amigos.includes(n) && n.toLowerCase().includes(q.toLowerCase()))
      ).slice(0, 6)
    : []
  // Cuentas Torneum que casan con la búsqueda (mismas reglas), sin las que ya
  // son amigas: van ANTES que el pool y marcadas como «Cuenta Torneum».
  const candidatosCuenta = q.length > 0 && sesionEmail
    ? (q.includes('#')
        ? dirCuentas.filter(c => `${c.nombre}#${c.tag}`.toLowerCase() === q.replace(/\s+/g, '').toLowerCase())
        : dirCuentas.filter(c => c.nombre.toLowerCase().includes(q.toLowerCase()))
      ).filter(c => relacionCon(c.email)?.estado !== 'aceptada').slice(0, 4)
    : []

  const compartir = async () => {
    const url = `${location.origin}/amigo/demo`
    const texto = tr('am.compartirTexto')
    if (navigator.share) { try { await navigator.share({ title: 'Torneum', text: texto, url }) } catch { /* cancelado */ } }
    else { await navigator.clipboard.writeText(url).catch(() => {}) }
  }

  return (
    <div className="max-w-lg mx-auto lg:max-w-none lg:mx-0 px-4 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button onClick={() => router.back()} aria-label="Volver" className="text-[#8B8BA8] hover:text-white"><ArrowLeft size={20} /></button>
          {/* La página se titula Chat («chat.titulo» ya era el chat DE torneo: se reusa la clave del nav) */}
          <h1 className="text-2xl font-black text-white text-display">{tr('nav.chat')}</h1>
        </div>
        <button onClick={compartir} className="inline-flex items-center gap-1.5 rounded-xl bg-[#B6FF3A] px-3 py-2 text-sm font-semibold text-[#0A0A0F]">
          <Share2 size={15} /> {tr('amigos.invitar')}
        </button>
      </div>

      {/* Tabs: Amigos · Grupos · Crews · Difusión. A sangre en móvil (-mx/px)
          para que la 4ª asome y se descubra el scroll (QA 30-08). */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {(['amigos', 'grupos', 'crews', 'difusion'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('flex shrink-0 items-center gap-1.5 rounded-xl px-3 sm:px-3.5 py-2 text-[13px] sm:text-sm font-semibold border transition-colors',
              tab === t ? 'bg-[#B6FF3A] border-[#B6FF3A] text-[#0A0A0F]' : 'border-white/10 text-[#8B8BA8] hover:text-white')}>
            {t === 'amigos' ? <Users size={15} /> : t === 'grupos' ? <MessagesSquare size={15} /> : t === 'crews' ? <Swords size={15} /> : <Megaphone size={15} />}
            {t === 'amigos' ? tr('amigos.titulo') : t === 'grupos' ? tr('amigos.grupos') : t === 'crews' ? tr('crew.tab') : tr('chat.difusion')}
            {t === 'amigos' && pendAmistades > 0 && <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF3D71] px-1 text-[11px] font-bold text-white">{pendAmistades}</span>}
          </button>
        ))}
      </div>

      {tab === 'amigos' ? (
        <div key="t-amigos" className="space-y-5 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0 lg:items-start">
        <div className="space-y-5">
          {/* Buscar y agregar jugadores */}
          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8B8BA8]">{tr('am.agregarJugadores')}</p>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8BA8]" />
              <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder={tr('am.buscarAliasPh')}
                className="w-full h-11 pl-9 pr-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-[#6B6B85] focus:border-[#B6FF3A]/60 outline-none" />
            </div>
            {/* Cuentas Torneum encontradas (mundo compartido): agregar crea una
                solicitud REAL que el destinatario acepta o rechaza al entrar. */}
            {candidatosCuenta.map(c => {
              const rel = relacionCon(c.email)
              return (
                <div key={c.email} className="flex items-center gap-3 rounded-2xl border border-[#B6FF3A]/20 bg-[#B6FF3A]/[0.04] px-3.5 py-2.5">
                  <AvatarCuenta email={c.email} size={34} />
                  <span className="flex-1 min-w-0 truncate text-sm font-semibold text-white">
                    {c.nombre} <span className="text-[12px] font-bold text-[#8B8BA8] font-mono-num">#{c.tag}</span>
                    <span className="ml-1.5 inline-flex items-center px-1.5 h-5 rounded-full bg-[#B6FF3A]/12 border border-[#B6FF3A]/35 text-[#B6FF3A] text-[9px] font-bold uppercase tracking-wide align-middle">{tr('mc.cuentaTorneum')}</span>
                  </span>
                  {rel ? (
                    <span className="inline-flex items-center h-8 px-3 rounded-lg bg-white/6 text-[#8B8BA8] text-[12px] font-bold">{tr('mc.pendiente')}</span>
                  ) : (
                    <button onClick={() => { solicitarCuenta(c.email); setBuscar('') }}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-[#B6FF3A]/15 text-[#B6FF3A] text-[12px] font-bold"><UserPlus size={13} /> {tr('am.agregar')}</button>
                  )}
                </div>
              )
            })}
            {candidatos.map(n => {
              const j = jugadorDe(n)
              return (
                <div key={n} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5">
                  <Avatar nombre={n} size={34} />
                  {/* Cada resultado enseña su tag #XABCD: así se puede compartir/verificar la búsqueda exacta */}
                  <span className="flex-1 min-w-0 truncate text-sm font-semibold text-white">
                    {n} <span className="text-[12px] font-bold text-[#8B8BA8] font-mono-num">#{tagUsuarioDe(n)}</span> {j && <span className="text-xs">{j.bandera}</span>}
                  </span>
                  <button onClick={() => { agregarAmigo(n); setBuscar('') }} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-[#B6FF3A]/15 text-[#B6FF3A] text-[12px] font-bold"><UserPlus size={13} /> {tr('am.agregar')}</button>
                </div>
              )
            })}
            {buscar.trim() && candidatos.length === 0 && candidatosCuenta.length === 0 && <p className="text-[12px] text-[#8B8BA8] px-1">{tr('am.sinResultados')}</p>}
          </section>

          {/* Solicitudes recibidas */}
          {(solicitudes.length > 0 || solicitudesCuenta.length > 0) && (
            <section className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8B8BA8]">{tr('amigos.solicitudes')}</p>
              {/* Solicitudes de cuentas Torneum (mundo compartido): Aceptar y
                  Rechazar son reales — la relación cambia para AMBAS cuentas. */}
              {solicitudesCuenta.map(a => {
                const nombre = nombreCuentaDemo(a.de, perfiles)
                return (
                  <div key={a.de} className="flex items-center gap-3 rounded-2xl border border-[#B6FF3A]/25 bg-[#B6FF3A]/[0.05] px-3.5 py-3">
                    <AvatarCuenta email={a.de} />
                    <span className="flex-1 min-w-0 truncate text-sm font-semibold text-white">
                      {nombre} <span className="text-[12px] font-bold text-[#8B8BA8] font-mono-num">#{tagCuentaDemo(a.de, perfiles)}</span>
                      <span className="ml-1.5 inline-flex items-center px-1.5 h-5 rounded-full bg-[#B6FF3A]/12 border border-[#B6FF3A]/35 text-[#B6FF3A] text-[9px] font-bold uppercase tracking-wide align-middle">{tr('mc.cuentaTorneum')}</span>
                    </span>
                    <button onClick={() => responderCuenta(a.de, true)} aria-label={`Aceptar a ${nombre}`} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#27AE60] text-white"><Check size={17} /></button>
                    <button onClick={() => responderCuenta(a.de, false)} aria-label={`Rechazar a ${nombre}`} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-[#8B8BA8] hover:text-white"><X size={17} /></button>
                  </div>
                )
              })}
              {solicitudes.map(n => (
                <div key={n} className="flex items-center gap-3 rounded-2xl border border-[#B6FF3A]/25 bg-[#B6FF3A]/[0.05] px-3.5 py-3">
                  <Avatar nombre={n} />
                  <p className="flex-1 min-w-0 truncate text-sm font-semibold text-white">{n}</p>
                  <button onClick={() => responderAmistad(n, true)} aria-label={`Aceptar a ${n}`} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#27AE60] text-white"><Check size={17} /></button>
                  <button onClick={() => responderAmistad(n, false)} aria-label={`Rechazar a ${n}`} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-[#8B8BA8] hover:text-white"><X size={17} /></button>
                </div>
              ))}
            </section>
          )}
        </div>

          {/* Tus amigos */}
          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8B8BA8]">{tr('amigos.tus')} ({amigos.length + amigosCuenta.length})</p>
            {amigos.length === 0 && amigosCuenta.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B6FF3A]/15 text-[#B6FF3A]"><UserPlus size={22} /></div>
                <p className="font-semibold text-white">{tr('am.sinAmigos')}</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-[#8B8BA8]">{tr('am.sinAmigosSub')}</p>
              </div>
            ) : <>
            {/* Amigos que son CUENTAS Torneum (mundo compartido): su avatar es
                la foto pública de su perfil; el toque abre su mini-perfil. */}
            {amigosCuenta.map(email => {
              const nombre = nombreCuentaDemo(email, perfiles)
              return (
                <div key={email} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-3 card-int">
                  <button onClick={() => setVerCuenta(email)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <AvatarCuenta email={email} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">{nombre} <span className="text-[11px] font-bold text-[#8B8BA8] font-mono-num">#{tagCuentaDemo(email, perfiles)}</span></span>
                      <span className="text-[11px] text-[#B6FF3A] font-semibold">{tr('mc.cuentaTorneum')}</span>
                    </span>
                  </button>
                  <button onClick={() => setChatCuenta(email)} aria-label={`Chatear con ${nombre}`} className="flex h-9 w-9 items-center justify-center rounded-xl text-[#B6FF3A] hover:bg-[#B6FF3A]/10"><MessagesSquare size={16} /></button>
                  <button onClick={() => quitarCuenta(email)} aria-label={`Quitar a ${nombre}`} className="flex h-9 w-9 items-center justify-center rounded-xl text-[#6B6B85] hover:text-[#FF8A8A]"><Trash2 size={16} /></button>
                </div>
              )
            })}
            {amigos.map(nombre => {
              const j = jugadorDe(nombre)
              return (
                <div key={nombre} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-3 card-int">
                  <button onClick={() => j && setVerJugador(j)} className="flex items-center gap-3 flex-1 min-w-0 text-left" disabled={!j}>
                    <Avatar nombre={nombre} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">{nombre} {j && <span className="text-xs">{j.bandera}</span>}</span>
                      {j && (
                        <span className="flex items-center gap-1 text-[11px] text-[#8B8BA8] font-mono-num">
                          <GameIcon juegoId={j.juego} size={12} /> {JUEGOS[j.juego]?.corto} · {j.rating} · <PersonajeIcon juegoId={j.juego} nombre={j.main} px={14} /> {j.main}
                        </span>
                      )}
                    </span>
                  </button>
                  <button onClick={() => quitarAmigo(nombre)} aria-label={`Quitar a ${nombre}`} className="flex h-9 w-9 items-center justify-center rounded-xl text-[#6B6B85] hover:text-[#FF8A8A]"><Trash2 size={16} /></button>
                </div>
              )
            })}
            </>}
          </section>
        </div>
      ) : tab === 'grupos' ? (
        <div key="t-grupos" className="space-y-3 lg:max-w-2xl">
          <button onClick={() => setCrear(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#B6FF3A]/40 bg-[#B6FF3A]/[0.06] px-4 py-3 text-sm font-semibold text-[#B6FF3A]">
            <Plus size={17} /> {tr('am.crearGrupo')}
          </button>
          {grupos.length === 0 ? (
            <p className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-8 text-center text-sm text-[#8B8BA8]">
              {tr('am.gruposVacio')}
            </p>
          ) : grupos.map(g => (
            <button key={g.id} onClick={() => setChatDe(g.id)} className="w-full rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-left card-int">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7C5CFF]/15 text-xl">{g.emoji || '🎉'}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                    {g.nombre}
                    {g.propio && <Crown size={12} className="text-[#E7CB86]" />}
                  </p>
                  <p className="text-xs text-[#8B8BA8] truncate">
                    {g.mensajes.length > 0
                      ? <><span className="text-[#B8B8CC] font-semibold">{g.mensajes[g.mensajes.length - 1].autor}:</span> {g.mensajes[g.mensajes.length - 1].texto}</>
                      : `${g.miembros.length} ${g.miembros.length === 1 ? tr('crew.miembro') : tr('crew.miembrosMin')} ${tr('am.sinMensajes')}`}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B6FF3A] shrink-0"><MessagesSquare size={13} /> {tr('am.abrirChat')}</span>
              </div>
              <div className="mt-3 flex -space-x-2">
                {g.miembros.slice(0, 8).map(m => <Avatar key={m} nombre={m} size={28} />)}
                {g.miembros.length > 8 && <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">+{g.miembros.length - 8}</span>}
              </div>
            </button>
          ))}
        </div>
      ) : tab === 'crews' ? (
        /* Crews (F6): tus crews con emblema real + crear una nueva. El TAG no
           se enseña junto a los amigos (spec: solo torneo y ranking); aquí es
           la ficha de la propia crew, no un nick. */
        <div key="t-crews" className="space-y-3 lg:max-w-2xl">
          <button onClick={() => setCrearCrew(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#B6FF3A]/40 bg-[#B6FF3A]/[0.06] px-4 py-3 text-sm font-semibold text-[#B6FF3A]">
            <Plus size={17} /> {tr('crew.crear')}
          </button>
          {(() => {
            const mias = crews.filter(c => c.miembros.includes(CREW_USUARIO))
            if (mias.length === 0) {
              return <p className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-8 text-center text-sm text-[#8B8BA8]">{tr('crew.vacio')}</p>
            }
            return mias.map(c => {
              const media = puntuacionCrew(c)
              const esEquipos = plantillaDe(c.juego).modo === 'equipos'
              return (
                <Link key={c.id} href={`/crew/${c.id}`} className="flex items-center gap-3 w-full rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-left card-int">
                  <CrewEmblema nivel={nivelCrew(c)} variant="tile" size={46} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">
                      {c.emoji && <span className="mr-1">{c.emoji}</span>}{c.nombre} <span style={{ color: c.color ?? '#8B8BA8' }}>#{c.tag}</span>
                      {c.creadaPorMi && <Crown size={12} className="ml-1.5 inline text-[#E7CB86]" />}
                    </p>
                    <p className="flex items-center gap-1 text-[11px] text-[#8B8BA8] font-mono-num">
                      <GameIcon juegoId={c.juego} size={12} /> {JUEGOS[c.juego]?.corto ?? c.juego} · {media} pts · {c.miembros.length} {c.miembros.length === 1 ? tr('crew.miembro') : tr('crew.miembrosMin')}
                      {esEquipos && <span className="ml-1 text-[#7FB0FF] font-sans font-semibold">· 5v5</span>}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#B6FF3A] shrink-0">{tr('crew.verCrew')} <ChevronRight size={13} /></span>
                </Link>
              )
            })
          })()}
        </div>
      ) : (
        /* Difusión: canales de SOLO lectura de los TOs. Sin campo de escribir:
           solo el organizador publica; tú lees. Atado a `seguidos` del store. */
        <div key="t-difusion" className="space-y-4 lg:max-w-2xl">
          <p className="text-[12px] text-[#8B8BA8]">{tr('chat.difusionSub')}</p>
          {CANALES_DIFUSION.map(c => <CanalDifusion key={c.orgId} orgId={c.orgId} anuncios={c.anuncios} />)}
        </div>
      )}

      {crear && <CrearGrupoModal amigos={amigos} onClose={() => setCrear(false)} />}
      {crearCrew && <CrearCrewSheet onClose={() => setCrearCrew(false)} />}
      {grupoChat && <GrupoChatSheet grupo={grupoChat} onSalir={() => { salirGrupo(grupoChat.id); setChatDe(null) }} onClose={() => setChatDe(null)} />}
      {chatCuenta && <ChatAmigoSheet email={chatCuenta} onClose={() => setChatCuenta(null)} />}
      {verJugador && <MiniPerfil jugador={verJugador} onClose={() => setVerJugador(null)} />}
      {verCuenta && <MiniPerfilCuenta email={verCuenta} onClose={() => setVerCuenta(null)} />}
    </div>
  )
}

// Chat del grupo (persistido en el store): la sala del grupo.
// (Backlog E, 31-08) Chat directo entre dos cuentas amigas: el hilo vive en el
// mundo común (chatsAmigos, clave de pareja) — cada uno lo ve con su cuenta y
// el otro recibe un aviso en su buzón al entrar.
const SIN_MENSAJES: MensajeAmigos[] = []
function ChatAmigoSheet({ email, onClose }: { email: string; onClose: () => void }) {
  const { t: tr } = useT()
  const miEmail = useSesionStore(s => s.sesion?.email?.toLowerCase() ?? null)
  const perfiles = useDemoStore(s => s.perfilesCuentas)
  const chats = useDemoStore(s => s.chatsAmigos)
  const enviar = useDemoStore(s => s.enviarMensajeAmigo)
  const [texto, setTexto] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const mensajes = miEmail ? (chats[claveAmigos(miEmail, email)] ?? SIN_MENSAJES) : SIN_MENSAJES
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes.length])
  const nombre = nombreCuentaDemo(email, perfiles)

  const mandar = () => {
    const t = texto.trim()
    if (!t) return
    enviar(email, t)
    setTexto('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop flex flex-col" style={{ height: 'min(72vh, 640px)' }}>
        <div className="px-4 pt-4 pb-3 border-b border-white/8 flex items-center gap-3">
          <AvatarCuenta email={email} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-white truncate">{nombre}</p>
            <p className="text-[11px] text-[#8B8BA8] truncate font-mono-num">#{tagCuentaDemo(email, perfiles)}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="h-8 w-8 rounded-full bg-white/8 flex items-center justify-center text-[#B8B8CC] shrink-0"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {mensajes.length === 0 && <p className="text-center text-sm text-[#8B8BA8] py-6">{tr('ma.vacio')}</p>}
          {mensajes.map((m, i) => {
            const esMio = m.de === miEmail
            return (
              <div key={i} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] rounded-2xl px-3 py-2 ${esMio ? 'bg-[#B6FF3A]/14 border border-[#B6FF3A]/30' : 'bg-white/[0.05] border border-white/8'}`}>
                  <p className="text-[13px] text-white leading-snug">{m.texto}</p>
                  <p className="mt-0.5 text-right text-[9px] text-[#6B6B85] font-mono-num">{m.hora}</p>
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>
        <div className="p-3 border-t border-white/8 flex gap-2">
          <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => e.key === 'Enter' && mandar()}
            placeholder={conParams(tr('ma.escribe'), { nombre })} className="flex-1 h-11 px-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-[#7B7B92] focus:border-[#B6FF3A]/60 outline-none" />
          <button onClick={mandar} aria-label="Enviar" className="h-11 w-11 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] flex items-center justify-center"><Send size={16} /></button>
        </div>
      </div>
    </div>
  )
}

function GrupoChatSheet({ grupo, onSalir, onClose }: { grupo: GrupoChat; onSalir: () => void; onClose: () => void }) {
  const { t: tr } = useT()
  const enviar = useDemoStore(s => s.enviarChatGrupo)
  const [texto, setTexto] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [grupo.mensajes.length])

  const mandar = () => {
    const t = texto.trim()
    if (!t) return
    enviar(grupo.id, t)
    setTexto('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop flex flex-col" style={{ height: 'min(72vh, 640px)' }}>
        <div className="px-4 pt-4 pb-3 border-b border-white/8 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7C5CFF]/15 text-xl shrink-0">{grupo.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-white truncate">{grupo.nombre}</p>
            <p className="text-[11px] text-[#8B8BA8] truncate">{grupo.miembros.join(', ')}</p>
          </div>
          <button onClick={() => { if (confirm(conParams(tr('am.confirmSalir'), { nombre: grupo.nombre }))) onSalir() }} className="text-[11px] text-[#8B8BA8] font-semibold hover:text-[#FF8A8A] shrink-0">{tr('am.salir')}</button>
          <button onClick={onClose} aria-label="Cerrar" className="h-8 w-8 rounded-full bg-white/8 flex items-center justify-center text-[#B8B8CC] shrink-0"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {grupo.mensajes.length === 0 && <p className="text-center text-sm text-[#8B8BA8] py-6">{tr('am.chatVacio')}</p>}
          {grupo.mensajes.map((m, i) => {
            const esMio = m.autor === 'Tú'
            return (
              <div key={i} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] rounded-2xl px-3 py-2 ${esMio ? 'bg-[#B6FF3A]/14 border border-[#B6FF3A]/30' : 'bg-white/[0.05] border border-white/8'}`}>
                  {!esMio && <p className="text-[10px] font-bold text-[#8B8BA8]">{m.autor}</p>}
                  <p className="text-[13px] text-white leading-snug">{m.texto}</p>
                  {m.torneoId && m.crewId && <ConvocatoriaCrew m={m} />}
                  <p className="mt-0.5 text-right text-[9px] text-[#6B6B85] font-mono-num">{m.hora}</p>
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>
        <div className="p-3 border-t border-white/8 flex gap-2">
          <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => e.key === 'Enter' && mandar()}
            placeholder={tr('am.escribeGrupo')} className="flex-1 h-11 px-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-[#7B7B92] focus:border-[#B6FF3A]/60 outline-none" />
          <button onClick={mandar} aria-label="Enviar" className="h-11 w-11 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] flex items-center justify-center"><Send size={16} /></button>
        </div>
      </div>
    </div>
  )
}

// Convocatoria de inscripción por equipos (F6) dentro del chat de la crew:
// tarjeta clicable con el estado VIVO del cupo (X/N) que lleva a la ficha del
// torneo con ?crew= — allí cada miembro paga su plaza por su cuenta.
function ConvocatoriaCrew({ m }: { m: MensajeGrupo }) {
  const { t: tr } = useT()
  const cupo = useDemoStore(s => s.crewTorneo[m.torneoId!])
  const crews = useDemoStore(s => s.crews)
  const inscrito = useDemoStore(s => s.inscritos.includes(m.torneoId!))
  const crew = crews.find(c => c.id === m.crewId)
  if (!crew) return null
  const plazas = plantillaDe(crew.juego).tamGrupo
  const confirmadas = cupo?.crewId === crew.id ? cupo.inscritos.length : 0
  return (
    <Link href={`/torneo/${m.torneoId}?crew=${m.crewId}`}
      className="mt-2 flex items-center gap-2.5 rounded-xl border border-[#B6FF3A]/35 bg-[#B6FF3A]/[0.07] px-3 py-2 hover:bg-[#B6FF3A]/[0.12] transition-colors">
      <GameIcon juegoId={crew.juego} size={26} variant="tile" />
      <span className="flex-1 min-w-0">
        <span className="block text-[12px] font-bold text-white truncate">{crew.nombre} <span style={{ color: crew.color ?? '#B6FF3A' }}>#{crew.tag}</span></span>
        <span className="block text-[11px] text-[#B8B8CC] font-mono-num">{confirmadas}/{plazas} <span className="font-sans">{tr('crew.plazasConf')}</span></span>
      </span>
      <span className="text-[11px] font-bold text-[#B6FF3A] shrink-0">{inscrito ? `✓ ${tr('crew.tuPlazaOk')}` : `${tr('crew.pagarPlaza')} ›`}</span>
    </Link>
  )
}

// Canal de difusión de un TO: SOLO lectura (ni input ni respuestas). Si no
// sigues al organizador, el canal se presenta cerrado con el CTA de seguirle
// (alternarSeguir, la misma acción del perfil público del TO).
function CanalDifusion({ orgId, anuncios }: { orgId: string; anuncios: { texto: string; hora: string }[] }) {
  const { t: tr } = useT()
  const org = ORGANIZADORES[orgId]
  const sigue = useDemoStore(s => s.seguidos.includes(orgId))
  const alternarSeguir = useDemoStore(s => s.alternarSeguir)
  if (!org) return null
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
      <Link href={`/organizador/${org.id}`} className="flex items-center gap-3 px-4 py-3 border-b border-white/6 hover:bg-white/[0.03] transition-colors">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-black text-[#0A0A0F]" style={{ background: org.color }}>
          {org.nombre[0]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-bold text-white truncate">
            <Megaphone size={13} className="text-[#B6FF3A] shrink-0" /> {org.nombre}
          </span>
          <span className="block text-[11px] text-[#8B8BA8]">{tr('chat.canalSoloLectura')}</span>
        </span>
        {sigue && <span className="shrink-0 text-[11px] font-bold text-[#B6FF3A]">{tr('chat.siguiendo')}</span>}
      </Link>
      {sigue ? (
        <div className="px-4 py-3 space-y-2.5">
          {anuncios.map((a, i) => (
            <div key={i} className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2">
              <p className="text-[13px] text-white leading-snug">{a.texto}</p>
              <p className="mt-0.5 text-right text-[9px] text-[#6B6B85] font-mono-num">{a.hora}</p>
            </div>
          ))}
          {/* Sin campo de escribir: los canales de difusión son unidireccionales */}
        </div>
      ) : (
        <div className="px-4 py-5 text-center">
          <p className="text-[12px] text-[#8B8BA8]">{tr('chat.canalCerrado')}</p>
          <button onClick={() => alternarSeguir(org.id, org.nombre)}
            className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-[12px] font-bold">
            <BellPlus size={14} /> {tr('chat.seguirParaVer')}
          </button>
        </div>
      )}
    </section>
  )
}

function CrearGrupoModal({ amigos, onClose }: { amigos: string[]; onClose: () => void }) {
  const { t: tr } = useT()
  const crearGrupo = useDemoStore(s => s.crearGrupoChat)
  const [nombre, setNombre] = useState('')
  const [emoji, setEmoji] = useState('🎮')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const EMOJIS = ['🎮', '🃏', '⚔️', '🔥', '🏆', '👾', '⚡', '✨']

  const crear = () => {
    if (!nombre.trim() || sel.size === 0) return
    crearGrupo(nombre.trim(), emoji, [...sel])
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl bg-[#12161F] p-6 sm:rounded-3xl border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{tr('am.nuevoGrupo')}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)} className={cn('h-10 w-10 rounded-xl text-xl', emoji === e ? 'bg-[#B6FF3A]/20 ring-1 ring-[#B6FF3A]' : 'bg-white/5')}>{e}</button>
            ))}
          </div>
          <input value={nombre} onChange={e => setNombre(e.target.value)} maxLength={60} placeholder={tr('am.nombreGrupoPh')}
            className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-[#B6FF3A]/60" />
          <div>
            <p className="mb-2 text-sm font-medium text-[#A0A0B8]">{tr('am.anadeAmigos')}</p>
            {amigos.length === 0 ? (
              <p className="text-sm text-[#6B6B85]">{tr('am.primeroAmigos')}</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {amigos.map(a => {
                  const on = sel.has(a)
                  return (
                    <button key={a} onClick={() => setSel(prev => { const n = new Set(prev); if (n.has(a)) n.delete(a); else n.add(a); return n })}
                      className={cn('flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left', on ? 'border-[#B6FF3A] bg-[#B6FF3A]/10' : 'border-white/8 bg-white/[0.03]')}>
                      <Avatar nombre={a} size={32} />
                      <span className="flex-1 truncate text-sm text-white">{a}</span>
                      {on && <Check size={16} className="text-[#B6FF3A]" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <button onClick={crear} disabled={!nombre.trim() || sel.size === 0} className="h-12 w-full rounded-xl bg-[#B6FF3A] font-semibold text-[#0A0A0F] disabled:opacity-50">
            {tr('am.crearGrupoBtn')}{sel.size ? ` (${sel.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
