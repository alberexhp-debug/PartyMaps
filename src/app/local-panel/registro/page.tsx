'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError || !authData.user) {
      toast.error(authError?.message === 'User already registered' ? 'Este email ya está registrado' : 'Error al crear la cuenta')
      setLoading(false)
      return
    }

    // 2. Crear el local con estado pendiente_verificacion
    const { data: localData, error: localError } = await supabase.from('locales').insert({
      nombre: form.nombre_local.trim(),
      tipo_local: form.tipo_local,
      ciudad: form.ciudad,
      direccion: form.direccion.trim(),
      latitud: parseFloat(form.latitud),
      longitud: parseFloat(form.longitud),
      aforo_maximo: parseInt(form.aforo_maximo) || 200,
      descripcion: form.descripcion.trim() || null,
      cif: form.cif.trim() || null,
      musica: [],
      imagenes: [],
      modulos_activos: [],
      consumiciones_bienvenida: [],
      estado: 'pendiente_verificacion',
      tier: 'basico',
      radio_verificacion_metros: 150,
      horario: {},
    }).select('id').single()

    if (localError || !localData) {
      toast.error('Error al registrar el local')
      setLoading(false)
      return
    }

    // 3. Crear usuario_local como dueño
    const { error: workerError } = await supabase.from('usuario_local').insert({
      usuario_id: authData.user.id,
      local_id: localData.id,
      rol: 'dueno',
      email: form.email,
      nombre: form.nombre_responsable.trim(),
      activo: true,
    })

    if (workerError) {
      toast.error('Error al vincular la cuenta con el local')
      setLoading(false)
      return
    }

    setStep('listo')
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
      <div className="min-h-screen bg-[#0D0D1A] flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-3xl flex items-center justify-center">
          <Check size={36} className="text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white mb-2">¡Solicitud enviada!</h1>
          <p className="text-[#A0A0B8] max-w-xs">
            Tu local está pendiente de verificación. El equipo de PartyMaps revisará la información y activará tu cuenta en 24-48h.
          </p>
        </div>
        <div className="bg-[#1A1A2E] border border-[#2A2A3E] rounded-2xl p-4 text-sm text-[#A0A0B8] text-left w-full max-w-xs space-y-1">
          <p className="text-white font-semibold mb-2">Próximos pasos:</p>
          <p>1. Revisa tu email para confirmar tu cuenta</p>
          <p>2. Espera la verificación del equipo</p>
          <p>3. Accede al panel con tu email y contraseña</p>
        </div>
        <Button onClick={() => router.push('/local-panel/login')}>
          Ir al acceso del panel
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D1A] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 pt-12 pb-4">
        {stepIdx > 0 ? (
          <button onClick={() => setStep(STEPS[stepIdx - 1])} className="p-2 rounded-xl text-[#A0A0B8] hover:text-white hover:bg-[#1A1A2E]">
            <ChevronLeft size={22} />
          </button>
        ) : (
          <Link href="/local-panel/login" className="p-2 rounded-xl text-[#A0A0B8] hover:text-white hover:bg-[#1A1A2E]">
            <ChevronLeft size={22} />
          </Link>
        )}
        <div className="flex-1">
          <div className="h-1 bg-[#1A1A2E] rounded-full overflow-hidden">
            <div className="h-full bg-[#E94560] rounded-full transition-all duration-500" style={{ width: `${progreso}%` }} />
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pt-6 pb-4 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#E94560]/10 border border-[#E94560]/30 rounded-xl flex items-center justify-center">
            <Store size={20} className="text-[#E94560]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">
              {step === 'cuenta' ? 'Crea tu cuenta' : step === 'local' ? 'Tu local' : 'Ubicación'}
            </h1>
            <p className="text-xs text-[#505065]">Paso {stepIdx + 1} de {STEPS.length}</p>
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
                      form.tipo_local === t.value ? 'border-[#E94560] bg-[#E94560]/10 text-white' : 'border-[#2A2A3E] text-[#A0A0B8] hover:border-[#505065]')}>
                    <span>{t.emoji}</span>
                    <span className="font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#A0A0B8]">Ciudad *</label>
              <select value={form.ciudad} onChange={e => update('ciudad', e.target.value)}
                className="w-full px-4 py-3 bg-[#0D0D1A] border border-[#2A2A3E] rounded-xl text-white text-sm outline-none">
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
                className="w-full px-4 py-3 bg-[#0D0D1A] border border-[#2A2A3E] rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50 resize-none placeholder:text-[#505065]" />
            </div>
          </div>
        )}

        {step === 'ubicacion' && (
          <div className="space-y-4">
            <p className="text-sm text-[#A0A0B8]">
              Introduce la dirección exacta del local y sus coordenadas GPS. Los usuarios las usarán para el check-in y para encontrarte en el mapa.
            </p>

            <Input label="Dirección completa *" placeholder="Calle Gran Vía, 45, 28013 Madrid" value={form.direccion}
              onChange={e => update('direccion', e.target.value)} icon={<MapPin size={16} />} />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#A0A0B8]">Latitud *</label>
                <Input type="number" step="0.0001" placeholder="40.4168" value={form.latitud}
                  onChange={e => update('latitud', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#A0A0B8]">Longitud *</label>
                <Input type="number" step="0.0001" placeholder="-3.7038" value={form.longitud}
                  onChange={e => update('longitud', e.target.value)} />
              </div>
            </div>

            <div className="p-3 bg-[#1A1A2E] rounded-xl border border-[#2A2A3E] text-xs text-[#505065]">
              💡 Busca tu local en <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-[#4F8EF7]">Google Maps</a>, haz clic derecho sobre la ubicación exacta y copia las coordenadas.
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-10 space-y-3">
        <Button fullWidth onClick={handleNext} loading={loading}>
          {step === 'ubicacion' ? 'Enviar solicitud' : 'Siguiente'}
          {step !== 'ubicacion' && <ChevronRight size={18} />}
        </Button>
        {step === 'cuenta' && (
          <p className="text-center text-sm text-[#505065]">
            ¿Ya tienes cuenta?{' '}
            <Link href="/local-panel/login" className="text-[#E94560]">Inicia sesión</Link>
          </p>
        )}
      </div>
    </div>
  )
}
