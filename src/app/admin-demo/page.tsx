'use client'
import type { IconoTorneum } from '@/components/todh/iconosTorneum'
import { useMemo, useState } from 'react'
import { AnimatedValue } from '@/components/ui/CountUp'
import { useRouter } from 'next/navigation'
import { JUEGOS, LOCALES, ORGANIZADORES, plantillaDe, type Local, type TorneoSample, type Juego } from '@/lib/torneos/sample'
import { PRESETS_JUEGO, presetDe, MODO_LABEL, REPORTE_LABEL, SETUP_LABEL, type PlantillaJuego, type ModoJuego, type ReporteJuego, type SetupJuego } from '@/lib/torneos/plantillas'
import { torneosEfectivos } from '@/lib/torneos/efectivos'
import { CATEGORIAS, type CategoriaTorneo } from '@/lib/torneos/puntos'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { useSesionStore } from '@/lib/stores/useSesionStore'
import { RequireSesion } from '@/components/todh/RequireSesion'
import { useT, type ClaveI18n } from '@/lib/i18n'
import { Users, Store, Trophy, Wallet, LayoutDashboard, Plus, Check, X, KeyRound, Copy, LogOut, Star, Pencil, ChevronRight, Mail, MapPin, ShieldCheck, RotateCcw } from '@/components/todh/iconosTorneum'
import { Gamepad2, BadgeCheck, ShieldAlert, Ban, MessageSquareWarning, MessagesSquare, VolumeX, FileText, Phone, Landmark, UserRound } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// PANEL ADMIN de Torneum — organizado por secciones, como un backoffice real.
// Todo es demo: lo que puede persistir usa el store (aprobar TO, editar/cancelar
// torneos); el resto (expedientes, usuarios) vive en estado local de la página.
// ─────────────────────────────────────────────────────────────────────────────

type Seccion = 'resumen' | 'verificacion' | 'torneos' | 'sedes' | 'usuarios' | 'juegos' | 'incidencias' | 'acceso'

const SECCIONES: { id: Seccion; clave: ClaveI18n; icon: IconoTorneum }[] = [
  { id: 'resumen', clave: 'adm.secResumen', icon: LayoutDashboard },
  { id: 'verificacion', clave: 'adm.secVerificacion', icon: BadgeCheck },
  { id: 'torneos', clave: 'adm.secTorneos', icon: Trophy },
  { id: 'sedes', clave: 'adm.secSedes', icon: Store },
  { id: 'usuarios', clave: 'adm.secUsuarios', icon: Users },
  { id: 'juegos', clave: 'adm.secJuegos', icon: Gamepad2 },
  { id: 'incidencias', clave: 'adm.secIncidencias', icon: MessageSquareWarning },
  { id: 'acceso', clave: 'adm.secAcceso', icon: KeyRound },
]

// Rol visible de cada cuenta → clave i18n (el dato interno sigue en español)
const ROL_CLAVE: Record<string, ClaveI18n> = {
  Jugador: 'adm.rolJugador', Organizador: 'adm.rolOrganizador', Sede: 'adm.rolSede',
}

// Los expedientes de sede y de TO viven ahora en el store (sembrados allí):
// llegan del alta self-service (/alta-local) y persisten con su estado.

// Usuarios de muestra para la gestión de cuentas.
const USUARIOS_INICIALES = [
  { id: 'u1', nombre: 'Álex', email: 'jugador@torneum.com', rol: 'Jugador', desde: 'jun 2026', estado: 'activo' as 'activo' | 'suspendido' },
  { id: 'u2', nombre: 'Lima Esports', email: 'to@torneum.com', rol: 'Organizador', desde: 'may 2026', estado: 'activo' as const },
  { id: 'u3', nombre: 'Gamba Esports', email: 'local@torneum.com', rol: 'Sede', desde: 'may 2026', estado: 'activo' as const },
  { id: 'u4', nombre: 'Kaze', email: 'kaze@correo.com', rol: 'Jugador', desde: 'jun 2026', estado: 'activo' as const },
  { id: 'u5', nombre: 'Sora', email: 'sora@correo.com', rol: 'Jugador', desde: 'jul 2026', estado: 'activo' as const },
]

// Mensajes de muestra del chat de cada torneo (se mezclan con los del store).
const CHAT_SEED: Record<string, { autor: string; texto: string; hora: string }[]> = {
  t1: [
    { autor: 'Kaze', texto: 'GGs a todos, nos vemos en semis', hora: '18:42' },
    { autor: 'Volt', texto: '¿Alguien tiene un mando de GC de sobra?', hora: '18:47' },
    { autor: 'Nyx', texto: 'ESTE BRACKET ESTÁ AMAÑADO!!! 😡', hora: '18:51' },
    { autor: 'Sora', texto: 'Mesa 3 libre ya', hora: '18:55' },
  ],
  t2: [
    { autor: 'Mist', texto: '¿Ronda 3 cuándo empieza?', hora: '20:02' },
    { autor: 'Drako', texto: 'Vendo playset de rayos, MP', hora: '20:10' },
  ],
}


export default function AdminDemoPage() {
  return (
    <RequireSesion rol="admin">
      <AdminPanel />
    </RequireSesion>
  )
}

function AdminPanel() {
  const { t: tr } = useT()
  const router = useRouter()
  const logout = useSesionStore(s => s.logout)
  const [seccion, setSeccion] = useState<Seccion>('resumen')

  // Estado real del demo store
  const perfilTO = useDemoStore(s => s.perfilTO)
  const aprobarTO = useDemoStore(s => s.aprobarTO)
  const rechazarTO = useDemoStore(s => s.rechazarTO)
  const creados = useDemoStore(s => s.creados)
  const editados = useDemoStore(s => s.editados)
  const cancelados = useDemoStore(s => s.cancelados)
  const cancelarTorneo = useDemoStore(s => s.cancelarTorneo)
  const editarTorneo = useDemoStore(s => s.editarTorneo)
  const reportes = useDemoStore(s => s.reportes)
  const disputas = useDemoStore(s => s.disputas)
  const chatsTorneo = useDemoStore(s => s.chatsTorneo)
  const torneos = useMemo(() => torneosEfectivos(creados, editados, cancelados), [creados, editados, cancelados])

  // Verificación desde el store: expedientes de sede y de TO PERSISTEN y sus
  // resoluciones (aprobar ≠ rechazar) notifican — antes ambos botones solo
  // borraban de una lista local que se perdía al recargar.
  const expedientesSede = useDemoStore(s => s.expedientesSede)
  const expedientesTO = useDemoStore(s => s.expedientesTO)
  const pendVerif = expedientesSede.filter(e => e.estado === 'pendiente').length
    + expedientesTO.filter(e => e.estado === 'pendiente').length
    + (perfilTO === 'pendiente' ? 1 : 0)
  const incidAbiertas = reportes.filter(r => r.estado === 'abierto').length + disputas.length

  return (
    <div className="relative min-h-screen">
      {/* Cabecera */}
      <div className="flex items-center gap-3 px-4 lg:px-6 pt-5 pb-3 safe-top sticky top-0 z-20 bg-[#0D0F15]/92 backdrop-blur-md border-b border-white/6">
        <span className="h-10 w-10 rounded-xl bg-[#B6FF3A] flex items-center justify-center text-[#0A0A0F] font-black text-display shrink-0">T</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold">{tr('adm.panelAdmin')}</p>
          <p className="text-base font-bold text-white">{tr('adm.plataforma')}</p>
        </div>
        <button onClick={() => { logout(); router.replace('/login') }}
          className="h-9 px-3 rounded-xl bg-white/6 border border-white/12 text-[#B8B8CC] hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors">
          <LogOut size={13} /> {tr('adm.cerrarSesion')}
        </button>
      </div>

      <div className="mx-auto max-w-6xl lg:max-w-none lg:grid lg:grid-cols-[210px_1fr] lg:gap-8 lg:px-6">
        {/* Navegación de secciones: rail en escritorio, chips en móvil */}
        <nav className="lg:sticky lg:top-[76px] lg:self-start lg:pt-5">
          <div className="flex lg:flex-col gap-1 overflow-x-auto scrollbar-hide px-4 lg:px-0 py-3 lg:py-0">
            {SECCIONES.map(({ id, clave, icon: Icon }) => {
              const on = seccion === id
              const badge = id === 'verificacion' ? pendVerif : id === 'incidencias' ? incidAbiertas : 0
              return (
                <button key={id} onClick={() => setSeccion(id)}
                  className={`shrink-0 flex items-center gap-2.5 px-3 h-10 rounded-xl text-[13px] font-semibold transition-colors ${on ? 'bg-[#B6FF3A]/12 text-[#B6FF3A]' : 'text-[#B8B8CC] hover:bg-white/5 hover:text-white'}`}>
                  <Icon size={16} strokeWidth={on ? 2.4 : 1.9} /> {tr(clave)}
                  {badge > 0 && <span className="ml-auto px-1.5 min-w-5 h-5 rounded-full bg-[#FF8A5C]/20 text-[#FF8A5C] text-[10px] font-black flex items-center justify-center">{badge}</span>}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Contenido de la sección */}
        <main className="px-4 lg:px-0 pb-16 lg:pt-5">
          {seccion === 'resumen' && <SecResumen torneos={torneos} pendVerif={pendVerif} incid={incidAbiertas} irA={setSeccion} />}
          {seccion === 'verificacion' && (
            <SecVerificacion perfilTO={perfilTO} aprobarTO={aprobarTO} rechazarTO={rechazarTO} />
          )}
          {seccion === 'torneos' && <SecTorneos torneos={torneos} cancelar={cancelarTorneo} editar={editarTorneo} chats={chatsTorneo} />}
          {seccion === 'sedes' && <SecSedes />}
          {seccion === 'usuarios' && <SecUsuarios />}
          {seccion === 'juegos' && <SecJuegos />}
          {seccion === 'incidencias' && <SecIncidencias reportes={reportes} disputas={disputas} />}
          {seccion === 'acceso' && <SecAcceso />}
        </main>
      </div>
    </div>
  )
}

// ── Resumen ──────────────────────────────────────────────────────────────────
function SecResumen({ torneos, pendVerif, incid, irA }: {
  torneos: ReturnType<typeof torneosEfectivos>; pendVerif: number; incid: number; irA: (s: Seccion) => void
}) {
  const { t: tr } = useT()
  const enDirecto = torneos.filter(t => t.enDirecto).length
  const gmv = torneos.reduce((a, t) => a + t.inscritos * t.precio, 0)
  return (
    <div>
      <Titulo texto={tr('adm.resumenTitulo')} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={<Trophy size={16} className="text-[#B6FF3A]" />} value={String(torneos.length)} label={tr('adm.torneosActivos')} />
        <KPI icon={<Users size={16} className="text-[#9B82FF]" />} value="6.4k" label={tr('adm.jugadores')} />
        <KPI icon={<Store size={16} className="text-[#4F8EF7]" />} value={String(Object.keys(LOCALES).length)} label={tr('adm.sedesActivas')} />
        <KPI icon={<Wallet size={16} className="text-[#E0BE63]" />} value={`${Math.round(gmv * 0.05)}€`} label={tr('adm.comisionesMes')} />
      </div>

      <p className="eyebrow eyebrow-muted mt-6 mb-2.5">{tr('adm.requiereAtencion')}</p>
      <div className="space-y-2">
        <FilaAviso color="#F5A623" icon={<BadgeCheck size={16} />} titulo={`${pendVerif} ${tr('adm.verifPendientes')}`}
          sub={tr('adm.verifPendientesSub')} onClick={() => irA('verificacion')} />
        <FilaAviso color="#FF8A5C" icon={<MessageSquareWarning size={16} />} titulo={`${incid} ${tr('adm.incidAbiertas')}`}
          sub={tr('adm.incidAbiertasSub')} onClick={() => irA('incidencias')} />
        <FilaAviso color="#FF6076" icon={<Trophy size={16} />} titulo={`${enDirecto} ${tr('adm.enDirectoAhora')}`}
          sub={tr('adm.enDirectoAhoraSub')} onClick={() => irA('torneos')} />
      </div>

      <div className="mt-6 card-premium p-4 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#9B82FF]/15 text-[#9B82FF]"><ShieldAlert size={18} /></span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{tr('adm.intelTitulo')}</p>
          <p className="text-xs text-[#8B8BA8]">{tr('adm.intelTexto')}</p>
        </div>
      </div>
    </div>
  )
}

// ── Verificación (expedientes completos, desde el store) ────────────────────
function SecVerificacion({ perfilTO, aprobarTO, rechazarTO }: {
  perfilTO: string; aprobarTO: () => void; rechazarTO: () => void
}) {
  const { t: tr } = useT()
  const [abierto, setAbierto] = useState<string | null>(null)
  const expedientesSede = useDemoStore(s => s.expedientesSede)
  const expedientesTO = useDemoStore(s => s.expedientesTO)
  const resolverSede = useDemoStore(s => s.resolverExpedienteSede)
  const resolverTO = useDemoStore(s => s.resolverExpedienteTO)
  const sedesPend = expedientesSede.filter(e => e.estado === 'pendiente')
  const tosPend = expedientesTO.filter(e => e.estado === 'pendiente')
  const resueltos = [
    ...expedientesTO.filter(e => e.estado !== 'pendiente').map(e => ({ id: e.id, nombre: e.nombre, tipo: tr('adm.rolOrganizador'), ok: e.estado === 'aprobado' })),
    ...expedientesSede.filter(e => e.estado !== 'pendiente').map(e => ({ id: e.id, nombre: e.nombre, tipo: tr('adm.rolSede'), ok: e.estado === 'aprobada' })),
  ]
  return (
    <div>
      <Titulo texto={tr('adm.verifTitulo')} sub={tr('adm.verifSub')} />

      {/* Solicitud REAL del jugador de la demo (perfil dual) */}
      {perfilTO === 'pendiente' && (
        <div className="card-premium p-3.5 mb-2 border border-[#B6FF3A]/30">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#0A0A0F] font-black bg-[#B6FF3A]">A</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{tr('adm.alexDemo')} <Etiqueta texto={tr('adm.rolOrganizador')} /></p>
              <p className="text-[11px] text-[#8B8BA8]">{tr('adm.solicitudDual')}</p>
            </div>
            <button onClick={rechazarTO} aria-label="Rechazar" className="h-8 w-8 rounded-lg bg-white/8 hover:bg-[#FF6B6B]/20 text-[#FF8A8A] flex items-center justify-center transition-colors"><X size={15} /></button>
            <button onClick={aprobarTO} className="h-8 px-3 rounded-lg bg-[#B6FF3A] text-[#0A0A0F] text-xs font-bold flex items-center gap-1"><Check size={14} /> {tr('adm.aprobar')}</button>
          </div>
        </div>
      )}

      {/* TOs candidatos con expediente */}
      {tosPend.map(e => (
        <div key={e.id} className="card-premium p-3.5 mb-2">
          <button onClick={() => setAbierto(a => a === e.id ? null : e.id)} className="w-full flex items-center gap-3 text-left">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#0A0A0F] font-black bg-[#9B82FF]">{e.nombre[0]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{e.nombre} <Etiqueta texto={tr('adm.rolOrganizador')} /></p>
              <p className="text-[11px] text-[#8B8BA8]">{e.representante} · {e.email}</p>
            </div>
            <ChevronRight size={15} className={`text-[#6B6B85] transition-transform ${abierto === e.id ? 'rotate-90' : ''}`} />
          </button>
          {abierto === e.id && (
            <div className="mt-3 pt-3 border-t border-white/8 space-y-1.5 animate-slide-up-sm">
              <Dato icon={UserRound} label={tr('adm.representante')} valor={e.representante} />
              <Dato icon={Mail} label={tr('adm.correo')} valor={e.email} />
              <Dato icon={Phone} label={tr('adm.telefono')} valor={e.telefono} />
              <Dato icon={FileText} label={tr('adm.experiencia')} valor={e.experiencia} />
              <Dato icon={Trophy} label={tr('adm.secJuegos')} valor={e.juegos.map(j => JUEGOS[j]?.corto ?? j).join(', ')} />
              <Dato icon={FileText} label={tr('adm.enlaces')} valor={e.enlaces} />
              <div className="flex gap-2 pt-2">
                <button onClick={() => resolverTO(e.id, true)} className="flex-1 h-9 rounded-lg bg-[#B6FF3A] text-[#0A0A0F] text-xs font-bold flex items-center justify-center gap-1"><Check size={14} /> {tr('adm.aprobarOrganizador')}</button>
                <button onClick={() => resolverTO(e.id, false)} className="h-9 px-3 rounded-lg bg-white/8 text-[#FF8A8A] text-xs font-bold">{tr('adm.rechazar')}</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Sedes candidatas con expediente completo (llegan de /alta-local) */}
      {sedesPend.map(e => (
        <div key={e.id} className="card-premium p-3.5 mb-2">
          <button onClick={() => setAbierto(a => a === e.id ? null : e.id)} className="w-full flex items-center gap-3 text-left">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#0A0A0F] font-black bg-[#4F8EF7]">{e.nombre[0]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{e.nombre} <Etiqueta texto={tr('adm.rolSede')} /></p>
              <p className="text-[11px] text-[#8B8BA8]">{e.zona} · {e.setups} setups · {tr('adm.aforo')} {e.aforo}</p>
            </div>
            <ChevronRight size={15} className={`text-[#6B6B85] transition-transform ${abierto === e.id ? 'rotate-90' : ''}`} />
          </button>
          {abierto === e.id && (
            <div className="mt-3 pt-3 border-t border-white/8 space-y-1.5 animate-slide-up-sm">
              <Dato icon={UserRound} label={tr('adm.representante')} valor={e.representante} />
              <Dato icon={Mail} label={tr('adm.correo')} valor={e.email} />
              <Dato icon={Phone} label={tr('adm.telefono')} valor={e.telefono} />
              <Dato icon={Landmark} label={tr('adm.cif')} valor={e.cif} />
              <Dato icon={MapPin} label={tr('adm.direccion')} valor={e.direccion} />
              <Dato icon={FileText} label={tr('adm.documentacion')} valor={e.docs.join(' · ')} />
              <div className="flex gap-2 pt-2">
                <button onClick={() => resolverSede(e.id, true)} className="flex-1 h-9 rounded-lg bg-[#B6FF3A] text-[#0A0A0F] text-xs font-bold flex items-center justify-center gap-1"><Check size={14} /> {tr('adm.aprobarSede')}</button>
                <button onClick={() => resolverSede(e.id, false)} className="h-9 px-3 rounded-lg bg-white/8 text-[#FF8A8A] text-xs font-bold">{tr('adm.rechazar')}</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {sedesPend.length === 0 && tosPend.length === 0 && perfilTO !== 'pendiente' && (
        <p className="text-sm text-[#8B8BA8] card-premium p-4 text-center">{tr('adm.todoVerificado')}</p>
      )}

      {/* Historial de resoluciones (persistido) */}
      {resueltos.length > 0 && (
        <>
          <p className="eyebrow eyebrow-muted mt-6 mb-2.5">{tr('adm.resueltos')}</p>
          <div className="space-y-1.5">
            {resueltos.map(r => (
              <div key={r.id} className="card-premium px-3.5 py-2.5 flex items-center gap-2.5 opacity-80">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${r.ok ? 'bg-[#B6FF3A]/12 text-[#B6FF3A]' : 'bg-[#FF6076]/12 text-[#FF8A8A]'}`}>{r.ok ? <Check size={13} /> : <X size={13} />}</span>
                <p className="text-[13px] text-white font-semibold flex-1 truncate">{r.nombre} <Etiqueta texto={r.tipo} /></p>
                <span className={`text-[10px] font-black uppercase ${r.ok ? 'text-[#B6FF3A]' : 'text-[#FF8A8A]'}`}>{r.ok ? tr('adm.aprobado') : tr('adm.rechazado')}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Torneos (editar · moderar chat · cancelar) ──────────────────────────────
function SecTorneos({ torneos, cancelar, editar, chats }: {
  torneos: TorneoSample[]
  cancelar: (id: string, nombre: string) => void
  editar: (id: string, patch: Partial<TorneoSample>) => void
  chats: Record<string, { autor: string; texto: string; hora: string }[]>
}) {
  const { t: tr } = useT()
  const [filtro, setFiltro] = useState('')
  const [editando, setEditando] = useState<string | null>(null)
  const [chatDe, setChatDe] = useState<string | null>(null)
  const lista = torneos.filter(t => !filtro || t.nombre.toLowerCase().includes(filtro.toLowerCase()) || t.juego.includes(filtro.toLowerCase()))
  return (
    <div>
      <Titulo texto={tr('adm.torneosTitulo')} sub={tr('adm.torneosSub')} />
      <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder={tr('adm.buscarTorneo')}
        className="w-full h-11 px-3.5 mb-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none" />
      <div className="space-y-2">
        {lista.map(t => {
          const j = JUEGOS[t.juego]
          return (
            <div key={t.id} className="card-premium p-3">
              <div className="flex items-center gap-3">
                <span className="w-1 self-stretch rounded-full shrink-0" style={{ background: j?.color ?? '#B6FF3A' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{t.nombre} {t.enDirecto && <span className="badge-live ml-1">Live</span>}</p>
                  <p className="text-[11px] text-[#8B8BA8]">{j?.corto} · {t.fechaLabel} · <span className="font-mono-num">{t.inscritos}/{t.plazas}</span> · {t.precio === 0 ? tr('explorar.gratis') : `${t.precio}€`} · {ORGANIZADORES[t.organizadorId ?? '']?.nombre ?? tr('adm.toDemo')}</p>
                </div>
                <button onClick={() => { setEditando(e => e === t.id ? null : t.id); setChatDe(null) }} aria-label={`Editar ${t.nombre}`}
                  className="h-8 w-8 rounded-lg bg-white/6 hover:bg-white/12 text-[#B8B8CC] hover:text-white flex items-center justify-center transition-colors"><Pencil size={13} /></button>
                <button onClick={() => { setChatDe(c => c === t.id ? null : t.id); setEditando(null) }} aria-label={`Chat de ${t.nombre}`}
                  className="h-8 w-8 rounded-lg bg-white/6 hover:bg-white/12 text-[#B8B8CC] hover:text-white flex items-center justify-center transition-colors"><MessagesSquare size={13} /></button>
                <button onClick={() => cancelar(t.id, t.nombre)} aria-label={`Cancelar ${t.nombre}`}
                  className="h-8 px-2.5 rounded-lg bg-white/6 hover:bg-[#FF6B6B]/20 text-[#FF8A8A] text-[11px] font-bold inline-flex items-center gap-1 transition-colors"><Ban size={12} /> {tr('adm.cancelar')}</button>
              </div>
              {editando === t.id && <EditorTorneo t={t} onSave={patch => { editar(t.id, patch); setEditando(null) }} />}
              {chatDe === t.id && <ChatModeracion torneoId={t.id} extra={chats[t.id] ?? []} />}
            </div>
          )
        })}
        {lista.length === 0 && <p className="text-sm text-[#8B8BA8] card-premium p-4 text-center">{tr('adm.sinResultados')} «{filtro}».</p>}
      </div>
    </div>
  )
}

function EditorTorneo({ t, onSave }: { t: { nombre: string; fechaLabel: string; precio: number; plazas: number; categoria?: CategoriaTorneo }; onSave: (p: { nombre: string; fechaLabel: string; precio: number; plazas: number; categoria?: CategoriaTorneo }) => void }) {
  const { t: tr } = useT()
  const [nombre, setNombre] = useState(t.nombre)
  const [fecha, setFecha] = useState(t.fechaLabel)
  const [precio, setPrecio] = useState(t.precio)
  const [plazas, setPlazas] = useState(t.plazas)
  // Sello de puntuación: comunidad (por defecto), Oficial ×4 o Super Major ×10.
  // Lo asigna SOLO Torneum — este era el control que faltaba (el copy de
  // crear-torneo ya lo prometía).
  const [categoria, setCategoria] = useState<CategoriaTorneo>(t.categoria ?? 'comunidad')
  return (
    <div className="mt-3 pt-3 border-t border-white/8 space-y-2 animate-slide-up-sm">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-[#8B8BA8] font-semibold">{tr('adm.nombre')}</span>
          <input value={nombre} onChange={e => setNombre(e.target.value)} className="mt-1 w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#B6FF3A]/60" />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-[#8B8BA8] font-semibold">{tr('adm.fecha')}</span>
          <input value={fecha} onChange={e => setFecha(e.target.value)} className="mt-1 w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#B6FF3A]/60" />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-[#8B8BA8] font-semibold">{tr('adm.precioEur')}</span>
          <input type="number" min={0} value={precio} onChange={e => setPrecio(Math.max(0, +e.target.value))} className="mt-1 w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#B6FF3A]/60" />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-[#8B8BA8] font-semibold">{tr('adm.plazas')}</span>
          <input type="number" min={4} value={plazas} onChange={e => setPlazas(Math.max(4, +e.target.value))} className="mt-1 w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#B6FF3A]/60" />
        </label>
      </div>
      <div>
        <span className="text-[10px] uppercase tracking-wider text-[#8B8BA8] font-semibold">{tr('adm.sello')}</span>
        <div className="mt-1.5 flex rounded-lg border border-white/10 bg-white/4 p-0.5">
          {(Object.keys(CATEGORIAS) as CategoriaTorneo[]).map(c => {
            const on = categoria === c
            const info = CATEGORIAS[c]
            return (
              <button key={c} onClick={() => setCategoria(c)} title={`${info.label} · base ${info.base} pts`}
                className="flex-1 h-8 rounded-md text-[11px] font-bold transition-colors"
                style={on ? { background: `${info.color}22`, color: info.color, boxShadow: `inset 0 0 0 1px ${info.color}55` } : { color: '#8B8BA8' }}>
                {info.corto}
              </button>
            )
          })}
        </div>
      </div>
      <button onClick={() => onSave({ nombre: nombre.trim() || t.nombre, fechaLabel: fecha.trim() || t.fechaLabel, precio, plazas, categoria })}
        className="w-full h-10 rounded-lg bg-[#B6FF3A] text-[#0A0A0F] text-xs font-bold">{tr('adm.guardarCambios')}</button>
      <p className="text-[10px] text-[#8B8BA8]">{tr('adm.cambiosNota')}</p>
    </div>
  )
}

function ChatModeracion({ torneoId, extra }: { torneoId: string; extra: { autor: string; texto: string; hora: string }[] }) {
  // Moderación PERSISTIDA en el store: los silenciados no pueden escribir y los
  // mensajes borrados desaparecen del chat del jugador (ChatTorneo lo aplica).
  const { t: tr } = useT()
  const moderacion = useDemoStore(s => s.moderacionChat[torneoId])
  const alternarSilenciado = useDemoStore(s => s.alternarSilenciado)
  const alternarBorrado = useDemoStore(s => s.alternarBorrado)
  const silenciados = moderacion?.silenciados ?? []
  const borrados = moderacion?.borrados ?? []
  const mensajes = [...(CHAT_SEED[torneoId] ?? []), ...extra]
  const toggleMute = (autor: string) => alternarSilenciado(torneoId, autor)
  return (
    <div className="mt-3 pt-3 border-t border-white/8 animate-slide-up-sm">
      <p className="text-[10px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-2">{tr('adm.chatModeracion')}</p>
      {mensajes.length === 0 && <p className="text-xs text-[#8B8BA8]">{tr('adm.chatVacio')}</p>}
      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {mensajes.map((m, i) => {
          const mute = silenciados.includes(m.autor)
          const fuera = borrados.includes(i)
          return (
            <div key={i} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${fuera ? 'opacity-40 bg-white/[0.02]' : 'bg-white/[0.04]'}`}>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] leading-snug"><span className={`font-bold ${mute ? 'text-[#FF8A5C]' : 'text-white'}`}>{m.autor}</span> <span className="text-[#6B6B85] font-mono-num">· {m.hora}</span></p>
                <p className={`text-[12px] ${fuera ? 'line-through text-[#6B6B85]' : 'text-[#D4D4E4]'}`}>{m.texto}</p>
              </div>
              <button onClick={() => toggleMute(m.autor)} aria-label={mute ? `Quitar silencio a ${m.autor}` : `Silenciar a ${m.autor}`}
                className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${mute ? 'bg-[#FF8A5C]/20 text-[#FF8A5C]' : 'bg-white/6 text-[#8B8BA8] hover:text-white'}`}><VolumeX size={12} /></button>
              <button onClick={() => alternarBorrado(torneoId, i)} aria-label={fuera ? 'Restaurar mensaje' : 'Eliminar mensaje'}
                className="h-7 w-7 rounded-md bg-white/6 text-[#8B8BA8] hover:text-[#FF8A8A] flex items-center justify-center transition-colors">{fuera ? <RotateCcw size={12} /> : <X size={12} />}</button>
            </div>
          )
        })}
      </div>
      {silenciados.length > 0 && (
        <p className="mt-2 text-[10px] text-[#FF8A5C] font-semibold">{tr('adm.silenciadosPre')} {silenciados.join(', ')} {tr('adm.silenciadosPost')}</p>
      )}
    </div>
  )
}

// ── Sedes de la red (ficha completa + edición) ───────────────────────────────
type FichaSede = { contacto: string; email: string; telefono: string; cif: string; direccion: string; suspendida: boolean; precioNoche: number }
function fichaInicial(l: Local): FichaSede {
  return {
    contacto: `Gerencia ${l.nombre}`, email: `contacto@${l.id}.es`, telefono: '+34 910 00 00 00',
    cif: `B-8${(l.id.length * 7919).toString().padStart(7, '0')}`, direccion: `${l.zona}, Madrid`,
    suspendida: false, precioNoche: l.precioNoche,
  }
}
// Rol de TO por sede: toda sede lo trae activo de serie; aquí el admin lo
// desactiva o lo sube a Pro (torneos oficiales, majors, comisión reducida).
function SecSedes() {
  // Overrides PERSISTIDOS en el store (antes la edición y la suspensión se
  // perdían al recargar). La tarifa editada aquí alimenta el precio unificado.
  const { t: tr } = useT()
  const overrides = useDemoStore(s => s.fichasSede)
  const patchFicha = useDemoStore(s => s.patchFichaSede)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)
  const fichas: Record<string, FichaSede> = Object.fromEntries(
    Object.values(LOCALES).map(l => [l.id, { ...fichaInicial(l), ...overrides[l.id] }]))
  const patch = (id: string, p: Partial<FichaSede>) => patchFicha(id, p)
  return (
    <div>
      <Titulo texto={tr('adm.sedesTitulo')} sub={tr('adm.sedesSub')} />
      <div className="space-y-2">
        {Object.values(LOCALES).map(l => {
          const f = fichas[l.id]
          const on = abierta === l.id
          return (
            <div key={l.id} className={`card-premium p-3 ${f.suspendida ? 'opacity-60' : ''}`}>
              <button onClick={() => { setAbierta(a => a === l.id ? null : l.id); setEditando(false) }} className="w-full flex items-center gap-3 text-left">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#0A0A0F] font-black text-sm shrink-0" style={{ background: l.color }}>{l.nombre[0]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{l.nombre} {l.fundador && <span className="text-[9px] font-black text-[#E0BE63] uppercase">{tr('adm.fundadora')}</span>}{f.suspendida && <span className="ml-1.5 text-[9px] font-black text-[#FF8A8A] uppercase">{tr('adm.suspendida')}</span>}</p>
                  <p className="text-[11px] text-[#8B8BA8]">{l.zona} · {tr('adm.aforo')} <span className="font-mono-num">{l.aforo}</span> · <span className="font-mono-num">{f.precioNoche}€</span>/{tr('ml.noche')} · <Star size={9} className="inline text-[#E0BE63]" /> {l.rating}</p>
                </div>
                <ChevronRight size={15} className={`text-[#6B6B85] transition-transform ${on ? 'rotate-90' : ''}`} />
              </button>
              {on && (
                <div className="mt-3 pt-3 border-t border-white/8 animate-slide-up-sm">
                  {!editando ? (
                    <div className="space-y-1.5">
                      <Dato icon={UserRound} label={tr('adm.contacto')} valor={f.contacto} />
                      <Dato icon={Mail} label={tr('adm.correo')} valor={f.email} />
                      <Dato icon={Phone} label={tr('adm.telefono')} valor={f.telefono} />
                      <Dato icon={Landmark} label={tr('adm.cif')} valor={f.cif} />
                      <Dato icon={MapPin} label={tr('adm.direccion')} valor={f.direccion} />
                      <Dato icon={Store} label={tr('ml.espacio')} valor={`${l.m2} m² · ${l.setups} setups · ${l.mesas.length} ${tr('sede.mesas')}`} />
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => setEditando(true)} className="flex-1 h-9 rounded-lg bg-white/8 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"><Pencil size={12} /> {tr('adm.editarFicha')}</button>
                        <button onClick={() => patch(l.id, { suspendida: !f.suspendida })}
                          className={`h-9 px-3 rounded-lg text-xs font-bold ${f.suspendida ? 'bg-[#B6FF3A]/15 text-[#B6FF3A]' : 'bg-white/8 text-[#FF8A8A]'}`}>
                          {f.suspendida ? tr('adm.reactivar') : tr('adm.suspender')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {([['contacto', tr('adm.contacto')], ['email', tr('adm.correo')], ['telefono', tr('adm.telefono')], ['cif', tr('adm.cif')], ['direccion', tr('adm.direccion')]] as const).map(([k, label]) => (
                        <label key={k} className="block">
                          <span className="text-[10px] uppercase tracking-wider text-[#8B8BA8] font-semibold">{label}</span>
                          <input value={f[k]} onChange={e => patch(l.id, { [k]: e.target.value })}
                            className="mt-1 w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#B6FF3A]/60" />
                        </label>
                      ))}
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-wider text-[#8B8BA8] font-semibold">{tr('adm.tarifaNoche')}</span>
                        <input type="number" min={0} value={f.precioNoche} onChange={e => patch(l.id, { precioNoche: Math.max(0, +e.target.value) })}
                          className="mt-1 w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#B6FF3A]/60" />
                      </label>
                      <button onClick={() => setEditando(false)} className="w-full h-10 rounded-lg bg-[#B6FF3A] text-[#0A0A0F] text-xs font-bold">{tr('adm.guardarFicha')}</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Usuarios (suspensiones persistidas en el store) ─────────────────────────
function SecUsuarios() {
  const { t: tr } = useT()
  const suspendidos = useDemoStore(s => s.usuariosSuspendidos)
  const alternar = useDemoStore(s => s.alternarUsuarioSuspendido)
  const [reset, setReset] = useState<string | null>(null)
  return (
    <div>
      <Titulo texto={tr('adm.secUsuarios')} sub={tr('adm.usuariosSub')} />
      <div className="space-y-2">
        {USUARIOS_INICIALES.map(u => {
          const susp = suspendidos.includes(u.id)
          return (
            <div key={u.id} className={`card-premium p-3 flex items-center gap-3 ${susp ? 'opacity-60' : ''}`}>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/8 text-white font-black text-sm shrink-0">{u.nombre[0]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{u.nombre} <Etiqueta texto={ROL_CLAVE[u.rol] ? tr(ROL_CLAVE[u.rol]) : u.rol} />{susp && <span className="ml-1.5 text-[9px] font-black text-[#FF8A8A] uppercase">{tr('adm.suspendido')}</span>}</p>
                <p className="text-[11px] text-[#8B8BA8] truncate">{u.email} · {tr('adm.desde')} {u.desde}</p>
              </div>
              <button onClick={() => { setReset(u.id); setTimeout(() => setReset(null), 1600) }} aria-label={`Restablecer acceso de ${u.nombre}`}
                className={`h-8 px-2.5 rounded-lg text-[11px] font-bold transition-colors ${reset === u.id ? 'bg-[#B6FF3A]/15 text-[#B6FF3A]' : 'bg-white/6 text-[#B8B8CC] hover:text-white'}`}>
                {reset === u.id ? tr('adm.enviadoOk') : tr('adm.restablecer')}
              </button>
              <button onClick={() => alternar(u.id)}
                className={`h-8 px-2.5 rounded-lg text-[11px] font-bold ${susp ? 'bg-[#B6FF3A]/15 text-[#B6FF3A]' : 'bg-white/6 text-[#FF8A8A]'}`}>
                {susp ? tr('adm.reactivar') : tr('adm.suspender')}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Juegos (catálogo + propuestas) ───────────────────────────────────────────
function SecJuegos() {
  // Catálogo REAL: los juegos de serie + los dados de alta (persisten en el
  // store como juegosCustom y entran en JUEGOS, así toda la app los ve).
  const { t: tr } = useT()
  const juegosCustom = useDemoStore(st => st.juegosCustom)
  const crearJuego = useDemoStore(st => st.crearJuego)
  const pushNoti = useDemoStore(st => st.pushNoti)
  const catalogo = useMemo(() => Object.values(JUEGOS), [juegosCustom])
  const ocultos = useDemoStore(st => st.juegosOcultos)
  const alternar = useDemoStore(st => st.alternarJuegoOculto)
  const [alta, setAlta] = useState<null | { nombre?: string; color?: string }>(null)
  // Propuestas REALES del store: llegan de los TOs (crear-torneo → «Proponer
  // juego») y persisten. Aprobar da de alta con plantilla; rechazar avisa al TO.
  const propuestas = useDemoStore(st => st.propuestasJuego)
  const retirarPropuesta = useDemoStore(st => st.retirarPropuestaJuego)
  const rechazarPropuesta = useDemoStore(st => st.rechazarPropuestaJuego)

  const guardar = (j: Juego, propuestaId?: string) => {
    crearJuego(j)
    if (propuestaId) retirarPropuesta(propuestaId)
    pushNoti({ tipo: 'sistema', titulo: `${j.emoji} ${j.nombre} ${tr('adm.yaEnTorneum')}`, cuerpo: tr('adm.nuevoJuegoCuerpo'), href: '/explorar' })
    setAlta(null)
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <Titulo texto={tr('adm.catalogoTitulo')} sub={tr('adm.catalogoSub')} />
        <button onClick={() => setAlta({})} className="shrink-0 h-10 px-4 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold inline-flex items-center gap-1.5"><Plus size={15} /> {tr('adm.anadirJuego')}</button>
      </div>
      <div className="space-y-2">
        {catalogo.map(j => {
          const pl = plantillaDe(j.id)
          const activo = !ocultos.includes(j.id)
          return (
            <div key={j.id} className="card-premium p-3.5 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#0A0A0F] font-black shrink-0" style={{ background: j.color }}>{j.corto[0]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                  <Gamepad2 size={13} style={{ color: j.color }} /> {j.nombre}
                  {juegosCustom[j.id] && <span className="px-1.5 h-5 inline-flex items-center rounded-full text-[9px] font-bold uppercase tracking-wide bg-[#B6FF3A]/12 text-[#B6FF3A] border border-[#B6FF3A]/35">{tr('adm.altaAdmin')}</span>}
                </p>
                <p className="text-[11px] text-[#8B8BA8] truncate">{MODO_LABEL[pl.modo]} · {pl.bestOf} · {pl.formatos.length} {tr('adm.formatos')} · {pl.setups.map(x => SETUP_LABEL[x]).join('/')}{pl.online ? ' · online' : ''}</p>
              </div>
              <button onClick={() => alternar(j.id)} aria-label="Activar/desactivar" className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${activo ? 'bg-[#B6FF3A]' : 'bg-white/12'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${activo ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          )
        })}
      </div>
      <p className="eyebrow eyebrow-muted mt-6 mb-2.5">{tr('adm.propuestasTO')}</p>
      <div className="space-y-2">
        {propuestas.length === 0 && <p className="text-sm text-[#8B8BA8] card-premium p-4 text-center">{tr('adm.sinPropuestas')}</p>}
        {propuestas.map(pr => (
          <div key={pr.id} className="card-premium p-3.5 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#0A0A0F] font-black shrink-0" style={{ background: pr.color }}>{pr.nombre[0]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{pr.nombre}</p>
              <p className="text-[11px] text-[#8B8BA8]">{tr('adm.propuestoPor')} {pr.to}</p>
            </div>
            <button onClick={() => setAlta({ nombre: pr.nombre, color: pr.color })} className="h-9 px-3.5 rounded-lg bg-[#B6FF3A] text-[#0A0A0F] text-[12px] font-bold">{tr('adm.revisarAlta')}</button>
            <button onClick={() => rechazarPropuesta(pr.id)} aria-label="Rechazar" className="h-9 w-9 rounded-lg bg-white/6 text-[#FF6076] inline-flex items-center justify-center"><X size={15} /></button>
          </div>
        ))}
      </div>
      {alta && <AltaJuegoSheet inicial={alta} onGuardar={j => guardar(j, propuestas.find(x => x.nombre === alta.nombre)?.id)} onCerrar={() => setAlta(null)} />}
    </div>
  )
}

// ── Alta de juego con plantilla: elige un arquetipo y ajusta lo que quieras ──
const EMOJIS_ALTA = ['🎮', '🥊', '🃏', '♟️', '🛡️', '⚽', '🏎️', '🎯', '🧩', '🤖']
const COLORES_ALTA = ['#FF7A5C', '#5CC8FF', '#C05CFF', '#3FA65C', '#FF5CA8', '#E0BE63', '#2EC4B6', '#F4912B']

function slugDe(nombre: string): string {
  const base = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return JUEGOS[base] ? `${base}-2` : base || 'juego'
}

function AltaJuegoSheet({ inicial, onGuardar, onCerrar }: { inicial: { nombre?: string; color?: string }; onGuardar: (j: Juego) => void; onCerrar: () => void }) {
  const { t: tr } = useT()
  const [nombre, setNombre] = useState(inicial.nombre ?? '')
  const [corto, setCorto] = useState(inicial.nombre?.split(' ')[0] ?? '')
  const [cortoTocado, setCortoTocado] = useState(!!inicial.nombre)
  const [emoji, setEmoji] = useState('🎮')
  const [color, setColor] = useState(inicial.color ?? COLORES_ALTA[0])
  const [presetId, setPresetId] = useState<string | null>(null)
  const [pl, setPl] = useState<PlantillaJuego | null>(null)
  const [nuevoFormato, setNuevoFormato] = useState('')

  const aplicarPreset = (id: string) => {
    setPresetId(id)
    setPl({ preset: id, ...presetDe(id).plantilla })
  }
  const patch = (x: Partial<PlantillaJuego>) => setPl(prev => prev ? { ...prev, ...x } : prev)
  const listo = nombre.trim().length >= 2 && !!pl

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onCerrar} />
      <div className="relative w-full max-w-lg bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#141822] px-5 pt-5 pb-3 border-b border-white/6 flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-white text-display">{tr('adm.altaTitulo')}</p>
            <p className="text-[11px] text-[#8B8BA8]">{tr('adm.altaSub')}</p>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="h-8 w-8 rounded-full bg-white/8 flex items-center justify-center text-[#B8B8CC]"><X size={15} /></button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Identidad */}
          <div className="space-y-2.5">
            <p className="eyebrow eyebrow-muted">{tr('adm.identidad')}</p>
            <input value={nombre} onChange={e => { setNombre(e.target.value); if (!cortoTocado) setCorto(e.target.value.split(' ')[0]) }} placeholder={tr('adm.nombreJuegoPh')}
              className="w-full h-12 px-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-[#6B6B85] focus:border-[#B6FF3A]/60 outline-none" />
            <div className="flex gap-2.5">
              <input value={corto} onChange={e => { setCorto(e.target.value); setCortoTocado(true) }} placeholder={tr('adm.nombreCortoPh')}
                className="w-36 h-11 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-[#6B6B85] focus:border-[#B6FF3A]/60 outline-none" />
              <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide">
                {EMOJIS_ALTA.map(e => (
                  <button key={e} onClick={() => setEmoji(e)} className={`shrink-0 h-9 w-9 rounded-lg text-lg inline-flex items-center justify-center border transition-all ${emoji === e ? 'bg-white/10 border-[#B6FF3A]/60' : 'border-transparent hover:bg-white/5'}`}>{e}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {COLORES_ALTA.map(c => (
                <button key={c} onClick={() => setColor(c)} aria-label={`Color ${c}`}
                  className={`h-7 w-7 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-white/70 ring-offset-2 ring-offset-[#141822]' : 'hover:scale-105'}`} style={{ background: c }} />
              ))}
            </div>
          </div>

          {/* Arquetipo: la clave para que sea genérico y fácil */}
          <div>
            <p className="eyebrow eyebrow-muted mb-2">{tr('adm.comoCompite')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESETS_JUEGO.map(p => (
                <button key={p.id} onClick={() => aplicarPreset(p.id)}
                  className={`text-left rounded-xl border px-3 py-2.5 transition-all ${presetId === p.id ? 'border-[#B6FF3A]/60 bg-[#B6FF3A]/8' : 'border-white/10 bg-white/4 hover:bg-white/[0.07]'}`}>
                  <p className="text-[13px] font-bold text-white">{p.emoji} {p.label}</p>
                  <p className="text-[11px] text-[#8B8BA8]">{p.ejemplos}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Ajustes finos (aparecen con el arquetipo elegido, todo editable) */}
          {pl && (
            <div className="space-y-4 animate-slide-up-sm">
              <div>
                <p className="eyebrow eyebrow-muted mb-2">{tr('adm.modoTam')}</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(MODO_LABEL) as ModoJuego[]).map(m => (
                    <button key={m} onClick={() => patch({ modo: m, tamGrupo: m === '1v1' ? 2 : m === 'equipos' ? 5 : m === 'lobbies' ? 8 : 4 })}
                      className={`px-3 h-9 rounded-xl text-xs font-semibold border transition-all ${pl.modo === m ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border-[#B6FF3A]/45' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>{MODO_LABEL[m]}</button>
                  ))}
                </div>
                {pl.modo !== '1v1' && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-[#B8B8CC]">
                    {pl.modo === 'equipos' ? tr('adm.porEquipo') : pl.modo === 'lobbies' ? tr('adm.porLobby') : tr('adm.porMesa')}
                    <button onClick={() => patch({ tamGrupo: Math.max(2, pl.tamGrupo - 1) })} className="h-8 w-8 rounded-lg bg-white/6 text-white font-bold">−</button>
                    <span className="w-8 text-center font-bold text-white font-mono-num">{pl.tamGrupo}</span>
                    <button onClick={() => patch({ tamGrupo: Math.min(16, pl.tamGrupo + 1) })} className="h-8 w-8 rounded-lg bg-white/6 text-white font-bold">+</button>
                  </div>
                )}
              </div>

              <div>
                <p className="eyebrow eyebrow-muted mb-2">{tr('adm.formatosTO')}</p>
                <div className="flex flex-wrap gap-2">
                  {pl.formatos.map(f => (
                    <span key={f} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-semibold bg-[#B6FF3A]/12 text-[#D6FF8A] border border-[#B6FF3A]/30">
                      {f}
                      <button onClick={() => patch({ formatos: pl.formatos.filter(x => x !== f) })} aria-label={`Quitar ${f}`} className="text-[#8B8BA8] hover:text-white"><X size={11} /></button>
                    </span>
                  ))}
                </div>
                <form className="mt-2 flex gap-2" onSubmit={e => { e.preventDefault(); const v = nuevoFormato.trim(); if (v && !pl.formatos.includes(v)) { patch({ formatos: [...pl.formatos, v] }); setNuevoFormato('') } }}>
                  <input value={nuevoFormato} onChange={e => setNuevoFormato(e.target.value)} placeholder={tr('adm.anadirFormatoPh')}
                    className="flex-1 h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-[#6B6B85] focus:border-[#B6FF3A]/60 outline-none" />
                  <button type="submit" className="h-10 px-3.5 rounded-xl bg-white/8 border border-white/15 text-white text-sm font-bold">{tr('adm.anadir')}</button>
                </form>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="eyebrow eyebrow-muted block mb-1.5">{tr('adm.setsDefecto')}</span>
                  <input value={pl.bestOf} onChange={e => patch({ bestOf: e.target.value })}
                    className="w-full h-11 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none" />
                </label>
                <label className="block">
                  <span className="eyebrow eyebrow-muted block mb-1.5">{tr('adm.labelMain')}</span>
                  <input value={pl.labelMain} onChange={e => patch({ labelMain: e.target.value })} placeholder="Main / Deck / Club…"
                    className="w-full h-11 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none" />
                </label>
              </div>

              <div>
                <p className="eyebrow eyebrow-muted mb-2">{tr('adm.comoReporta')}</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(REPORTE_LABEL) as ReporteJuego[]).map(r => (
                    <button key={r} onClick={() => patch({ reporte: r })}
                      className={`px-3 h-9 rounded-xl text-xs font-semibold border transition-all ${pl.reporte === r ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border-[#B6FF3A]/45' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>{REPORTE_LABEL[r]}</button>
                  ))}
                </div>
              </div>

              <div className="flex items-end justify-between gap-4">
                <div className="flex-1">
                  <p className="eyebrow eyebrow-muted mb-2">{tr('adm.setupsPide')}</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(SETUP_LABEL) as SetupJuego[]).map(st => {
                      const on = pl.setups.includes(st)
                      return (
                        <button key={st} onClick={() => patch({ setups: on ? pl.setups.filter(x => x !== st) : [...pl.setups, st] })}
                          className={`px-3 h-9 rounded-xl text-xs font-semibold border transition-all ${on ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border-[#B6FF3A]/45' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>{SETUP_LABEL[st]}</button>
                      )
                    })}
                  </div>
                </div>
                <button onClick={() => patch({ online: !pl.online })} className="flex items-center gap-2 pb-0.5">
                  <span className="text-sm text-white font-medium">{tr('ranking.online')}</span>
                  <span className={`relative w-11 h-6 rounded-full transition-colors ${pl.online ? 'bg-[#B6FF3A]' : 'bg-white/12'}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${pl.online ? 'left-[22px]' : 'left-0.5'}`} />
                  </span>
                </button>
              </div>

              {/* Resumen: lo que la app hará con este juego */}
              <div className="rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-3 text-[12px] text-[#B8B8CC] leading-relaxed">
                <span className="font-bold text-white">{emoji} {nombre || tr('adm.esteJuego')}</span> {tr('adm.resComo')} <span className="text-white">{MODO_LABEL[pl.modo].toLowerCase()}</span>{pl.modo !== '1v1' ? ` (${tr('adm.resGrupos')} ${pl.tamGrupo})` : ''}{tr('adm.resA')}<span className="text-white">{pl.bestOf}</span>{tr('adm.resReporte')}<span className="text-white">{REPORTE_LABEL[pl.reporte].toLowerCase()}</span>{tr('adm.resSedes')}{pl.setups.map(x => SETUP_LABEL[x].toLowerCase()).join(tr('adm.resO')) || tr('adm.resCualquier')}{pl.online ? tr('adm.resOnline') : tr('adm.resPresencial')}.
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-[#141822] px-5 pb-5 pt-3 border-t border-white/6">
          <button disabled={!listo}
            onClick={() => pl && onGuardar({ id: slugDe(nombre), nombre: nombre.trim(), corto: corto.trim() || nombre.trim().split(' ')[0], color, emoji, plantilla: pl })}
            className="w-full h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-bold disabled:opacity-40">
            {pl ? tr('adm.anadirCatalogo') : tr('adm.eligeCompite')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Incidencias: el admin VIGILA y, si el TO no responde, INTERVIENE ─────────
function SecIncidencias({ reportes, disputas }: {
  reportes: { id: string; torneoNombre: string; tipo: string; motivo: string; estado: string }[]
  disputas: { id: string; torneoId: string; mesa: number; a: string; b: string }[]
}) {
  const { t: tr } = useT()
  const resolverReporte = useDemoStore(s => s.resolverReporte)
  const resolverDisputa = useDemoStore(s => s.resolverDisputa)
  return (
    <div>
      <Titulo texto={tr('adm.secIncidencias')} sub={tr('adm.incidSub')} />
      <p className="eyebrow eyebrow-muted mb-2.5">{tr('adm.reportesJugadores')}</p>
      <div className="space-y-2 mb-6">
        {reportes.length === 0 && <p className="text-sm text-[#8B8BA8] card-premium p-4 text-center">{tr('adm.sinReportes')}</p>}
        {reportes.map(r => (
          <div key={r.id} className="card-premium p-3.5 flex items-center gap-3">
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${r.estado === 'abierto' ? 'bg-[#FF8A5C]/15 text-[#FF8A5C]' : 'bg-[#B6FF3A]/12 text-[#B6FF3A]'}`}><MessageSquareWarning size={15} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{r.torneoNombre} <Etiqueta texto={r.tipo} /></p>
              <p className="text-[11px] text-[#8B8BA8] truncate">{r.motivo}</p>
            </div>
            {r.estado === 'abierto' ? (
              <button onClick={() => resolverReporte(r.id, 'rebatido', tr('adm.cerradoEquipo'))}
                className="h-8 px-2.5 rounded-lg bg-white/8 text-white text-[11px] font-bold shrink-0 hover:bg-white/12 transition-colors">{tr('adm.cerrarReporte')}</button>
            ) : (
              <span className="text-[10px] font-black uppercase text-[#B6FF3A]">{r.estado}</span>
            )}
          </div>
        ))}
      </div>
      <p className="eyebrow eyebrow-muted mb-2.5">{tr('adm.disputasResultado')}</p>
      <div className="space-y-2">
        {disputas.length === 0 && <p className="text-sm text-[#8B8BA8] card-premium p-4 text-center">{tr('adm.sinDisputas')}</p>}
        {disputas.map(d => (
          <div key={d.id} className="card-premium p-3.5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF6076]/15 text-[#FF6076]"><ShieldAlert size={15} /></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{tr('adm.mesa')} {d.mesa} · {d.a} vs {d.b}</p>
                <p className="text-[11px] text-[#8B8BA8]">{tr('adm.ambosReclaman')}</p>
              </div>
              <span className="text-[10px] font-black uppercase text-[#FF8A5C]">{tr('adm.abierta')}</span>
            </div>
            <div className="mt-2.5 flex gap-2">
              <button onClick={() => resolverDisputa(d.id, 'a')} className="flex-1 h-9 rounded-lg bg-white/8 text-white text-[12px] font-bold hover:bg-white/12 transition-colors">{tr('adm.forzarGana')} {d.a}</button>
              <button onClick={() => resolverDisputa(d.id, 'b')} className="flex-1 h-9 rounded-lg bg-white/8 text-white text-[12px] font-bold hover:bg-white/12 transition-colors">{tr('adm.forzarGana')} {d.b}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Acceso (beta cerrada; persistido en el store) ────────────────────────────
function SecAcceso() {
  const { t: tr } = useT()
  const betaCerrada = useDemoStore(s => s.betaCerrada)
  const setBetaCerrada = useDemoStore(s => s.setBetaCerrada)
  const codigos = useDemoStore(s => s.codigosBeta)
  const agregarCodigo = useDemoStore(s => s.agregarCodigoBeta)
  const [copiado, setCopiado] = useState<string | null>(null)
  return (
    <div>
      <Titulo texto={tr('adm.accesoTitulo')} sub={tr('adm.accesoSub')} />
      <div className="card-premium p-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#4F8EF7]/15 text-[#4F8EF7]"><KeyRound size={18} /></span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{tr('adm.betaCerrada')}</p>
            <p className="text-xs text-[#8B8BA8]">{betaCerrada ? tr('adm.soloCodigo') : tr('adm.registroAbierto')}</p>
          </div>
          <button onClick={() => setBetaCerrada(!betaCerrada)} aria-label="Abrir o cerrar la beta" className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${betaCerrada ? 'bg-[#4F8EF7]' : 'bg-white/12'}`}>
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
              <button onClick={() => agregarCodigo(`TOUR-${Math.random().toString(36).slice(2, 6).toUpperCase()}`)}
                className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-[#4F8EF7]/12 border border-[#4F8EF7]/40 text-[#4F8EF7] text-[11px] font-bold"><Plus size={12} /> {tr('adm.generarCodigo')}</button>
            </div>
            <p className="mt-2 text-[11px] text-[#8B8BA8]">{tr('adm.codigoAcceso')}</p>
          </div>
        )}
      </div>
      <div className="mt-4 card-premium p-4 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#B6FF3A]/12 text-[#B6FF3A]"><ShieldCheck size={18} /></span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{tr('adm.cuentasEquipo')}</p>
          <p className="text-xs text-[#8B8BA8]">{tr('adm.rolesTexto')}</p>
        </div>
      </div>
    </div>
  )
}

// ── Piezas compartidas ───────────────────────────────────────────────────────
function Titulo({ texto, sub }: { texto: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-bold text-white text-display">{texto}</h1>
      {sub && <p className="mt-1 text-[12px] text-[#8B8BA8] leading-relaxed">{sub}</p>}
    </div>
  )
}

function Etiqueta({ texto }: { texto: string }) {
  return <span className="ml-1 text-[9px] uppercase tracking-wide text-[#8B8BA8] font-bold">· {texto}</span>
}

function Dato({ icon: Icon, label, valor }: { icon: typeof Mail; label: string; valor: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="mt-0.5 text-[#8B8BA8] shrink-0" />
      <p className="text-[12px] text-[#D4D4E4] leading-snug"><span className="text-[#8B8BA8] font-semibold">{label}:</span> {valor}</p>
    </div>
  )
}

function FilaAviso({ color, icon, titulo, sub, onClick }: { color: string; icon: React.ReactNode; titulo: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full card-premium card-int p-4 flex items-center gap-3 text-left">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{ background: `${color}20`, color }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{titulo}</p>
        <p className="text-xs text-[#8B8BA8]">{sub}</p>
      </div>
      <ChevronRight size={15} className="text-[#6B6B85]" />
    </button>
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
