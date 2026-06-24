'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BuscadorDireccion } from '@/components/ui/BuscadorDireccion'
import { useToast } from '@/components/ui/Toast'
import { TipoLocal } from '@/types'
import { Building2, MapPin, Mail, Lock, ChevronLeft, ChevronRight, Check, Store } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Step = 'cuenta' | 'local' | 'ubicacion' | 'listo'

const TIPOS_LOCAL: { value: TipoLocal; label: string; emoji: string }[] = [
  { value: 'discoteca', label: 'Discoteca', emoji: '🎉' },
  { value: 'bar_copas', label: 'Bar de copas', emoji: '🍸' },
  { value: 'rooftop', label: 'Rooftop', emoji: '🌆' },
  { value: 'sala_conciertos', label: 'Sala de conciertos', emoji: '🎸' },
  { value: 'bar_cocteleria', label: 'Coctelería', emoji: '🍹' },
  { value: 'otro', label: 'Otro', emoji: '🏠' },
]

export default function LocalPanelRegistroPage() {
  const router = useRouter()
  const toast = useToast()
  const [step, setStep] = useState<Step>('cuenta')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    nombre_responsable: '',
    nombre_local: '',
    tipo_local: '' as TipoLocal | '',
    ciudad: 'Madrid',
    direccion: '',
    latitud: '40.4168',
    longitud: '-3.7038',
    aforo_maximo: '200',
    descripcion: '',
    cif: '',
  })

  const update = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }))

  const validarCuenta = () => {
    if (!form.email.includes('@')) { toast.error('Email inválido'); return false }
    if (form.password.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return false }
    if (form.password !== form.passwordConfirm) { toast.error('Las contraseñas no coinciden'); return false }
    if (!form.nombre_responsable.trim()) { toast.error('Introduce tu nombre'); return false }
    return true
  }

  const validarLocal = () => {
    if (!form.nombre_local.trim()) { toast.error('Introduce el nombre del local'); return false }
    if (!form.tipo_local) { toast.error('Selecciona el tipo de local'); return false }
    return true
  }

  const validarUbicacion = () => {
    if (!form.direccion.trim()) { toast.error('Introduce la dirección'); return false }
    if (!form.latitud || !form.longitud) { toast.error('Introduce las coordenadas'); return false }
    return true
  }

  const registrar = async () => {
    if (!validarUbicacion()) return
    setLoading(true)

    // Todo el alta va por el servidor: la RLS no permite a un usuario normal
    // crear `locales`/`usuario_local` (solo service_role), y allí la cuenta se
    // crea ya confirmada (alta directa, sin correo). El local nace en
    // `pendiente_verificacion` → solicitud en el panel de admin de TODH.
    try {
      const res = await fetch('/api/local-panel/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          nombre_responsable: form.nombre_responsable,
          nombre_local: form.nombre_local,
          tipo_local: form.tipo_local,
          ciudad: form.ciudad,
          direccion: form.direccion,
          latitud: form.latitud,
          longitud: form.longitud,
          aforo_maximo: form.aforo_maximo,
          descripcion: form.descripcion,
          cif: form.cif,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || 'No se pudo enviar la solicitud')
        setLoading(false)
        return
      }
      setStep('listo')
    } catch {
      toast.error('No se pudo conectar. Inténtalo de nuevo.')
    }
    setLoading(false)
  }

  const handleNext = async () => {
    if (step === 'cuenta') {
      if (validarCuenta()) setStep('local')
    } else if (step === 'local') {
      if (validarLocal()) setStep('ubicacion')
    } else if (step === 'ubicacion') {
      await registrar()
    }
  }

  const STEPS: Step[] = ['cuenta', 'local', 'ubicacion']
  const stepIdx = STEPS.indexOf(step)
  const progreso = step === 'listo' ? 100 : ((stepIdx + 1) / STEPS.length) * 100

  if (step === 'listo') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-3xl flex items-center justify-center">
          <Check size={36} className="text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white mb-2">¡Solicitud enviada!</h1>
          <p className="text-[#A0A0B8] max-w-xs">
            Tu local está pendiente de verificación. El equipo de TODH revisará la información y activará tu cuenta en 24-48h.
          </p>
        </div>
        <div className="glass rounded-2xl p-4 text-sm text-[#A0A0B8] text-left w-full max-w-xs space-y-1">
          <p className="text-white font-semibold mb-2">Próximos pasos:</p>
          <p>1. Tu cuenta ya está creada (sin pasos extra)</p>
          <p>2. El equipo de TODH revisa y aprueba tu local</p>
          <p>3. Cuando se apruebe, accede al panel con tu email y contraseña</p>
        </div>
        <Button onClick={() => router.push('/local-panel/login')}>
          Ir al acceso del panel
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 pt-12 pb-4">
        {stepIdx > 0 ? (
          <button onClick={() => setStep(STEPS[stepIdx - 1])} className="p-2 rounded-xl text-[#A0A0B8] hover:text-white hover:bg-white/6">
            <ChevronLeft size={22} />
          </button>
        ) : (
          <Link href="/local-panel/login" className="p-2 rounded-xl text-[#A0A0B8] hover:text-white hover:bg-white/6">
            <ChevronLeft size={22} />
          </Link>
        )}
        <div className="flex-1">
          <div className="h-1 bg-white/6 rounded-full overflow-hidden">
            <div className="h-full bg-[#B6FF3A] rounded-full transition-all duration-500" style={{ width: `${progreso}%` }} />
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pt-6 pb-4 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#B6FF3A]/10 border border-[#B6FF3A]/30 rounded-xl flex items-center justify-center">
            <Store size={20} className="text-[#B6FF3A]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">
              {step === 'cuenta' ? 'Crea tu cuenta' : step === 'local' ? 'Tu local' : 'Ubicación'}
            </h1>
            <p className="text-xs text-[#6B6B85]">Paso {stepIdx + 1} de {STEPS.length}</p>
          </div>
        </div>

        {step === 'cuenta' && (
          <div className="space-y-4">
            <Input label="Tu nombre completo *" placeholder="María García" value={form.nombre_responsable}
              onChange={e => update('nombre_responsable', e.target.value)} icon={<Building2 size={16} />} />
            <Input label="Email de acceso *" type="email" placeholder="tu@email.com" value={form.email}
              onChange={e => update('email', e.target.value)} icon={<Mail size={16} />} />
            <Input label="Contraseña *" type="password" placeholder="Mínimo 8 caracteres" value={form.password}
              onChange={e => update('password', e.target.value)} icon={<Lock size={16} />} />
            <Input label="Repite la contraseña *" type="password" placeholder="Repite la contraseña" value={form.passwordConfirm}
              onChange={e => update('passwordConfirm', e.target.value)} icon={<Lock size={16} />} />
          </div>
        )}

        {step === 'local' && (
          <div className="space-y-4">
            <Input label="Nombre del local *" placeholder="Ej: Sala Razzmatazz" value={form.nombre_local}
              onChange={e => update('nombre_local', e.target.value)} icon={<Store size={16} />} />

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#A0A0B8]">Tipo de local *</label>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS_LOCAL.map(t => (
                  <button key={t.value} onClick={() => update('tipo_local', t.value)}
                    className={cn('flex items-center gap-2 p-3 rounded-xl border text-sm text-left transition-colors',
                      form.tipo_local === t.value ? 'border-[#B6FF3A] bg-[#B6FF3A]/10 text-[#0A0A0F]' : 'border-white/10 text-[#A0A0B8] hover:border-[#505065]')}>
                    <span>{t.emoji}</span>
                    <span className="font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#A0A0B8]">Ciudad *</label>
              <select value={form.ciudad} onChange={e => update('ciudad', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none">
                {['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Málaga', 'Zaragoza', 'Otra'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#A0A0B8]">Aforo máximo</label>
              <Input type="number" placeholder="200" value={form.aforo_maximo}
                onChange={e => update('aforo_maximo', e.target.value)} icon={<Building2 size={16} />} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#A0A0B8]">CIF/NIF de la empresa (opcional)</label>
              <Input placeholder="B12345678" value={form.cif} onChange={e => update('cif', e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#A0A0B8]">Descripción breve (opcional)</label>
              <textarea value={form.descripcion} onChange={e => update('descripcion', e.target.value)}
                placeholder="Cuéntanos brevemente qué tipo de local sois..." rows={3} maxLength={300}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#B6FF3A]/50 resize-none placeholder:text-[#6B6B85]" />
            </div>
          </div>
        )}

        {step === 'ubicacion' && (
          <div className="space-y-4">
            <p className="text-sm text-[#A0A0B8]">
              Busca la dirección del local y elígela en la lista. Situaremos tu local en el mapa en su calle exacta (los usuarios la usan para el check-in y para encontrarte).
            </p>

            <BuscadorDireccion
              label="Dirección *"
              placeholder="Calle y número del local"
              onSelect={d => {
                if (d) setForm(f => ({ ...f, direccion: d.direccion, latitud: String(d.latitud), longitud: String(d.longitud) }))
                else setForm(f => ({ ...f, direccion: '', latitud: '', longitud: '' }))
              }}
            />

            {form.direccion && (
              <div className="flex items-center gap-2 rounded-xl border border-green-400/25 bg-green-400/[0.06] px-3.5 py-2.5 text-sm text-white">
                <MapPin size={15} className="shrink-0 text-green-400" />
                <span className="truncate">{form.direccion}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-6 pb-10 space-y-3">
        <Button fullWidth onClick={handleNext} loading={loading}>
          {step === 'ubicacion' ? 'Enviar solicitud' : 'Siguiente'}
          {step !== 'ubicacion' && <ChevronRight size={18} />}
        </Button>
        {step === 'cuenta' && (
          <p className="text-center text-sm text-[#6B6B85]">
            ¿Ya tienes cuenta?{' '}
            <Link href="/local-panel/login" className="text-[#B6FF3A]">Inicia sesión</Link>
          </p>
        )}
      </div>
    </div>
  )
}
