'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import {
  UserPlus, Users, Share2, Check, X, Trash2, Plus, Crown, ArrowLeft, UserCog,
} from 'lucide-react'

type Persona = { amistad_id?: string; id: string; nombre: string; foto_perfil_url: string | null; created_at?: string }
type Grupo = { id: string; nombre: string; emoji: string | null; creador_id: string; miembros: { id: string; nombre: string; foto_perfil_url: string | null }[] }

// Datos de demo cuando no hay sesión real con datos (modo demo)
const DEMO_AMIGOS: Persona[] = [
  { id: 'd1', nombre: 'Kaze', foto_perfil_url: null },
  { id: 'd2', nombre: 'Sora', foto_perfil_url: null },
  { id: 'd3', nombre: 'Volt', foto_perfil_url: null },
  { id: 'd4', nombre: 'Lux', foto_perfil_url: null },
  { id: 'd5', nombre: 'Drako', foto_perfil_url: null },
]
const DEMO_RECIBIDAS: Persona[] = [
  { amistad_id: 'r1', id: 'd6', nombre: 'Nyx', foto_perfil_url: null },
]
const DEMO_GRUPOS: Grupo[] = [
  { id: 'g1', nombre: 'Crew de Gamba', emoji: '🎮', creador_id: 'me', miembros: [
    { id: 'd1', nombre: 'Kaze', foto_perfil_url: null }, { id: 'd2', nombre: 'Sora', foto_perfil_url: null },
    { id: 'd3', nombre: 'Volt', foto_perfil_url: null }, { id: 'd4', nombre: 'Lux', foto_perfil_url: null } ] },
  { id: 'g2', nombre: 'Liga Magic Madrid', emoji: '🃏', creador_id: 'otro', miembros: [
    { id: 'd5', nombre: 'Drako', foto_perfil_url: null }, { id: 'd2', nombre: 'Sora', foto_perfil_url: null } ] },
]

function Avatar({ nombre, foto, size = 40 }: { nombre: string; foto: string | null; size?: number }) {
  const ini = (nombre?.trim()?.[0] || '?').toUpperCase()
  return (
    <span className="shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#B6FF3A] to-[#7C5CFF] flex items-center justify-center font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {foto ? <img src={foto} alt="" className="h-full w-full object-cover" /> : ini}
    </span>
  )
}

export default function AmigosPage() {
  const router = useRouter()
  const toast = useToast()
  const { usuario, isLoading } = useAuthStore()
  const [tab, setTab] = useState<'amigos' | 'grupos'>('amigos')
  const [amigos, setAmigos] = useState<Persona[]>([])
  const [recibidas, setRecibidas] = useState<Persona[]>([])
  const [enviadas, setEnviadas] = useState<Persona[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)
  const [crear, setCrear] = useState(false)

  const cargar = useCallback(async () => {
    const [a, g] = await Promise.all([
      fetch('/api/amigos').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/grupos').then(r => r.ok ? r.json() : null).catch(() => null),
    ])
    const amigosReales = a?.amigos ?? []
    const gruposReales = g?.grupos ?? []
    // Fallback de demo: si no hay datos reales, mostrar muestra para que la capa social luzca viva
    if (amigosReales.length === 0 && (a?.recibidas ?? []).length === 0) {
      setAmigos(DEMO_AMIGOS); setRecibidas(DEMO_RECIBIDAS); setEnviadas([])
    } else {
      setAmigos(amigosReales); setRecibidas(a?.recibidas ?? []); setEnviadas(a?.enviadas ?? [])
    }
    setGrupos(gruposReales.length === 0 ? DEMO_GRUPOS : gruposReales)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isLoading) return
    if (!usuario) { router.push('/login'); return }
    cargar()
  }, [isLoading, usuario, router, cargar])

  const responder = async (amistad_id: string, accion: 'aceptar' | 'rechazar') => {
    setRecibidas(prev => prev.filter(p => p.amistad_id !== amistad_id))
    await fetch('/api/amigos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amistad_id, accion }) }).catch(() => {})
    cargar()
  }
  const quitar = async (amigoId: string) => {
    setAmigos(prev => prev.filter(p => p.id !== amigoId))
    setEnviadas(prev => prev.filter(p => p.id !== amigoId))
    await fetch(`/api/amigos?amigo_id=${amigoId}`, { method: 'DELETE' }).catch(() => {})
    cargar()
  }
  const compartir = async () => {
    const url = `${location.origin}/amigo/${usuario!.id}`
    const texto = `Añádeme en TODH y competimos juntos 🎮`
    if (navigator.share) { try { await navigator.share({ title: 'TODH', text: texto, url }) } catch { /* cancelado */ } }
    else { await navigator.clipboard.writeText(url); toast.success('Enlace copiado') }
  }
  const salirGrupo = async (id: string) => {
    if (!confirm('¿Salir de este grupo?')) return
    setGrupos(prev => prev.filter(g => g.id !== id))
    await fetch(`/api/grupos/${id}`, { method: 'DELETE' }).catch(() => {})
    cargar()
  }

  if (isLoading || (!usuario && !isLoading) || loading) {
    return <div className="p-4 space-y-3 max-w-lg mx-auto">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />)}</div>
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button onClick={() => router.back()} className="text-[#8B8BA8] hover:text-white"><ArrowLeft size={20} /></button>
          <h1 className="text-2xl font-black text-white">Amigos</h1>
        </div>
        <button onClick={compartir} className="inline-flex items-center gap-1.5 rounded-xl bg-[#B6FF3A] px-3 py-2 text-sm font-semibold text-[#0A0A0F]">
          <Share2 size={15} /> Invitar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['amigos', 'grupos'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium border transition-colors',
              tab === t ? 'bg-[#B6FF3A] border-[#B6FF3A] text-[#0A0A0F]' : 'border-white/10 text-[#8B8BA8] hover:text-[#0A0A0F]')}>
            {t === 'amigos' ? <Users size={15} /> : <UserCog size={15} />}
            {t === 'amigos' ? 'Amigos' : 'Grupos'}
            {t === 'amigos' && recibidas.length > 0 && <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white/90 px-1 text-[11px] font-bold text-[#B6FF3A]">{recibidas.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'amigos' ? (
        <div key="t-amigos" className="space-y-5">
          {/* Solicitudes recibidas */}
          {recibidas.length > 0 && (
            <section className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8B8BA8]">Solicitudes</p>
              {recibidas.map((p, i) => (
                <div key={p.amistad_id} className="flex items-center gap-3 rounded-2xl border border-[#B6FF3A]/25 bg-[#B6FF3A]/[0.05] px-3.5 py-3 stagger-item" style={{ ['--delay' as string]: `${i * 50}ms` }}>
                  <Avatar nombre={p.nombre} foto={p.foto_perfil_url} />
                  <p className="flex-1 min-w-0 truncate text-sm font-semibold text-white">{p.nombre}</p>
                  <button onClick={() => responder(p.amistad_id!, 'aceptar')} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#27AE60] text-white"><Check size={17} /></button>
                  <button onClick={() => responder(p.amistad_id!, 'rechazar')} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-[#8B8BA8] hover:text-white"><X size={17} /></button>
                </div>
              ))}
            </section>
          )}

          {/* Amigos */}
          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8B8BA8]">Tus amigos ({amigos.length})</p>
            {amigos.length === 0 ? (
              <EmptyInvite onInvite={compartir} />
            ) : amigos.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-3 stagger-item" style={{ ['--delay' as string]: `${(recibidas.length + i) * 50}ms` }}>
                <Avatar nombre={p.nombre} foto={p.foto_perfil_url} />
                <p className="flex-1 min-w-0 truncate text-sm font-semibold text-white">{p.nombre}</p>
                <button onClick={() => quitar(p.id)} aria-label="Quitar amigo" className="flex h-9 w-9 items-center justify-center rounded-xl text-[#6B6B85] hover:text-[#B6FF3A]"><Trash2 size={16} /></button>
              </div>
            ))}
          </section>

          {/* Enviadas */}
          {enviadas.length > 0 && (
            <section className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8B8BA8]">Pendientes de aceptar</p>
              {enviadas.map(p => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3 opacity-80">
                  <Avatar nombre={p.nombre} foto={p.foto_perfil_url} size={36} />
                  <p className="flex-1 min-w-0 truncate text-sm text-white">{p.nombre}</p>
                  <span className="text-xs text-[#8B8BA8]">Enviada</span>
                  <button onClick={() => quitar(p.id)} aria-label="Cancelar solicitud" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B6B85] hover:text-[#B6FF3A]"><X size={15} /></button>
                </div>
              ))}
            </section>
          )}
        </div>
      ) : (
        <div key="t-grupos" className="space-y-3">
          <button onClick={() => setCrear(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#B6FF3A]/40 bg-[#B6FF3A]/[0.06] px-4 py-3 text-sm font-semibold text-[#B6FF3A]">
            <Plus size={17} /> Crear un grupo
          </button>
          {grupos.length === 0 ? (
            <p className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-8 text-center text-sm text-[#8B8BA8]">
              Crea grupos con tu crew para coordinar a qué torneos vais.
            </p>
          ) : grupos.map((g, i) => (
            <div key={g.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 stagger-item" style={{ ['--delay' as string]: `${i * 60}ms` }}>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7C5CFF]/15 text-xl">{g.emoji || '🎉'}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                    {g.nombre}
                    {g.creador_id === usuario!.id && <Crown size={12} className="text-[#E7CB86]" />}
                  </p>
                  <p className="text-xs text-[#8B8BA8]">{g.miembros.length} {g.miembros.length === 1 ? 'miembro' : 'miembros'}</p>
                </div>
                <button onClick={() => salirGrupo(g.id)} className="text-xs text-[#8B8BA8] hover:text-[#B6FF3A]">Salir</button>
              </div>
              <div className="mt-3 flex -space-x-2">
                {g.miembros.slice(0, 8).map(m => <Avatar key={m.id} nombre={m.nombre} foto={m.foto_perfil_url} size={28} />)}
                {g.miembros.length > 8 && <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">+{g.miembros.length - 8}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {crear && <CrearGrupoModal amigos={amigos} onClose={() => setCrear(false)} onCreado={() => { setCrear(false); cargar() }} />}
    </div>
  )
}

function EmptyInvite({ onInvite }: { onInvite: () => void }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B6FF3A]/15 text-[#B6FF3A]"><UserPlus size={22} /></div>
      <p className="font-semibold text-white">Aún no tienes amigos aquí</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-[#8B8BA8]">Comparte tu enlace para que te añadan y veáis en qué torneos competís.</p>
      <button onClick={onInvite} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#B6FF3A] px-4 py-2 text-sm font-semibold text-[#0A0A0F]"><Share2 size={15} /> Compartir mi enlace</button>
    </div>
  )
}

function CrearGrupoModal({ amigos, onClose, onCreado }: { amigos: Persona[]; onClose: () => void; onCreado: () => void }) {
  const toast = useToast()
  const [nombre, setNombre] = useState('')
  const [emoji, setEmoji] = useState('🎮')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [guardando, setGuardando] = useState(false)
  const EMOJIS = ['🎮', '🃏', '⚔️', '🔥', '🏆', '👾', '⚡', '✨']

  const crear = async () => {
    if (!nombre.trim()) { toast.error('Ponle un nombre'); return }
    setGuardando(true)
    const r = await fetch('/api/grupos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim(), emoji, miembros: [...sel] }),
    })
    setGuardando(false)
    if (!r.ok) { const d = await r.json().catch(() => ({})); toast.error(d.error || 'No se pudo crear'); return }
    toast.success('Grupo creado')
    onCreado()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl bg-[#12161F] p-6 sm:rounded-3xl border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Nuevo grupo</h2>
          <button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setEmoji(e)} className={cn('h-10 w-10 rounded-xl text-xl', emoji === e ? 'bg-[#B6FF3A]/20 ring-1 ring-[#B6FF3A]' : 'bg-white/5')}>{e}</button>
              ))}
            </div>
          </div>
          <input value={nombre} onChange={e => setNombre(e.target.value)} maxLength={60} placeholder="Nombre del grupo (p. ej. La cuadrilla)"
            className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-[#B6FF3A]/60" />
          <div>
            <p className="mb-2 text-sm font-medium text-[#A0A0B8]">Añade amigos</p>
            {amigos.length === 0 ? (
              <p className="text-sm text-[#6B6B85]">Primero añade amigos para poder agruparlos.</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {amigos.map(a => {
                  const on = sel.has(a.id)
                  return (
                    <button key={a.id} onClick={() => setSel(prev => { const n = new Set(prev); n.has(a.id) ? n.delete(a.id) : n.add(a.id); return n })}
                      className={cn('flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left', on ? 'border-[#B6FF3A] bg-[#B6FF3A]/10' : 'border-white/8 bg-white/[0.03]')}>
                      <Avatar nombre={a.nombre} foto={a.foto_perfil_url} size={32} />
                      <span className="flex-1 truncate text-sm text-white">{a.nombre}</span>
                      {on && <Check size={16} className="text-[#B6FF3A]" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <button onClick={crear} disabled={guardando} className="h-12 w-full rounded-xl bg-[#B6FF3A] font-semibold text-[#0A0A0F] disabled:opacity-50">
            {guardando ? 'Creando…' : 'Crear grupo'}
          </button>
        </div>
      </div>
    </div>
  )
}
