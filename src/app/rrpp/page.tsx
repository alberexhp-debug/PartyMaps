'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, Link as LinkIcon, Wallet, ExternalLink, Check, X, ShieldOff } from 'lucide-react'
import { ChatRrpp } from '@/components/chat/ChatRrpp'

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

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <header className="flex items-center gap-3">
          {rrpp.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={rrpp.foto_url} alt="" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-rose-400/20 flex items-center justify-center text-display">
              {rrpp.nombre_publico.slice(0, 1)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-display text-2xl truncate">{rrpp.nombre_publico}</h1>
            <a href={`/r/${rrpp.slug}`} target="_blank" rel="noreferrer"
              className="text-secondary text-xs inline-flex items-center gap-1 hover:underline">
              {linkHost}/r/{rrpp.slug} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </header>

        <section className="grid grid-cols-3 gap-2">
          <Kpi label="Ventas mes" valor={ventasMes.toString()} icon={Sparkles} />
          <Kpi label="Total mes" valor={`${totalMes.toFixed(0)}€`} icon={Wallet} />
          <Kpi label="Pendiente" valor={`${pendiente.toFixed(0)}€`} icon={Wallet} accent />
        </section>

        {/* Código de referido */}
        <section className="card-premium p-4">
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
          <p className="text-tertiary text-xs mt-2">
            Dáselo a la gente: al registrarse en Rumbo con tu código, contamos sus entradas y consumiciones a tu nombre durante 24h.
          </p>

          {/* Link directo (también atribuye al hacer clic) */}
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <LinkIcon className="w-4 h-4 shrink-0 text-secondary" />
            <span className="flex-1 min-w-0 truncate text-secondary text-xs">{linkHost}/r/{rrpp.slug}</span>
            <button
              onClick={() => { navigator.clipboard?.writeText(miLink); setCopiadoLink(true); setTimeout(() => setCopiadoLink(false), 1500) }}
              className="shrink-0 h-8 px-3 rounded-lg bg-white/8 border border-white/10 text-white text-xs font-semibold hover:bg-white/12 transition-colors"
            >
              {copiadoLink ? '¡Copiado!' : 'Copiar link'}
            </button>
          </div>
        </section>

        {/* Mensajes con los locales */}
        {conversaciones.length > 0 && (
          <section>
            <h2 className="eyebrow eyebrow-rose mb-3">Mensajes</h2>
            <div className="space-y-2">
              {conversaciones.map(c => (
                <button key={c.local_id} onClick={() => setChatConLocal({ local_id: c.local_id, nombre: c.nombre })}
                  className="w-full card-premium p-3 flex items-center gap-3 text-left hover:bg-white/[0.04]">
                  <div className="w-10 h-10 rounded-full bg-rose-400/20 flex items-center justify-center shrink-0">{c.nombre.slice(0, 1)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-display text-sm truncate">{c.nombre}</p>
                    <p className="text-tertiary text-xs truncate">{c.ultimo || 'Sin mensajes'}</p>
                  </div>
                  {c.no_leidos > 0 && <span className="shrink-0 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{c.no_leidos}</span>}
                </button>
              ))}
            </div>
          </section>
        )}

        {pendientes.length > 0 && (
          <section>
            <h2 className="eyebrow eyebrow-rose mb-3">Invitaciones pendientes ({pendientes.length})</h2>
            <div className="space-y-2">
              {pendientes.map(v => (
                <div key={v.id} className="card-premium p-3">
                  <div className="flex items-center gap-3">
                    {v.locales.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.locales.foto_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-display text-base truncate">{v.locales.nombre}</p>
                      <p className="text-tertiary text-xs">Te ofrece {v.comision_pct}% por venta</p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
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
          </section>
        )}

        <section>
          <h2 className="eyebrow eyebrow-rose mb-3">Locales activos ({activos.length})</h2>
          {activos.length === 0 ? (
            <p className="text-tertiary text-sm">Aún no trabajas con ningún local activo.</p>
          ) : (
            <div className="space-y-2">
              {activos.map(v => (
                <div key={v.id} className="card-premium p-3 flex items-center gap-3">
                  {v.locales.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.locales.foto_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-display text-base truncate">{v.locales.nombre}</p>
                    <p className="text-tertiary text-xs">{v.comision_pct}% por venta</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="eyebrow eyebrow-rose mb-2 flex items-center gap-2">
            <LinkIcon className="w-4 h-4" /> Tu cuenta
          </h2>
          <div className="card-premium p-3 flex items-center justify-between">
            <div>
              <p className="text-display text-base">Visible en el buscador de locales</p>
              <p className="text-tertiary text-xs">
                {rrpp.visible_en_busqueda
                  ? 'Otros locales pueden encontrarte y proponerte trabajar juntos.'
                  : 'Solo los locales que ya conoces pueden invitarte por su lado.'}
              </p>
            </div>
            <button onClick={toggleVisibilidad}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                rrpp.visible_en_busqueda ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-tertiary'
              }`}>
              {rrpp.visible_en_busqueda ? 'Visible' : 'Oculto'}
            </button>
          </div>
        </section>

        <footer className="text-center text-tertiary text-xs pt-6 border-t border-white/5">
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
    </div>
  )
}

function Kpi({ label, valor, icon: Icon, accent }: { label: string; valor: string; icon: React.ElementType; accent?: boolean }) {
  return (
    <div className={`card-premium p-3 text-center ${accent ? 'ring-1 ring-rose-400/40' : ''}`}>
      <Icon className={`w-4 h-4 mx-auto mb-1 ${accent ? 'text-rose-300' : 'text-white/60'}`} />
      <p className="text-display text-xl">{valor}</p>
      <p className="text-tertiary text-xs">{label}</p>
    </div>
  )
}
