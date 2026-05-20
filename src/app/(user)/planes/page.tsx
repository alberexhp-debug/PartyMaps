'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { PlanPublico, Local } from '@/types'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { formatearHora } from '@/lib/utils'
import {
  Users, Plus, MapPin, Clock, ChevronRight, Search,
  UserCheck, Lock, Unlock
} from 'lucide-react'
import { cn } from '@/lib/utils'

type PlanConLocal = PlanPublico & { locales?: Local }

export default function PlanesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D0D1A]" />}>
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
    <div className="min-h-screen bg-[#0D0D1A]">
      {/* Header */}
      <div className="bg-[#0D0D1A] border-b border-[#1A1A2E] px-4 pt-4 pb-4 safe-top">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-white">Planes públicos</h1>
          <Button size="sm" onClick={() => {
            if (!usuario) { router.push('/login'); return }
            setShowCrear(true)
          }}>
            <Plus size={16} />
            Crear plan
          </Button>
        </div>
        <p className="text-sm text-[#505065]">Únete a grupos que van esta noche</p>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-[#1A1A2E] rounded-2xl animate-pulse" />
          ))
        ) : planes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 bg-[#1A1A2E] rounded-2xl flex items-center justify-center">
              <Users size={28} className="text-[#505065]" />
            </div>
            <p className="text-[#505065] text-center">No hay planes disponibles ahora mismo</p>
            <Button size="sm" onClick={() => setShowCrear(true)}>
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
    <div className="bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] overflow-hidden">
      <div className="flex items-stretch">
        {/* Imagen */}
        <div className="w-24 h-32 bg-[#0D0D1A] flex-shrink-0">
          <img
            src={plan.locales?.imagenes?.[0] || ''}
            alt={plan.locales?.nombre}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>

        {/* Info */}
        <div className="flex-1 p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-white text-sm truncate">{plan.locales?.nombre}</p>
              {esMio && (
                <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-[#E94560]/10 border border-[#E94560]/30 rounded-full text-[#E94560]">
                  Mi plan
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-[#505065] mt-0.5">
              <MapPin size={10} />
              <span>{plan.locales?.ciudad}</span>
            </div>
            {plan.descripcion && (
              <p className="mt-1.5 text-xs text-[#A0A0B8] line-clamp-2">{plan.descripcion}</p>
            )}
          </div>

          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-[#505065]">
                <Clock size={11} />
                <span>{formatearHora(plan.hora_llegada)}</span>
              </div>
              <div className="flex items-center gap-1 text-[#A0A0B8]">
                <Users size={11} />
                <span>{plan.total_personas - plan.huecos_disponibles}/{plan.total_personas}</span>
              </div>
            </div>

            {/* Barra de ocupación */}
            <div className="w-full h-1 bg-[#0D0D1A] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E94560] rounded-full transition-all"
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
                className="flex items-center gap-1 px-2 h-8 text-xs text-[#A0A0B8] border border-[#2A2A3E] rounded-lg hover:border-[#505065]"
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end">
      <div className="w-full bg-[#1A1A2E] rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Crear plan público</h2>
            <button onClick={onClose} className="text-[#505065] hover:text-white text-sm">Cancelar</button>
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
                  <p className="text-xs text-[#505065]">{localSeleccionado.ciudad}</p>
                </div>
                <span className="text-xs text-[#E94560]">Cambiar</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-[#0D0D1A] border border-[#2A2A3E] rounded-xl">
                  <Search size={14} className="text-[#505065]" />
                  <input
                    value={buscando}
                    onChange={e => setBuscando(e.target.value)}
                    placeholder="Buscar local..."
                    className="bg-transparent text-white text-sm flex-1 outline-none placeholder:text-[#505065]"
                  />
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {localesFiltrados.map(l => (
                    <button
                      key={l.id}
                      onClick={() => setLocalId(l.id)}
                      className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-[#0D0D1A] text-left"
                    >
                      <img src={l.imagenes?.[0] || ''} alt="" className="w-8 h-8 rounded-lg object-cover bg-[#2A2A3E]" />
                      <div>
                        <p className="text-sm text-white font-medium">{l.nombre}</p>
                        <p className="text-xs text-[#505065]">{l.ciudad}</p>
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
              className="w-full px-4 py-3 bg-[#0D0D1A] border border-[#2A2A3E] rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50"
            />
          </div>

          {/* Personas */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#A0A0B8]">Plazas totales (incluyéndote)</label>
            <div className="flex items-center gap-4">
              <button onClick={() => setTotalPersonas(Math.max(2, totalPersonas - 1))}
                className="w-10 h-10 rounded-full border border-[#2A2A3E] text-white flex items-center justify-center">−</button>
              <span className="text-xl font-bold text-white w-8 text-center">{totalPersonas}</span>
              <button onClick={() => setTotalPersonas(Math.min(20, totalPersonas + 1))}
                className="w-10 h-10 rounded-full border border-[#2A2A3E] text-white flex items-center justify-center">+</button>
              <span className="text-sm text-[#505065]">({totalPersonas - 1} huecos disponibles)</span>
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
              className="w-full px-4 py-3 bg-[#0D0D1A] border border-[#2A2A3E] rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50 resize-none placeholder:text-[#505065]"
            />
            <p className="text-xs text-[#505065] text-right">{descripcion.length}/200</p>
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
