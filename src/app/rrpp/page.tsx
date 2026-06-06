'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, Link as LinkIcon, Wallet, ExternalLink, Check, X, ShieldOff, TrendingUp, Ticket, MessageCircle, Store, Eye, EyeOff, Pencil } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ChatRrpp } from '@/components/chat/ChatRrpp'
import { SectionCard, SectionTitle, EmptyState } from '@/components/local-panel/ui'
import { RrppNav } from '@/components/rrpp/RrppNav'
import { ChecklistCard } from '@/components/onboarding/ChecklistCard'
import { LocalDetalleRRPP } from '@/components/rrpp/LocalDetalleRRPP'
import { EditarPerfilRRPP } from '@/components/rrpp/EditarPerfilRRPP'
import { CobrosRRPP } from '@/components/rrpp/CobrosRRPP'
import { ActivarPushRRPP } from '@/components/rrpp/ActivarPush'

type LocalInfo = { id: string; nombre: string; foto_url: string | null; tier: string }
type Venue = {
  id: string; rrpp_id: string; local_id: string;
  comision_pct: number; estado: 'pendiente' | 'activa' | 'pausada' | 'archivada';
  locales: LocalInfo
}
type Liquidacion = {
  id: string; local_id: string; periodo: string;
  monto_total: number; num_ventas: number;
  estado: 'pendiente' | 'marcado_pagado' | 'confirmado' | 'disputado';
}
type RRPP = {
  id: string; slug: string; nombre_publico: string; foto_url: string | null;
  bio: string | null; instagram: string | null; tiktok: string | null;
  estado_alta: 'invitado' | 'completo';
  visible_en_busqueda: boolean;
}

export default function PanelRRPP() {
  const [rrpp, setRrpp] = useState<RRPP | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [liqs, setLiqs] = useState<Liquidacion[]>([])
  const [loading, setLoading] = useState(true)
  const [estado, setEstado] = useState<'sin_invitacion' | 'invitado' | 'completo' | 'no_auth'>('no_auth')

  useEffect(() => { void cargar() }, [])

  async function cargar() {
    setLoading(true)
    const r = await fetch('/api/rrpp/perfil', { credentials: 'include' })
    if (r.status === 401) { setEstado('no_auth'); setLoading(false); return }
    if (!r.ok) {
      // Si /perfil devuelve 401 con NO_INVITATION sería en /activar — aquí
      // /perfil simplemente no devuelve datos si no hay rrpp. Distinguimos:
      const j = await r.json().catch(() => ({}))
      if (j?.code === 'NO_INVITATION') setEstado('sin_invitacion')
      else setEstado('sin_invitacion')  // por defecto, sin perfil = sin invitación
      setLoading(false); return
    }
    const j = await r.json()
    if (!j.rrpp) { setEstado('sin_invitacion'); setLoading(false); return }
    setRrpp(j.rrpp); setVenues(j.venues ?? []); setLiqs(j.liquidaciones ?? [])
    setEstado(j.rrpp.estado_alta === 'invitado' ? 'invitado' : 'completo')
    setLoading(false)
  }

  if (loading) return <div className="p-6"><div className="skeleton h-32 rounded-2xl" /></div>
  if (estado === 'no_auth') return <NoAutenticado />
  if (estado === 'sin_invitacion') return <SinInvitacion />
  if (estado === 'invitado' && rrpp) return <CompletarPerfil rrpp={rrpp} onListo={cargar} />
  if (estado === 'completo' && rrpp) return <Dashboard rrpp={rrpp} venues={venues} liqs={liqs} onRecargar={cargar} />
  return null
}

// ════════════════════════════════════════════════════════════════
// Estado: NO autenticado
// ════════════════════════════════════════════════════════════════
function NoAutenticado() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <Sparkles className="w-12 h-12 text-rose-400 mb-4" />
      <h1 className="text-display text-3xl mb-2">Panel de RRPP</h1>
      <p className="text-secondary text-sm max-w-sm mb-6">
        Inicia sesión con tu cuenta para acceder. Si aún no tienes invitación, contacta con el local con el que quieras trabajar o con el administrador.
      </p>
      <Link href="/rrpp/login" className="btn-primary">Iniciar sesión</Link>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// Estado: SIN invitación
// ════════════════════════════════════════════════════════════════
function SinInvitacion() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <ShieldOff className="w-12 h-12 text-amber-400 mb-4" />
      <h1 className="text-display text-3xl mb-2">No tienes acceso al modo RRPP</h1>
      <p className="text-secondary text-sm max-w-md mb-6">
        Para ser RRPP en Rumbo debes ser invitado por un local que quiera trabajar contigo
        o dado de alta por el equipo de Rumbo. No es un perfil que puedas activar por tu cuenta —
        así controlamos quién promociona y la calidad de la red.
      </p>
      <div className="space-y-2 text-sm">
        <Link href="/mapa" className="btn-primary inline-flex items-center justify-center w-full sm:w-auto">
          Volver al mapa
        </Link>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// Estado: INVITADO (completar perfil)
// ════════════════════════════════════════════════════════════════
function CompletarPerfil({ rrpp, onListo }: { rrpp: RRPP; onListo: () => void }) {
  const [nombrePublico, setNombrePublico] = useState(rrpp.nombre_publico || '')
  const [slug, setSlug] = useState('')
  const [bio, setBio] = useState(rrpp.bio || '')
  const [instagram, setInstagram] = useState(rrpp.instagram || '')
  const [aceptaEdad, setAceptaEdad] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    setError(null); setEnviando(true)
    const r = await fetch('/api/rrpp/activar', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre_publico: nombrePublico,
        slug: slug || undefined,
        bio: bio || undefined,
        instagram: instagram.replace(/^@/, '') || undefined,
        edad_18_confirmada: aceptaEdad,
      }),
    })
    const j = await r.json()
    setEnviando(false)
    if (!r.ok) { setError(j.error || 'Error'); return }
    onListo()
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto p-4 sm:p-8 space-y-5">
        <Sparkles className="w-12 h-12 text-rose-400" />
        <div>
          <h1 className="text-display text-3xl">Completa tu perfil RRPP</h1>
          <p className="text-secondary text-sm mt-1">
            Te han invitado al programa. Configura tu nombre público y tu URL personal —
            después podrás aceptar la invitación del local desde tu panel.
          </p>
        </div>
        <label className="block">
          <span className="text-xs eyebrow eyebrow-rose">Nombre público</span>
          <input value={nombrePublico} onChange={e => setNombrePublico(e.target.value)}
            placeholder="Leo Noches" className="input mt-1 w-full" />
        </label>
        <label className="block">
          <span className="text-xs eyebrow eyebrow-rose">Slug (URL pública)</span>
          <input value={slug} onChange={e => setSlug(e.target.value)}
            placeholder="leo-noches" className="input mt-1 w-full" />
          <span className="text-tertiary text-xs">rumbomap.com/r/{slug || 'leo-noches'}</span>
        </label>
        <label className="block">
          <span className="text-xs eyebrow eyebrow-rose">Bio (opcional)</span>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
            placeholder="Llevo noches únicas a los mejores locales de Madrid"
            className="input mt-1 w-full" />
        </label>
        <label className="block">
          <span className="text-xs eyebrow eyebrow-rose">Instagram (opcional)</span>
          <input value={instagram} onChange={e => setInstagram(e.target.value)}
            placeholder="leo.noches" className="input mt-1 w-full" />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={aceptaEdad}
            onChange={e => setAceptaEdad(e.target.checked)} className="mt-1" />
          <span>Confirmo que soy mayor de 18 años y que cualquier obligación fiscal por
            comisiones cobradas es mía, no de Rumbo.</span>
        </label>
        {error && <p className="text-rose-300 text-sm">{error}</p>}
        <button onClick={enviar} disabled={!nombrePublico || !aceptaEdad || enviando}
          className="btn-primary w-full">
          {enviando ? 'Activando...' : 'Activar perfil RRPP'}
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// Estado: COMPLETO (dashboard)
// ════════════════════════════════════════════════════════════════
const MESES_ABREV = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(/\.00$/, '')} €`

/** Serie de los últimos 6 meses con el total ganado por periodo a partir de las liquidaciones. */
function serieGanancias(liqs: Liquidacion[]): { mes: string; total: number }[] {
  const hoy = new Date()
  const ventana: { periodo: string; mes: string; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    ventana.push({ periodo: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, mes: MESES_ABREV[d.getMonth()], total: 0 })
  }
  for (const l of liqs) {
    const fila = ventana.find(v => v.periodo === l.periodo)
    if (fila) fila.total += Number(l.monto_total || 0)
  }
  return ventana.map(({ mes, total }) => ({ mes, total: Math.round(total * 100) / 100 }))
}

/** KPI con gradiente de color, icono en chip e iluminación — más presencia. */
function KpiBold({ icon: Icon, color, label, value }: { icon: React.ElementType; color: string; label: string; value: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border p-3.5"
      style={{ borderColor: `${color}33`, background: `linear-gradient(150deg, ${color}1F, rgba(255,255,255,0.02) 60%)` }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: `${color}2E`, boxShadow: `0 4px 14px -6px ${color}` }}>
        <Icon size={15} style={{ color }} />
      </div>
      <p className="text-xl font-bold text-white text-display text-numeric leading-none">{value}</p>
      <p className="text-[11px] text-[#9DA0B5] mt-1">{label}</p>
    </div>
  )
}

function Dashboard({ rrpp, venues, liqs, onRecargar }: {
  rrpp: RRPP; venues: Venue[]; liqs: Liquidacion[]; onRecargar: () => void;
}) {
  async function responder(venueId: string, decision: 'aceptar' | 'rechazar') {
    const r = await fetch(`/api/rrpp/venues/${venueId}/respuesta`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    })
    if (r.ok) onRecargar()
  }

  async function toggleVisibilidad() {
    await fetch('/api/rrpp/visibilidad', {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible_en_busqueda: !rrpp.visible_en_busqueda }),
    })
    onRecargar()
  }

  const [copiado, setCopiado] = useState(false)
  const [copiadoLink, setCopiadoLink] = useState(false)
  const [conversaciones, setConversaciones] = useState<{ local_id: string; nombre: string; ultimo: string | null; no_leidos: number }[]>([])
  const [chatConLocal, setChatConLocal] = useState<{ local_id: string; nombre: string } | null>(null)
  const [localDetalle, setLocalDetalle] = useState<string | null>(null)
  const [editarPerfil, setEditarPerfil] = useState(false)
  useEffect(() => {
    fetch('/api/rrpp/chat').then(r => r.ok ? r.json() : null).then(d => { if (d) setConversaciones(d.conversaciones ?? []) }).catch(() => {})
  }, [chatConLocal])
  const codigoRef = (rrpp.slug || '').toUpperCase()
  const linkHost = typeof window !== 'undefined' ? window.location.host : 'rumbomap.com'
  const miLink = typeof window !== 'undefined' ? `${window.location.origin}/r/${rrpp.slug}` : `https://rumbomap.com/r/${rrpp.slug}`
  const pendientes = venues.filter(v => v.estado === 'pendiente')
  const activos = venues.filter(v => v.estado === 'activa')
  const pendiente = liqs.filter(l => l.estado === 'pendiente').reduce((s, l) => s + Number(l.monto_total), 0)
  const ventasMes = liqs.reduce((s, l) => s + l.num_ventas, 0)
  const totalMes = liqs.reduce((s, l) => s + Number(l.monto_total), 0)
  const serie = serieGanancias(liqs)
  const hayDatos = serie.some(s => s.total > 0)
  const noLeidosTotal = conversaciones.reduce((s, c) => s + c.no_leidos, 0)

  return (
    <div className="min-h-screen bg-[#07070D] text-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 pb-24">
        <ChecklistCard panel="rrpp" />
        {/* HERO — cabecera con balance destacado */}
        <div className="relative -mx-4 sm:-mx-6 -mt-4 sm:-mt-6">
          <div className="relative overflow-hidden rounded-b-[2rem] px-5 sm:px-7 pt-9 pb-7 border-b border-white/[0.06]"
            style={{ background: 'radial-gradient(130% 110% at 50% -10%, rgba(224,69,94,0.20), rgba(124,92,255,0.12) 45%, rgba(7,7,13,0) 78%)' }}>
            <div className="pointer-events-none absolute -top-24 -right-10 w-64 h-64 rounded-full bg-[#7C5CFF]/20 blur-[80px]" />
            <button onClick={() => setEditarPerfil(true)} aria-label="Editar perfil"
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
              <Pencil size={15} />
            </button>
            <div className="relative flex items-center gap-4">
              <div className="relative shrink-0">
                {rrpp.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={rrpp.foto_url} alt="" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#E0455E]/50 shadow-[0_8px_24px_-6px_rgba(224,69,94,0.7)]" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl holo-bg flex items-center justify-center text-display text-2xl font-black ring-2 ring-white/20 shadow-[0_8px_24px_-6px_rgba(124,92,255,0.7)]">
                    {rrpp.nombre_publico.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#27AE60] border-2 border-[#0A0A14] flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="eyebrow eyebrow-rose mb-1">Panel RRPP</p>
                <h1 className="text-display text-2xl md:text-3xl font-bold truncate leading-tight">{rrpp.nombre_publico}</h1>
                <a href={`/r/${rrpp.slug}`} target="_blank" rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-1 text-[11px] text-[#B8B8CC] hover:text-white transition-colors">
                  {linkHost}/r/{rrpp.slug} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Balance hero */}
            <div className="relative mt-7 flex items-end justify-between gap-3">
              <div>
                <p className="eyebrow eyebrow-rose mb-1.5">Pendiente de cobrar</p>
                <p className="text-[3.25rem] leading-none font-bold text-white text-display text-numeric">
                  {pendiente.toFixed(0)}<span className="text-2xl text-[#B8B8CC] ml-1">€</span>
                </p>
              </div>
              <div className="rounded-2xl bg-white/[0.06] border border-white/10 px-4 py-2.5 text-right backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-wider text-[#8B8BA8]">Generado este mes</p>
                <p className="text-xl font-bold text-white text-numeric mt-0.5">{eur(totalMes)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs en negrita */}
        <div className="grid grid-cols-3 gap-2.5">
          <KpiBold icon={Ticket} color="#4F8EF7" label="Ventas mes" value={ventasMes} />
          <KpiBold icon={Wallet} color="#7C5CFF" label="Generado" value={eur(totalMes)} />
          <KpiBold icon={Store} color="#27AE60" label="Locales" value={activos.length} />
        </div>

        {/* Gráfica de ganancias */}
        <SectionCard>
          <SectionTitle icon={TrendingUp} acento="rose">Tus ganancias · últimos 6 meses</SectionTitle>
          {hayDatos ? (
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={serie}>
                <defs>
                  <linearGradient id="gradRrpp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E0455E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E0455E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip
                  contentStyle={{ background: 'rgba(14,14,26,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                  formatter={(v: unknown) => [eur(Number(v)), 'Ganado'] as [string, string]}
                />
                <Area type="monotone" dataKey="total" stroke="#E0455E" fill="url(#gradRrpp)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="relative overflow-hidden rounded-xl border border-white/[0.06] px-4 py-6 text-center"
              style={{ background: 'linear-gradient(160deg, rgba(224,69,94,0.10), rgba(124,92,255,0.05) 70%, transparent)' }}>
              <div className="w-11 h-11 mx-auto rounded-xl bg-[#E0455E]/15 flex items-center justify-center mb-2.5">
                <TrendingUp className="w-5 h-5 text-[#E0455E]" />
              </div>
              <p className="text-white font-semibold text-sm">Aún sin ganancias</p>
              <p className="text-xs text-[#8B8BA8] mt-1 max-w-[16rem] mx-auto">Comparte tu código y tu link. Cuando la gente compre con tu atribución, lo verás crecer aquí.</p>
            </div>
          )}
        </SectionCard>

        {/* Pendiente por local */}
        {(() => {
          const nombreLocal: Record<string, string> = Object.fromEntries(venues.map(v => [v.local_id, v.locales?.nombre ?? 'Local']))
          const porLocal = Object.values(liqs.filter(l => l.estado === 'pendiente').reduce((acc, l) => {
            const k = l.local_id
            acc[k] = acc[k] || { nombre: nombreLocal[k] ?? 'Local', monto: 0, ventas: 0 }
            acc[k].monto += Number(l.monto_total); acc[k].ventas += l.num_ventas
            return acc
          }, {} as Record<string, { nombre: string; monto: number; ventas: number }>))
          if (porLocal.length === 0) return null
          return (
            <SectionCard>
              <SectionTitle icon={Wallet} acento="rose">Pendiente de cobrar · por local</SectionTitle>
              <div className="space-y-2">
                {porLocal.sort((a, b) => b.monto - a.monto).map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{p.nombre}</p>
                      <p className="text-[11px] text-[#8B8BA8]">{p.ventas} {p.ventas === 1 ? 'venta' : 'ventas'}</p>
                    </div>
                    <p className="text-base font-bold text-[#E0455E] text-numeric shrink-0">{eur(p.monto)}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )
        })()}

        {/* Cobros por mes — confirmar/disputar lo que el local marca como pagado */}
        <CobrosRRPP liqs={liqs} localNombre={(id) => venues.find(v => v.local_id === id)?.locales?.nombre ?? 'Local'} onChange={onRecargar} />

        {/* Código de referido */}
        <SectionCard premium>
          <p className="eyebrow eyebrow-rose mb-2">Tu código de referido</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-display text-2xl tracking-[0.2em] text-white bg-white/5 rounded-xl px-4 py-3 text-center">
              {codigoRef}
            </code>
            <button
              onClick={() => { navigator.clipboard?.writeText(codigoRef); setCopiado(true); setTimeout(() => setCopiado(false), 1500) }}
              className="shrink-0 h-12 px-4 rounded-xl bg-white/8 border border-white/10 text-white text-sm font-semibold hover:bg-white/12 transition-colors"
            >
              {copiado ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
          <p className="text-[#8B8BA8] text-xs mt-2">
            Dáselo a la gente: al registrarse en Rumbo con tu código, contamos sus entradas y consumiciones a tu nombre durante 24h.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <LinkIcon className="w-4 h-4 shrink-0 text-[#A0A0B8]" />
            <span className="flex-1 min-w-0 truncate text-[#A0A0B8] text-xs">{linkHost}/r/{rrpp.slug}</span>
            <button
              onClick={() => { navigator.clipboard?.writeText(miLink); setCopiadoLink(true); setTimeout(() => setCopiadoLink(false), 1500) }}
              className="shrink-0 h-8 px-3 rounded-lg bg-white/8 border border-white/10 text-white text-xs font-semibold hover:bg-white/12 transition-colors"
            >
              {copiadoLink ? '¡Copiado!' : 'Copiar link'}
            </button>
          </div>
        </SectionCard>

        {/* Mensajes con los locales */}
        {conversaciones.length > 0 && (
          <SectionCard>
            <SectionTitle icon={MessageCircle} acento="blue"
              accion={noLeidosTotal > 0 ? <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{noLeidosTotal}</span> : undefined}>
              Mensajes
            </SectionTitle>
            <div className="space-y-2">
              {conversaciones.map(c => (
                <button key={c.local_id} onClick={() => setChatConLocal({ local_id: c.local_id, nombre: c.nombre })}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 flex items-center gap-3 text-left hover:bg-white/[0.06] transition-colors">
                  <div className="w-10 h-10 rounded-full bg-rose-400/20 flex items-center justify-center shrink-0 font-semibold">{c.nombre.slice(0, 1)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{c.nombre}</p>
                    <p className="text-[#8B8BA8] text-xs truncate">{c.ultimo || 'Sin mensajes'}</p>
                  </div>
                  {c.no_leidos > 0 && <span className="shrink-0 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{c.no_leidos}</span>}
                </button>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Invitaciones pendientes */}
        {pendientes.length > 0 && (
          <SectionCard>
            <SectionTitle icon={Sparkles} acento="gold">Invitaciones pendientes ({pendientes.length})</SectionTitle>
            <div className="space-y-2">
              {pendientes.map(v => (
                <div key={v.id} className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3">
                  <div className="flex items-center gap-3">
                    {v.locales.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.locales.foto_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center"><Store size={16} className="text-[#6B6B85]" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{v.locales.nombre}</p>
                      <p className="text-[#8B8BA8] text-xs">Te ofrece <span className="text-[#E0455E] font-semibold">{v.comision_pct}%</span> por venta</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    <button onClick={() => responder(v.id, 'aceptar')}
                      className="btn-primary flex-1 inline-flex items-center justify-center gap-1 text-sm">
                      <Check className="w-4 h-4" /> Aceptar
                    </button>
                    <button onClick={() => responder(v.id, 'rechazar')}
                      className="btn-ghost text-sm inline-flex items-center gap-1">
                      <X className="w-4 h-4" /> Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Locales activos */}
        <SectionCard>
          <SectionTitle icon={Store} acento="green">Locales activos ({activos.length})</SectionTitle>
          {activos.length === 0 ? (
            <p className="text-[#8B8BA8] text-sm">Aún no trabajas con ningún local activo.</p>
          ) : (
            <div className="space-y-2">
              {activos.map(v => (
                <button key={v.id} onClick={() => setLocalDetalle(v.local_id)}
                  className="w-full text-left rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 flex items-center gap-3 hover:bg-white/[0.06] transition-colors">
                  {v.locales.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.locales.foto_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center"><Store size={16} className="text-[#6B6B85]" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{v.locales.nombre}</p>
                    <p className="text-[#8B8BA8] text-xs">{v.comision_pct}% por venta · ver ficha</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold text-emerald-300 bg-emerald-400/15 rounded-full px-2 py-0.5">Activo</span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Notificaciones push */}
        <ActivarPushRRPP />

        {/* Visibilidad */}
        <SectionCard>
          <SectionTitle icon={rrpp.visible_en_busqueda ? Eye : EyeOff} acento="violet">Tu cuenta</SectionTitle>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-white">Visible en el buscador de locales</p>
              <p className="text-[#8B8BA8] text-xs mt-0.5">
                {rrpp.visible_en_busqueda
                  ? 'Otros locales pueden encontrarte y proponerte trabajar juntos.'
                  : 'Solo los locales que ya conoces pueden invitarte por su lado.'}
              </p>
            </div>
            <button onClick={toggleVisibilidad}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                rrpp.visible_en_busqueda ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-[#8B8BA8]'
              }`}>
              {rrpp.visible_en_busqueda ? 'Visible' : 'Oculto'}
            </button>
          </div>
        </SectionCard>

        <footer className="text-center text-[#6B6B85] text-xs pt-4 border-t border-white/5">
          Rumbo no procesa el pago entre tú y el local. Las cifras de arriba son
          lo que el local te debe según las ventas atribuidas. El pago lo gestionáis vosotros.
        </footer>
      </div>

      {chatConLocal && (
        <ChatRrpp
          titulo={chatConLocal.nombre}
          getUrl={`/api/rrpp/chat?local_id=${chatConLocal.local_id}`}
          postUrl="/api/rrpp/chat"
          postBody={{ local_id: chatConLocal.local_id }}
          yo="rrpp"
          onClose={() => setChatConLocal(null)}
        />
      )}

      {localDetalle && <LocalDetalleRRPP localId={localDetalle} onClose={() => setLocalDetalle(null)} />}
      {editarPerfil && <EditarPerfilRRPP rrpp={rrpp} onClose={() => setEditarPerfil(false)} onSaved={() => { setEditarPerfil(false); onRecargar() }} />}
      <RrppNav />
    </div>
  )
}
