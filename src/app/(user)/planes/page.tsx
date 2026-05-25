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
import { SkeletonPlanCard } from '@/components/ui/ErrorState'
import { cn } from '@/lib/utils'

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

      {/* Lista */}
      <div className="px-4 pb-8 space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonPlanCard key={i} />)
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
          planesFiltrados.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentUserId={usuario?.id}
              onUnirse={() => unirse(plan)}
              onVer={() => router.push(`/planes/${plan.id}`)}
              loading={uniendose === plan.id}
            />
          ))
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
    <div className="flex items-stretch bg-white/3 border border-white/6 rounded-2xl overflow-hidden hover:bg-white/5 transition-colors">
      {/* Imagen cuadrada */}
      <div className="w-20 flex-shrink-0 relative">
        <LocalImagen src={plan.locales?.imagenes?.[0]} nombre={plan.locales?.nombre || ''} />
      </div>

      {/* Contenido */}
      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-white text-sm truncate leading-tight">{plan.locales?.nombre}</p>
            {esMio && <span className="shrink-0 text-[10px] px-2 py-0.5 bg-[#E94560]/10 border border-[#E94560]/25 rounded-full text-[#E94560] font-semibold">Mío</span>}
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-[#8B8BA8]">
            <MapPin size={9} className="shrink-0" />
            <span className="truncate">{plan.locales?.ciudad}</span>
          </div>
          {plan.descripcion && (
            <p className="text-[11px] text-[#8B8BA8] mt-1 line-clamp-1">{plan.descripcion}</p>
          )}
        </div>

        <div className="mt-2">
          {/* Barra progreso */}
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-[#8B8BA8] flex items-center gap-1">
              <Clock size={9} /> {formatearHora(plan.hora_llegada)}
            </span>
            <span className="text-white font-medium">
              {ocupados}/{plan.total_personas} <span className="text-[#8B8BA8]">personas</span>
            </span>
          </div>
          <div className="w-full h-1 bg-white/8 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-[#E94560] rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            {!esMio && (
              <Button size="sm" className="h-7 text-xs px-3 flex-1" loading={loading} onClick={onUnirse}>
                <UserCheck size={12} /> Unirse
              </Button>
            )}
            <button onClick={onVer} className="flex items-center gap-1 px-3 h-7 text-xs text-[#8B8BA8] hover:text-white transition-colors">
              Ver <ChevronRight size={11} />
            </button>
          </div>
        </div>
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
