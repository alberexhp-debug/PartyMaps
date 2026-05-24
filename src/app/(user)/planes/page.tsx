'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { PlanPublico, Local } from '@/types'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { formatearHora, puedeCrearPlan } from '@/lib/utils'
import {
  Users, Plus, MapPin, Clock, ChevronRight, Search,
  UserCheck, Lock, Unlock
} from 'lucide-react'
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
      plan_id: plan.id,
      usuario_id: usuario.id,
      estado: 'pendiente',
    })
    if (error) {
      if (error.code === '23505') toast.info('Ya enviaste una solicitud para este plan')
      else toast.error('No se pudo enviar la solicitud')
    } else {
      toast.success('Solicitud enviada. El creador la revisará.')
      cargar()
    }
    setUniendose(null)
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 safe-top">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-[10px] font-bold text-[#E94560] uppercase tracking-[0.25em] mb-1">Esta noche</p>
            <h1 className="text-2xl font-bold text-white text-display tracking-tight">Planes públicos</h1>
            <p className="text-sm text-[#A0A0B8] mt-1">Únete a grupos que van esta noche</p>
          </div>
          <Button size="sm" onClick={() => {
            if (!usuario) { router.push('/login'); return }
            const check = puedeCrearPlan(usuario)
            if (!check.puede) { toast.error(check.motivo || 'No puedes crear planes ahora'); return }
            setShowCrear(true)
          }}>
            <Plus size={16} />
            Crear
          </Button>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 glass-subtle rounded-2xl animate-pulse" />
          ))
        ) : planes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 px-6 text-center">
            <div className="w-20 h-20 glass rounded-2xl flex items-center justify-center">
              <Users size={32} className="text-[#A0A0B8]" />
            </div>
            <p className="text-[#A0A0B8] max-w-xs">No hay planes disponibles ahora mismo. ¡Crea el primero y reúne a tu grupo!</p>
            <Button size="lg" variant="holo" onClick={() => setShowCrear(true)}>
              <Plus size={16} />
              Crear el primero
            </Button>
          </div>
        ) : (
          planes.map(plan => (
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

      {/* Modal crear plan */}
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

function PlanCard({
  plan, currentUserId, onUnirse, onVer, loading
}: {
  plan: PlanConLocal
  currentUserId?: string
  onUnirse: () => void
  onVer: () => void
  loading: boolean
}) {
  const esMio = plan.creador_id === currentUserId
  const ocupacion = plan.total_personas > 0
    ? Math.round(((plan.total_personas - plan.huecos_disponibles) / plan.total_personas) * 100)
    : 0

  return (
    <div className="glass rounded-2xl overflow-hidden transition-all hover:border-white/15">
      <div className="flex items-stretch">
        {/* Imagen */}
        <div className="w-24 h-32 bg-white/5 flex-shrink-0 relative">
          <img
            src={plan.locales?.imagenes?.[0] || ''}
            alt={plan.locales?.nombre}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30" />
        </div>

        {/* Info */}
        <div className="flex-1 p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-white text-sm truncate">{plan.locales?.nombre}</p>
              {esMio && (
                <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-[#E94560]/15 border border-[#E94560]/30 rounded-full text-[#E94560] font-semibold">
                  Mi plan
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-[#A0A0B8] mt-0.5">
              <MapPin size={10} />
              <span>{plan.locales?.ciudad}</span>
            </div>
            {plan.descripcion && (
              <p className="mt-1.5 text-xs text-[#A0A0B8] line-clamp-2">{plan.descripcion}</p>
            )}
          </div>

          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-[#A0A0B8]">
                <Clock size={11} />
                <span className="font-medium">{formatearHora(plan.hora_llegada)}</span>
              </div>
              <div className="flex items-center gap-1 text-white">
                <Users size={11} />
                <span className="font-medium">{plan.total_personas - plan.huecos_disponibles}/{plan.total_personas}</span>
              </div>
            </div>

            {/* Barra de ocupación */}
            <div className="w-full h-1 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E94560] rounded-full transition-all shadow-[0_0_8px_rgba(233,69,96,0.5)]"
                style={{ width: `${ocupacion}%` }}
              />
            </div>

            <div className="flex gap-2 pt-1">
              {!esMio && (
                <Button size="sm" className="flex-1 h-8 text-xs" loading={loading} onClick={onUnirse}>
                  <UserCheck size={13} />
                  Unirse
                </Button>
              )}
              <button
                onClick={onVer}
                className="flex items-center gap-1 px-3 h-8 text-xs text-[#A0A0B8] glass rounded-lg hover:text-white transition-colors"
              >
                Ver <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CrearPlanModal({
  onClose, onCreado, userId, localPreseleccionado
}: {
  onClose: () => void
  onCreado: () => void
  userId: string
  localPreseleccionado?: string
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
      creador_id: userId,
      local_id: localId,
      hora_llegada: new Date().toISOString().slice(0, 10) + 'T' + horaLlegada + ':00',
      total_personas: totalPersonas,
      huecos_disponibles: totalPersonas - 1,
      descripcion: descripcion.trim() || null,
      estado: 'activo',
      miembros_count: 1,
    })

    if (error) { toast.error('Error al crear el plan'); setLoading(false); return }
    toast.success('¡Plan creado!')
    onCreado()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end animate-fade-in">
      <div className="w-full glass-strong rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Crear plan público</h2>
            <button onClick={onClose} className="text-[#6B6B85] hover:text-white text-sm">Cancelar</button>
          </div>

          {/* Seleccionar local */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#A0A0B8]">Local *</label>
            {localSeleccionado ? (
              <button
                onClick={() => setLocalId('')}
                className="w-full flex items-center gap-3 p-3 bg-[#E94560]/10 border border-[#E94560]/30 rounded-xl"
              >
                <img src={localSeleccionado.imagenes?.[0] || ''} alt="" className="w-10 h-10 rounded-lg object-cover bg-[#2A2A3E]" />
                <div className="text-left flex-1">
                  <p className="font-semibold text-white text-sm">{localSeleccionado.nombre}</p>
                  <p className="text-xs text-[#6B6B85]">{localSeleccionado.ciudad}</p>
                </div>
                <span className="text-xs text-[#E94560]">Cambiar</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
                  <Search size={14} className="text-[#6B6B85]" />
                  <input
                    value={buscando}
                    onChange={e => setBuscando(e.target.value)}
                    placeholder="Buscar local..."
                    className="bg-transparent text-white text-sm flex-1 outline-none placeholder:text-[#6B6B85]"
                  />
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {localesFiltrados.map(l => (
                    <button
                      key={l.id}
                      onClick={() => setLocalId(l.id)}
                      className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 text-left"
                    >
                      <img src={l.imagenes?.[0] || ''} alt="" className="w-8 h-8 rounded-lg object-cover bg-[#2A2A3E]" />
                      <div>
                        <p className="text-sm text-white font-medium">{l.nombre}</p>
                        <p className="text-xs text-[#6B6B85]">{l.ciudad}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Hora */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#A0A0B8]">Hora de llegada *</label>
            <input
              type="time"
              value={horaLlegada}
              onChange={e => setHoraLlegada(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50"
            />
          </div>

          {/* Personas */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#A0A0B8]">Plazas totales (incluyéndote)</label>
            <div className="flex items-center gap-4">
              <button onClick={() => setTotalPersonas(Math.max(2, totalPersonas - 1))}
                className="w-10 h-10 rounded-full border border-white/10 text-white flex items-center justify-center">−</button>
              <span className="text-xl font-bold text-white w-8 text-center">{totalPersonas}</span>
              <button onClick={() => setTotalPersonas(Math.min(20, totalPersonas + 1))}
                className="w-10 h-10 rounded-full border border-white/10 text-white flex items-center justify-center">+</button>
              <span className="text-sm text-[#6B6B85]">({totalPersonas - 1} huecos disponibles)</span>
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#A0A0B8]">Descripción (opcional)</label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Cuéntanos algo sobre el plan..."
              rows={3}
              maxLength={200}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50 resize-none placeholder:text-[#6B6B85]"
            />
            <p className="text-xs text-[#6B6B85] text-right">{descripcion.length}/200</p>
          </div>

          <Button fullWidth loading={loading} onClick={crear}>
            <Users size={18} />
            Crear plan
          </Button>
        </div>
      </div>
    </div>
  )
}
