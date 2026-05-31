'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { PlanPublico, Local } from '@/types'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { formatearHora, puedeCrearPlan } from '@/lib/utils'
import { Users, Plus, MapPin, Clock, ChevronRight, Search, UserCheck, Lock } from 'lucide-react'
import { LocalImagen } from '@/components/ui/LocalImagen'

type PlanConLocal = PlanPublico & { locales?: Local }

export default function PlanesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <PlanesContent />
    </Suspense>
  )
}

function PlanesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { usuario } = useAuthStore()
  const toast = useToast()
  const [planes, setPlanes] = useState<PlanConLocal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCrear, setShowCrear] = useState(false)
  const [localFilter] = useState(searchParams.get('local') || '')
  const [uniendose, setUniendose] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

  const cargar = useCallback(async () => {
    let query = supabase
      .from('planes_publicos')
      .select(`*, locales!inner(id, nombre, imagenes, ciudad, tipo_local)`)
      .eq('estado', 'activo')
      .gt('huecos_disponibles', 0)
      .order('hora_llegada', { ascending: true })
      .limit(50)
    if (localFilter) query = query.eq('local_id', localFilter)
    const { data } = await query
    if (data) setPlanes(data.map((p: PlanConLocal) => ({ ...p, local: p.locales })))
    setLoading(false)
  }, [localFilter])

  useEffect(() => { cargar() }, [cargar])

  const unirse = async (plan: PlanConLocal) => {
    if (!usuario) { router.push('/login'); return }
    setUniendose(plan.id)
    const { error } = await supabase.from('participantes_plan').insert({
      plan_id: plan.id, usuario_id: usuario.id, estado: 'pendiente',
    })
    if (error) {
      if (error.code === '23505') toast.info('Ya enviaste solicitud para este plan')
      else toast.error('No se pudo enviar la solicitud')
    } else {
      toast.success('Solicitud enviada.')
      cargar()
    }
    setUniendose(null)
  }

  const planesFiltrados = busca.trim()
    ? planes.filter(p => p.locales?.nombre.toLowerCase().includes(busca.toLowerCase()))
    : planes

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 safe-top">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold text-[#E94560] uppercase tracking-[0.25em] mb-1">Esta noche</p>
            <h1 className="text-2xl font-bold text-white text-display tracking-tight">Planes</h1>
          </div>
          <Button size="sm" onClick={() => {
            if (!usuario) { router.push('/login'); return }
            const check = puedeCrearPlan(usuario)
            if (!check.puede) { toast.error(check.motivo || 'No puedes crear planes ahora'); return }
            setShowCrear(true)
          }}>
            <Plus size={15} /> Crear
          </Button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B8BA8]" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar local…"
            className="w-full h-10 pl-10 pr-4 bg-white/5 border border-white/8 rounded-xl text-white text-sm placeholder:text-[#8B8BA8] outline-none focus:border-white/15 transition-colors"
          />
        </div>
      </div>

      {/* Contador */}
      {!loading && planesFiltrados.length > 0 && (
        <p className="px-5 pb-2 text-xs text-[#8B8BA8]">
          <span className="text-white font-semibold">{planesFiltrados.length}</span> {planesFiltrados.length === 1 ? 'plan disponible' : 'planes disponibles'}
        </p>
      )}

      {/* Lista — feed compacto de una columna */}
      <div className="px-4 pb-8">
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[84px] rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : planesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center">
              <Users size={24} className="text-[#6B6B85]" />
            </div>
            <div>
              <p className="text-white font-semibold">Sin planes esta noche</p>
              <p className="text-sm text-[#8B8BA8] mt-1 max-w-xs">
                {busca ? 'Prueba con otro nombre.' : 'Crea el primero y deja que otros se unan.'}
              </p>
            </div>
            {!busca && (
              <Button size="sm" onClick={() => setShowCrear(true)}>
                <Plus size={15} /> Crear plan
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {planesFiltrados.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                currentUserId={usuario?.id}
                onUnirse={() => unirse(plan)}
                onVer={() => router.push(`/planes/${plan.id}`)}
                loading={uniendose === plan.id}
              />
            ))}
          </div>
        )}
      </div>

      {showCrear && (
        <CrearPlanModal
          onClose={() => setShowCrear(false)}
          onCreado={() => { setShowCrear(false); cargar() }}
          userId={usuario?.id || ''}
          localPreseleccionado={localFilter}
        />
      )}
    </div>
  )
}

function PlanCard({ plan, currentUserId, onUnirse, onVer, loading }: {
  plan: PlanConLocal; currentUserId?: string
  onUnirse: () => void; onVer: () => void; loading: boolean
}) {
  const esMio = plan.creador_id === currentUserId
  const ocupados = plan.total_personas - plan.huecos_disponibles
  const pct = plan.total_personas > 0 ? Math.round((ocupados / plan.total_personas) * 100) : 0

  return (
    <div className="flex items-stretch gap-3 card-premium p-2.5 rounded-2xl">
      {/* Miniatura del local */}
      <button onClick={onVer} className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl">
        <LocalImagen src={plan.locales?.imagenes?.[0]} nombre={plan.locales?.nombre || ''} />
        {esMio && (
          <span className="absolute left-1 top-1 rounded-full bg-[#E94560] px-1.5 py-px text-[8px] font-bold text-white">Mío</span>
        )}
      </button>

      {/* Info */}
      <button onClick={onVer} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-semibold leading-tight text-white">{plan.locales?.nombre}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#8B8BA8]">
          <span className="flex items-center gap-1"><Clock size={10} className="shrink-0" /> {formatearHora(plan.hora_llegada)}</span>
          <span className="text-white/20">·</span>
          <span className="flex items-center gap-1 truncate"><MapPin size={10} className="shrink-0" /> {plan.locales?.ciudad}</span>
        </div>
        {plan.descripcion
          ? <p className="mt-1 truncate text-[11px] text-[#8B8BA8]">{plan.descripcion}</p>
          : <p className="mt-1 text-[11px] text-[#6B6B85]">Únete y salid juntos</p>}
        {/* Plazas */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-[#E94560] transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 text-[10px] text-[#8B8BA8]"><span className="font-semibold text-white text-numeric">{ocupados}</span>/{plan.total_personas}</span>
        </div>
      </button>

      {/* Acción */}
      <div className="flex shrink-0 items-center">
        {!esMio ? (
          <Button size="sm" className="h-9 px-3 text-xs" loading={loading} onClick={onUnirse}>
            <UserCheck size={13} /> Unirme
          </Button>
        ) : (
          <button onClick={onVer} aria-label="Ver plan" className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 text-[#8B8BA8] hover:text-white transition-colors">
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

function CrearPlanModal({ onClose, onCreado, userId, localPreseleccionado }: {
  onClose: () => void; onCreado: () => void; userId: string; localPreseleccionado?: string
}) {
  const toast = useToast()
  const [locales, setLocales] = useState<Local[]>([])
  const [localId, setLocalId] = useState(localPreseleccionado || '')
  const [horaLlegada, setHoraLlegada] = useState('')
  const [totalPersonas, setTotalPersonas] = useState(4)
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const [buscando, setBuscando] = useState('')

  useEffect(() => {
    supabase.from('locales').select('id, nombre, ciudad, imagenes').eq('estado', 'activo').limit(100)
      .then(({ data }) => { if (data) setLocales(data as Local[]) })
  }, [])

  const localesFiltrados = buscando.trim()
    ? locales.filter(l => l.nombre.toLowerCase().includes(buscando.toLowerCase()))
    : locales.slice(0, 8)
  const localSeleccionado = locales.find(l => l.id === localId)

  const crear = async () => {
    if (!localId) { toast.error('Selecciona un local'); return }
    if (!horaLlegada) { toast.error('Indica la hora de llegada'); return }
    setLoading(true)
    const { error } = await supabase.from('planes_publicos').insert({
      creador_id: userId, local_id: localId,
      hora_llegada: new Date().toISOString().slice(0, 10) + 'T' + horaLlegada + ':00',
      total_personas: totalPersonas,
      huecos_disponibles: totalPersonas - 1,
      descripcion: descripcion.trim() || null,
      estado: 'activo', miembros_count: 1,
    })
    if (error) { toast.error('Error al crear el plan'); setLoading(false); return }
    toast.success('¡Plan creado!')
    onCreado()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end animate-fade-in">
      <div className="w-full glass-strong rounded-t-3xl max-h-[88vh] overflow-y-auto animate-slide-up">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Nuevo plan</h2>
            <button onClick={onClose} className="text-sm text-[#8B8BA8] hover:text-white">Cancelar</button>
          </div>

          {/* Local */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#A0A0B8]">Local *</label>
            {localSeleccionado ? (
              <button onClick={() => setLocalId('')} className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                <img src={localSeleccionado.imagenes?.[0] || ''} alt="" className="w-10 h-10 rounded-lg object-cover bg-white/5" />
                <div className="text-left flex-1">
                  <p className="font-semibold text-white text-sm">{localSeleccionado.nombre}</p>
                  <p className="text-xs text-[#8B8BA8]">{localSeleccionado.ciudad}</p>
                </div>
                <span className="text-xs text-[#E94560]">Cambiar</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
                  <Search size={13} className="text-[#8B8BA8]" />
                  <input value={buscando} onChange={e => setBuscando(e.target.value)} placeholder="Buscar local…"
                    className="bg-transparent text-white text-sm flex-1 outline-none placeholder:text-[#8B8BA8]" />
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {localesFiltrados.map(l => (
                    <button key={l.id} onClick={() => setLocalId(l.id)} className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 text-left">
                      <img src={l.imagenes?.[0] || ''} alt="" className="w-8 h-8 rounded-lg object-cover bg-white/5" />
                      <div>
                        <p className="text-sm text-white font-medium">{l.nombre}</p>
                        <p className="text-xs text-[#8B8BA8]">{l.ciudad}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Hora */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#A0A0B8]">Hora de llegada *</label>
            <input type="time" value={horaLlegada} onChange={e => setHoraLlegada(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-white/20" />
          </div>

          {/* Personas */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#A0A0B8]">Plazas (incluida la tuya)</label>
            <div className="flex items-center gap-4">
              <button onClick={() => setTotalPersonas(Math.max(2, totalPersonas - 1))}
                className="w-9 h-9 rounded-full border border-white/10 text-white flex items-center justify-center hover:bg-white/5">−</button>
              <span className="text-xl font-bold text-white w-8 text-center">{totalPersonas}</span>
              <button onClick={() => setTotalPersonas(Math.min(20, totalPersonas + 1))}
                className="w-9 h-9 rounded-full border border-white/10 text-white flex items-center justify-center hover:bg-white/5">+</button>
              <span className="text-sm text-[#8B8BA8]">{totalPersonas - 1} huecos disponibles</span>
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#A0A0B8]">Descripción <span className="text-[#6B6B85] font-normal">(opcional)</span></label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Cuéntanos algo sobre el plan…" rows={2} maxLength={200}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-white/20 resize-none placeholder:text-[#8B8BA8]" />
          </div>

          <Button fullWidth loading={loading} onClick={crear}>
            <Users size={16} /> Crear plan
          </Button>
        </div>
      </div>
    </div>
  )
}
