'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase/client'
import { calcularEdad, normalizarTelefono, validarTelefono } from '@/lib/utils'
import { Phone, User, Calendar, Camera, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type Step = 'telefono' | 'sms' | 'nombre' | 'nacimiento' | 'foto' | 'permisos' | 'terminos'

const STEPS: Step[] = ['telefono', 'sms', 'nombre', 'nacimiento', 'foto', 'permisos', 'terminos']

export default function RegistroPage() {
  const router = useRouter()
  const toast = useToast()
  const [step, setStep] = useState<Step>('telefono')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    prefijo: '+34',
    telefono: '',
    codigo: '',
    nombre: '',
    fecha_nacimiento: '',
    foto_perfil_url: '',
    aceptar_terminos: false,
  })
  const [errores, setErrores] = useState<Record<string, string>>({})

  const stepIndex = STEPS.indexOf(step)
  const progreso = ((stepIndex + 1) / STEPS.length) * 100

  const ir = (s: Step) => setStep(s)
  const next = () => ir(STEPS[stepIndex + 1])

  const validarPaso = (): boolean => {
    const errs: Record<string, string> = {}
    if (step === 'telefono') {
      if (!validarTelefono(form.telefono)) errs.telefono = 'Introduce un número válido'
    }
    if (step === 'sms') {
      if (form.codigo.length !== 6) errs.codigo = 'El código tiene 6 dígitos'
    }
    if (step === 'nombre') {
      if (form.nombre.trim().length < 2) errs.nombre = 'Mínimo 2 caracteres'
      if (form.nombre.length > 50) errs.nombre = 'Máximo 50 caracteres'
    }
    if (step === 'nacimiento') {
      if (!form.fecha_nacimiento) errs.fecha_nacimiento = 'Introduce tu fecha de nacimiento'
      else if (calcularEdad(form.fecha_nacimiento) < 18) errs.fecha_nacimiento = 'Debes tener 18 años o más para usar PartyMaps'
    }
    if (step === 'terminos') {
      if (!form.aceptar_terminos) errs.terminos = 'Debes aceptar los términos para continuar'
    }
    setErrores(errs)
    return Object.keys(errs).length === 0
  }

  const enviarSMS = async () => {
    if (!validarPaso()) return
    setLoading(true)
    const tel = normalizarTelefono(form.telefono, form.prefijo)
    const { error } = await supabase.auth.signInWithOtp({ phone: tel })
    if (error) {
      toast.error('Error al enviar el SMS. Verifica el número.')
    } else {
      toast.success('Código enviado')
      next()
    }
    setLoading(false)
  }

  const verificarSMS = async () => {
    if (!validarPaso()) return
    setLoading(true)
    const tel = normalizarTelefono(form.telefono, form.prefijo)
    const { error } = await supabase.auth.verifyOtp({
      phone: tel,
      token: form.codigo,
      type: 'sms',
    })
    if (error) {
      toast.error('Código incorrecto o expirado')
    } else {
      next()
    }
    setLoading(false)
  }

  const completarRegistro = async () => {
    if (!validarPaso()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Error de sesión. Vuelve a intentarlo.'); setLoading(false); return }

    const tel = normalizarTelefono(form.telefono, form.prefijo)
    const { error } = await supabase.from('usuarios').insert({
      auth_id: user.id,
      telefono: tel,
      telefono_verificado: true,
      nombre: form.nombre.trim(),
      fecha_nacimiento: form.fecha_nacimiento,
      foto_perfil_url: form.foto_perfil_url || null,
      estado_cuenta: 'activa',
    })

    if (error) {
      toast.error('Error al crear la cuenta. Inténtalo de nuevo.')
    } else {
      toast.success('¡Cuenta creada! Bienvenido/a a PartyMaps')
      router.push('/explorar')
    }
    setLoading(false)
  }

  const handleNext = () => {
    if (!validarPaso()) return
    if (step === 'foto' || step === 'permisos') next()
    else if (step === 'terminos') completarRegistro()
    else next()
  }

  return (
    <div className="min-h-screen bg-[#0D0D1A] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 pt-12 pb-4">
        {stepIndex > 0 && (
          <button onClick={() => ir(STEPS[stepIndex - 1])} className="p-2 rounded-xl text-[#A0A0B8] hover:text-white hover:bg-[#1A1A2E]">
            <ChevronLeft size={22} />
          </button>
        )}
        <div className="flex-1">
          <div className="h-1 bg-[#1A1A2E] rounded-full overflow-hidden">
            <div className="h-full bg-[#E94560] rounded-full transition-all duration-500" style={{ width: `${progreso}%` }} />
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 px-6 pt-8 pb-4">
        {step === 'telefono' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Tu número de teléfono</h1>
              <p className="text-[#A0A0B8]">Te enviaremos un código por SMS para verificarlo</p>
            </div>
            <div className="flex gap-3">
              <select
                value={form.prefijo}
                onChange={e => setForm(f => ({ ...f, prefijo: e.target.value }))}
                className="h-12 bg-[#1A1A2E] border border-[#2A2A3E] rounded-xl text-white px-3 text-sm"
              >
                <option value="+34">🇪🇸 +34</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+33">🇫🇷 +33</option>
                <option value="+49">🇩🇪 +49</option>
              </select>
              <Input
                className="flex-1"
                type="tel"
                placeholder="600 000 000"
                value={form.telefono}
                onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                error={errores.telefono}
                icon={<Phone size={16} />}
              />
            </div>
            <Button fullWidth onClick={enviarSMS} loading={loading}>
              Enviar código SMS
            </Button>
            <p className="text-center text-sm text-[#505065]">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-[#E94560]">Inicia sesión</Link>
            </p>
          </div>
        )}

        {step === 'sms' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Verifica tu número</h1>
              <p className="text-[#A0A0B8]">
                Código enviado a {form.prefijo} {form.telefono}
              </p>
            </div>
            <Input
              label="Código de 6 dígitos"
              type="number"
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              value={form.codigo}
              onChange={e => setForm(f => ({ ...f, codigo: e.target.value.slice(0, 6) }))}
              error={errores.codigo}
              className="text-center text-2xl tracking-widest"
            />
            <Button fullWidth onClick={verificarSMS} loading={loading}>
              Verificar código
            </Button>
            <button
              className="w-full text-sm text-[#A0A0B8] hover:text-white transition-colors"
              onClick={enviarSMS}
              disabled={loading}
            >
              No recibí el código — reenviar
            </button>
          </div>
        )}

        {step === 'nombre' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">¿Cómo te llamamos?</h1>
              <p className="text-[#A0A0B8]">Este nombre aparecerá en los planes y módulos</p>
            </div>
            <Input
              label="Tu nombre de usuario"
              placeholder="Ej: Alex, María, DJ Pepe..."
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              error={errores.nombre}
              icon={<User size={16} />}
              maxLength={50}
            />
            <p className="text-xs text-[#505065]">No hace falta que sea tu nombre real.</p>
          </div>
        )}

        {step === 'nacimiento' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">¿Cuándo naciste?</h1>
              <p className="text-[#A0A0B8]">Verificamos que tienes 18 años o más</p>
            </div>
            <Input
              label="Fecha de nacimiento"
              type="date"
              value={form.fecha_nacimiento}
              onChange={e => setForm(f => ({ ...f, fecha_nacimiento: e.target.value }))}
              error={errores.fecha_nacimiento}
              icon={<Calendar size={16} />}
              max={new Date().toISOString().split('T')[0]}
            />
            {errores.fecha_nacimiento?.includes('18') && (
              <div className="bg-[#E94560]/10 border border-[#E94560]/30 rounded-xl p-4 text-sm text-[#E94560]">
                PartyMaps es solo para mayores de 18 años.
              </div>
            )}
          </div>
        )}

        {step === 'foto' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Foto de perfil</h1>
              <p className="text-[#A0A0B8]">Opcional. Puedes añadirla más adelante.</p>
            </div>
            <div className="flex flex-col items-center gap-6">
              <div className="w-28 h-28 rounded-full bg-[#1A1A2E] border-2 border-dashed border-[#2A2A3E] flex items-center justify-center">
                {form.foto_perfil_url ? (
                  <img src={form.foto_perfil_url} className="w-full h-full rounded-full object-cover" alt="Perfil" />
                ) : (
                  <Camera size={32} className="text-[#505065]" />
                )}
              </div>
              <p className="text-sm text-[#505065] text-center">Función de subida disponible después del registro</p>
            </div>
          </div>
        )}

        {step === 'permisos' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Permisos necesarios</h1>
              <p className="text-[#A0A0B8]">Puedes aceptarlos ahora o más adelante cuando los necesites</p>
            </div>
            <div className="space-y-4">
              {[
                { icon: '📍', title: 'Ubicación', desc: 'Para centrar el mapa y verificar que estás en el local' },
                { icon: '🔔', title: 'Notificaciones', desc: 'Para alertas de locales que sigues y del sistema' },
                { icon: '📷', title: 'Cámara y galería', desc: 'Para participar en concursos de foto' },
              ].map(p => (
                <div key={p.title} className="flex gap-4 p-4 bg-[#1A1A2E] rounded-xl border border-[#2A2A3E]">
                  <span className="text-2xl">{p.icon}</span>
                  <div>
                    <p className="font-semibold text-white text-sm">{p.title}</p>
                    <p className="text-xs text-[#A0A0B8] mt-0.5">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'terminos' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Casi listo</h1>
              <p className="text-[#A0A0B8]">Acepta para crear tu cuenta</p>
            </div>
            <label className="flex items-start gap-4 p-4 bg-[#1A1A2E] rounded-xl border border-[#2A2A3E] cursor-pointer">
              <div
                onClick={() => setForm(f => ({ ...f, aceptar_terminos: !f.aceptar_terminos }))}
                className={cn(
                  'w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
                  form.aceptar_terminos ? 'bg-[#E94560] border-[#E94560]' : 'border-[#2A2A3E]'
                )}
              >
                {form.aceptar_terminos && <Check size={14} className="text-white" />}
              </div>
              <p className="text-sm text-[#A0A0B8]">
                He leído y acepto los{' '}
                <Link href="/terminos" className="text-[#E94560]">Términos de uso</Link>
                {' '}y la{' '}
                <Link href="/privacidad" className="text-[#E94560]">Política de privacidad</Link>
                . Confirmo que tengo 18 años o más.
              </p>
            </label>
            {errores.terminos && <p className="text-sm text-[#E94560]">{errores.terminos}</p>}
          </div>
        )}
      </div>

      {/* Botón siguiente */}
      {step !== 'telefono' && step !== 'sms' && (
        <div className="px-6 pb-10">
          <Button
            fullWidth
            onClick={handleNext}
            loading={loading}
          >
            {step === 'terminos' ? 'Crear mi cuenta' : step === 'foto' || step === 'permisos' ? 'Continuar' : 'Siguiente'}
            {step !== 'terminos' && <ChevronRight size={18} />}
          </Button>
          {(step === 'foto' || step === 'permisos') && (
            <button
              className="w-full mt-3 text-sm text-[#505065] hover:text-white transition-colors"
              onClick={next}
            >
              Omitir por ahora
            </button>
          )}
        </div>
      )}
    </div>
  )
}
