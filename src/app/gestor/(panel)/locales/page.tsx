'use client'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/Input'
import { BuscadorDireccion, type DireccionElegida } from '@/components/ui/BuscadorDireccion'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { PageHeader } from '@/components/local-panel/ui'
import { getLabelTipoLocal } from '@/lib/utils'
import type { TipoLocal, EstadoLocal } from '@/types'
import {
  Store, Plus, MapPin, Building2, Mail, User, Hash,
  Check, Copy, X, KeyRound,
} from 'lucide-react'

type LocalCartera = {
  id: string
  nombre: string
  ciudad: string
  tipo_local: TipoLocal
  tier: string
  estado: EstadoLocal
  imagenes: string[]
  aforo_maximo: number
  created_at: string
}

const TIPOS: { value: TipoLocal; label: string }[] = [
  { value: 'discoteca', label: 'Discoteca' },
  { value: 'bar_copas', label: 'Bar de copas' },
  { value: 'rooftop', label: 'Rooftop' },
  { value: 'sala_conciertos', label: 'Sala de conciertos' },
  { value: 'bar_cocteleria', label: 'Coctelería' },
  { value: 'otro', label: 'Otro' },
]

const ESTADO_BADGE: Record<EstadoLocal, string> = {
  activo: 'text-green-400 bg-green-400/10 border-green-400/30',
  pendiente_verificacion: 'text-[#F39C12] bg-[#F39C12]/10 border-[#F39C12]/30',
  suspendido: 'text-red-400 bg-red-400/10 border-red-400/30',
  eliminado: 'text-[#6B6B85] bg-white/6 border-white/10',
}

export default function GestorLocalesPage() {
  const toast = useToast()
  const [locales, setLocales] = useState<LocalCartera[]>([])
  const [loading, setLoading] = useState(true)
  const [abrirAlta, setAbrirAlta] = useState(false)

  async function cargar() {
    setLoading(true)
    const res = await fetch('/api/gestor/locales')
    const data = await res.json()
    if (res.ok) setLocales(data.locales)
    else toast.error(data.error || 'No se pudo cargar la cartera')
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tu cartera" acento="violet" titulo="Locales"
        subtitulo="Da de alta locales y revisa su estado y tier."
        acciones={<Button size="sm" onClick={() => setAbrirAlta(true)}><Plus size={16} /> Dar de alta</Button>}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      ) : locales.length === 0 ? (
        <EmptyState onAlta={() => setAbrirAlta(true)} />
      ) : (
        <div className="space-y-2">
          {locales.map(local => (
            <div key={local.id} className="flex items-center gap-3.5 rounded-2xl glass px-4 py-3.5">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#1E2331]">
                {local.imagenes?.[0]
                  ? <img src={local.imagenes[0]} alt="" className="h-full w-full object-cover" />
                  : <span className="flex h-full w-full items-center justify-center text-[#6B6B85]"><Store size={18} /></span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{local.nombre}</p>
                <p className="truncate text-xs text-[#8B8BA8]">
                  {getLabelTipoLocal(local.tipo_local)} · {local.ciudad}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${ESTADO_BADGE[local.estado]}`}>
                  {local.estado.replace('_', ' ')}
                </span>
                <span className="text-[10px] capitalize text-[#6B6B85]">{local.tier}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {abrirAlta && <AltaLocalModal onClose={() => setAbrirAlta(false)} onCreado={() => { setAbrirAlta(false); cargar() }} />}
    </div>
  )
}

function EmptyState({ onAlta }: { onAlta: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/12 px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7C5CFF]/15 text-[#9B82FF]">
        <Store size={24} />
      </div>
      <p className="text-base font-semibold text-white">Tu cartera está vacía</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-[#8B8BA8]">
        Da de alta tu primer local. Saldrá activo en el mapa al instante y el dueño podrá completar su ficha.
      </p>
      <Button className="mt-5" onClick={onAlta}><Plus size={16} /> Dar de alta un local</Button>
    </div>
  )
}

function AltaLocalModal({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
  const toast = useToast()
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoLocal>('discoteca')
  const [ciudad, setCiudad] = useState('Madrid')
  const [ubicacion, setUbicacion] = useState<DireccionElegida | null>(null)
  const [aforo, setAforo] = useState('')
  const [duenoEmail, setDuenoEmail] = useState('')
  const [duenoNombre, setDuenoNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [credenciales, setCredenciales] = useState<{ email: string; password: string } | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  const guardar = async () => {
    if (!nombre.trim()) { toast.error('Pon el nombre del local'); return }
    if (!ciudad.trim()) { toast.error('Pon la ciudad'); return }
    if (!ubicacion) { toast.error('Busca y elige la dirección en la lista'); return }
    setGuardando(true)
    const res = await fetch('/api/gestor/locales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre, tipo_local: tipo, ciudad,
        direccion: ubicacion.direccion, latitud: ubicacion.latitud, longitud: ubicacion.longitud,
        aforo_maximo: aforo ? Number(aforo) : undefined,
        dueno_email: duenoEmail || undefined,
        dueno_nombre: duenoNombre || undefined,
      }),
    })
    const data = await res.json()
    setGuardando(false)
    if (!res.ok) { toast.error(data.error || 'No se pudo crear'); return }

    toast.success('Local creado')
    if (data.credenciales) { setCredenciales(data.credenciales); return }
    if (data.aviso) { setAviso(data.aviso); return }
    onCreado()
  }

  const copiar = () => {
    if (!credenciales) return
    navigator.clipboard.writeText(`Acceso TODH\nEmail: ${credenciales.email}\nContraseña: ${credenciales.password}\nEntra en: ${location.origin}/local-panel/login`)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="card-premium max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6 sm:rounded-3xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Éxito con credenciales del dueño */}
        {credenciales ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/15 text-green-400">
              <Check size={26} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Local creado</h2>
              <p className="mt-1 text-sm text-[#A0A0B8]">Entrega estas credenciales al dueño. Que cambie la contraseña al entrar.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
              <div className="flex items-center gap-2 text-sm text-white"><Mail size={14} className="text-[#9B82FF]" /> {credenciales.email}</div>
              <div className="mt-2 flex items-center gap-2 text-sm text-white"><KeyRound size={14} className="text-[#9B82FF]" /> <span className="font-mono">{credenciales.password}</span></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" fullWidth onClick={copiar}>
                {copiado ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> Copiar acceso</>}
              </Button>
              <Button fullWidth onClick={onCreado}>Hecho</Button>
            </div>
          </div>
        ) : aviso ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F39C12]/15 text-[#F39C12]">
              <Check size={26} />
            </div>
            <p className="text-sm text-[#A0A0B8]">{aviso}</p>
            <Button fullWidth onClick={onCreado}>Entendido</Button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white text-display">Dar de alta un local</h2>
              <button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <Input label="Nombre del local" icon={<Building2 size={16} />} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Sala TODH" />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#A0A0B8]">Tipo</label>
                <select
                  value={tipo}
                  onChange={e => setTipo(e.target.value as TipoLocal)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-[#B6FF3A]/60"
                >
                  {TIPOS.map(t => <option key={t.value} value={t.value} className="bg-[#181D28]">{t.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input label="Ciudad" icon={<MapPin size={16} />} value={ciudad} onChange={e => setCiudad(e.target.value)} />
                <Input label="Aforo" type="number" icon={<Hash size={16} />} value={aforo} onChange={e => setAforo(e.target.value)} placeholder="200" />
              </div>

              <BuscadorDireccion label="Dirección *" placeholder="Calle y número del local"
                onSelect={setUbicacion} />

              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8B8BA8]">Cuenta del dueño (opcional)</p>
                <Input label="Nombre del dueño" icon={<User size={16} />} value={duenoNombre} onChange={e => setDuenoNombre(e.target.value)} placeholder="Nombre y apellidos" />
                <Input label="Email del dueño" type="email" icon={<Mail size={16} />} value={duenoEmail} onChange={e => setDuenoEmail(e.target.value)} placeholder="dueno@email.com" hint="Si lo pones, generamos su acceso para entregárselo en mano." />
              </div>

              <Button fullWidth size="lg" loading={guardando} onClick={guardar}>Crear local</Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
