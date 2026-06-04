'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase/client'
import { calcularEdad, normalizarTelefono, validarTelefono } from '@/lib/utils'
import { PhotoUpload } from '@/components/ui/PhotoUpload'
import {
  Phone, User, Calendar, ChevronLeft, ChevronRight, Check,
  Mail, Lock, Eye, EyeOff, MailCheck, Gift,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type Step = 'metodo' | 'telefono' | 'sms' | 'nombre' | 'nacimiento' | 'foto' | 'permisos' | 'terminos'

// Pasos del asistente por teléfono (la barra de progreso solo cuenta estos).
const STEPS: Step[] = ['telefono', 'sms', 'nombre', 'nacimiento', 'foto', 'permisos', 'terminos']

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  )
}

const validarEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

export default function RegistroPage() {
  const router = useRouter()
  const toast = useToast()
  const [step, setStep] = useState<Step>('metodo')
  const [loading, setLoading] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [verPass, setVerPass] = useState(false)
  const [correoEnviado, setCorreoEnviado] = useState('')
  const [form, setForm] = useState({
    email: '',
    password: '',
    prefijo: '+34',
    telefono: '',
    codigo: '',
    nombre: '',
    apellidos: '',
    referido: '',
    fecha_nacimiento: '',
    foto_perfil_url: '',
    aceptar_terminos: false,
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [authIdPreRegistro, setAuthIdPreRegistro] = useState<string | null>(null)
  const [refInfo, setRefInfo] = useState<{ valido: boolean; nombre?: string } | null>(null)

  // Valida el código de referido (slug del RRPP) con debounce, para dar feedback.
  useEffect(() => {
    const code = form.referido.trim()
    if (code.length < 2) { setRefInfo(null); return }
    const t = setTimeout(() => {
      fetch(`/api/rrpp/referido?codigo=${encodeURIComponent(code)}`)
        .then(r => r.ok ? r.json() : null)
        .then(j => setRefInfo(j ? { valido: !!j.valido, nombre: j.nombre_publico } : null))
        .catch(() => setRefInfo(null))
    }, 400)
    return () => clearTimeout(t)
  }, [form.referido])

  // Tras verificar el SMS, Supabase ya da sesión auth. Capturamos auth.uid()
  // para usarlo como path en Storage al subir la foto del paso 5.
  useEffect(() => {
    if (step === 'foto' && !authIdPreRegistro) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) setAuthIdPreRegistro(data.user.id)
      })
    }
  }, [step, authIdPreRegistro])

  const stepIndex = STEPS.indexOf(step)
  const enAsistente = stepIndex >= 0
  const progreso = ((stepIndex + 1) / STEPS.length) * 100

  const ir = (s: Step) => setStep(s)
  const next = () => ir(STEPS[stepIndex + 1])

  // ---- Registro con Google ----
  const registroGoogle = async () => {
    setLoadingGoogle(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/mapa` },
    })
    if (error) {
      toast.error('No se pudo conectar con Google')
      setLoadingGoogle(false)
    }
  }

  // ---- Registro con correo + contraseña ----
  const registroCorreo = async () => {
    const errs: Record<string, string> = {}
    if (!validarEmail(form.email)) errs.email = 'Introduce un correo válido'
    if (form.password.length < 6) errs.password = 'Mínimo 6 caracteres'
    setErrores(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    try { if (form.referido) sessionStorage.setItem('rumbo_ref', form.referido) } catch {}
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/mapa` },
    })
    if (error) {
      toast.error(error.message || 'No se pudo crear la cuenta')
      setLoading(false)
      return
    }
    if (data.session) {
      // Sin verificación de email: ya hay sesión → completar perfil
      router.push('/completar-perfil')
    } else {
      // Requiere confirmar el correo
      setCorreoEnviado(form.email.trim())
    }
    setLoading(false)
  }

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
      else if (calcularEdad(form.fecha_nacimiento) < 18) errs.fecha_nacimiento = 'Debes tener 18 años o más para usar Rumbo'
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
      apellidos: form.apellidos.trim() || null,
      fecha_nacimiento: form.fecha_nacimiento,
      foto_perfil_url: form.foto_perfil_url || null,
      referido_codigo: form.referido || null,
      referido_at: form.referido ? new Date().toISOString() : null,
      estado_cuenta: 'activa',
    })

    if (error) {
      toast.error('Error al crear la cuenta. Inténtalo de nuevo.')
    } else {
      toast.success('¡Cuenta creada! Bienvenido/a a Rumbo')
      router.push('/mapa')
    }
    setLoading(false)
  }

  const handleNext = () => {
    if (!validarPaso()) return
    if (step === 'foto' || step === 'permisos') next()
    else if (step === 'terminos') completarRegistro()
    else next()
  }

  const volver = () => {
    if (step === 'telefono') ir('metodo')
    else if (enAsistente && stepIndex > 0) ir(STEPS[stepIndex - 1])
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <div className="absolute top-0 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none bg-[#E94560]/30" />
      <div className="absolute bottom-0 -left-32 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none bg-[#7C5CFF]/25" />

      {/* Header */}
      {step === 'metodo' ? (
        <div className="relative flex items-center gap-3 px-4 pt-10 pb-4 safe-top">
          <Link href="/login" className="p-2 rounded-xl text-[#A0A0B8] hover:text-white hover:bg-white/8 transition-colors">
            <ChevronLeft size={22} />
          </Link>
          <div className="w-10 h-10 rounded-xl holo-bg flex items-center justify-center shadow-[0_4px_14px_-4px_rgba(124,92,255,0.6)]">
            <span className="text-sm font-black text-white">R</span>
          </div>
        </div>
      ) : (
        <div className="relative flex items-center gap-4 px-4 pt-10 pb-4 safe-top">
          <button onClick={volver} className="p-2 rounded-xl text-[#A0A0B8] hover:text-white hover:bg-white/8 transition-colors">
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-[#A0A0B8] uppercase tracking-[0.2em]">Paso {stepIndex + 1} de {STEPS.length}</span>
              <span className="text-[10px] font-bold text-[#E94560] tracking-wider">{Math.round(progreso)}%</span>
            </div>
            <div className="h-1 bg-white/8 rounded-full overflow-hidden">
              <div className="h-full bg-[#E94560] rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(233,69,96,0.6)]" style={{ width: `${progreso}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="flex-1 px-6 pt-8 pb-4">
        {/* ====== Paso 0: elegir método ====== */}
        {step === 'metodo' && !correoEnviado && (
          <div className="space-y-5 max-w-md mx-auto w-full">
            <div>
              <p className="eyebrow mb-2">Únete</p>
              <h1 className="text-3xl font-bold text-white text-display tracking-tight mb-1.5">Crea tu cuenta</h1>
              <p className="text-[#A0A0B8]">Empieza a vivir la noche</p>
            </div>

            <button
              type="button"
              onClick={registroGoogle}
              disabled={loadingGoogle}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white text-[15px] font-semibold text-[#1A1A22] transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-60"
            >
              <GoogleIcon />
              {loadingGoogle ? 'Conectando…' : 'Registrarme con Google'}
            </button>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#6B6B85]">o con tu correo</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              error={errores.email}
              icon={<Mail size={16} />}
            />
            <Input
              type={verPass ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Crea una contraseña (mín. 6)"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              error={errores.password}
              icon={<Lock size={16} />}
              iconRight={
                <button
                  type="button"
                  onClick={() => setVerPass(v => !v)}
                  className="pointer-events-auto text-[#6B6B85] transition-colors hover:text-white"
                  aria-label={verPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              onKeyDown={e => { if (e.key === 'Enter') registroCorreo() }}
            />
            <div>
              <Input
                placeholder="Código de referido (opcional)"
                value={form.referido}
                onChange={e => setForm(f => ({ ...f, referido: e.target.value.trim().toUpperCase() }))}
                icon={<Gift size={16} />}
                hint={refInfo ? undefined : '¿Te invitó un RRPP? Pon su código.'}
              />
              {refInfo && (
                <p className={`mt-1 text-xs ${refInfo.valido ? 'text-emerald-400' : 'text-[#E94560]'}`}>
                  {refInfo.valido ? `✓ Te invita ${refInfo.nombre}` : 'Ese código de referido no existe'}
                </p>
              )}
            </div>
            <Button fullWidth size="lg" onClick={registroCorreo} loading={loading}>
              Crear cuenta
            </Button>

            <button
              type="button"
              onClick={() => { setErrores({}); ir('telefono') }}
              className="flex w-full items-center justify-center gap-2 py-2 text-sm text-[#A0A0B8] transition-colors hover:text-white"
            >
              <Phone size={14} />
              Prefiero registrarme con mi teléfono
            </button>

            <p className="text-center text-sm text-[#6B6B85]">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-[#E94560] font-semibold">Inicia sesión</Link>
            </p>
          </div>
        )}

        {/* Confirmación de correo enviada */}
        {step === 'metodo' && correoEnviado && (
          <div className="space-y-6 max-w-md mx-auto w-full text-center pt-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E94560]/12 text-[#E94560] border border-[#E94560]/25">
              <MailCheck size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white text-display tracking-tight mb-2">Revisa tu correo</h1>
              <p className="text-[#A0A0B8]">
                Te hemos enviado un enlace a <span className="text-white">{correoEnviado}</span>.
                Ábrelo para confirmar tu cuenta y terminar el registro.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setCorreoEnviado(''); }}
              className="text-sm text-[#A0A0B8] hover:text-white transition-colors"
            >
              Usar otro correo
            </button>
          </div>
        )}

        {step === 'telefono' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white text-display tracking-tight mb-1.5">Tu número de teléfono</h1>
              <p className="text-[#A0A0B8]">Te enviaremos un código por SMS para verificarlo</p>
            </div>
            <div className="flex gap-3">
              <select
                value={form.prefijo}
                onChange={e => setForm(f => ({ ...f, prefijo: e.target.value }))}
                className="h-12 glass rounded-xl text-white px-3 text-sm"
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
            <p className="text-center text-sm text-[#6B6B85]">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-[#E94560]">Inicia sesión</Link>
            </p>
          </div>
        )}

        {step === 'sms' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white text-display tracking-tight mb-1.5">Verifica tu número</h1>
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
              <h1 className="text-3xl font-bold text-white text-display tracking-tight mb-1.5">¿Cómo te llamas?</h1>
              <p className="text-[#A0A0B8]">Tu nombre y apellidos para tu cuenta</p>
            </div>
            <Input
              label="Nombre"
              placeholder="Tu nombre"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              error={errores.nombre}
              icon={<User size={16} />}
              maxLength={50}
            />
            <Input
              label="Apellidos"
              placeholder="Tus apellidos"
              value={form.apellidos}
              onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))}
              icon={<User size={16} />}
              maxLength={80}
            />
          </div>
        )}

        {step === 'nacimiento' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white text-display tracking-tight mb-1.5">¿Cuándo naciste?</h1>
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
                Rumbo es solo para mayores de 18 años.
              </div>
            )}
          </div>
        )}

        {step === 'foto' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white text-display tracking-tight mb-1.5">Foto de perfil</h1>
              <p className="text-[#A0A0B8]">Opcional. Puedes añadirla más adelante.</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <PhotoUpload
                bucket="perfiles"
                path={authIdPreRegistro ?? 'pendiente'}
                variant="circle"
                label="Subir foto"
                currentUrl={form.foto_perfil_url}
                onUpload={url => setForm(f => ({ ...f, foto_perfil_url: url }))}
                onError={msg => toast.error(msg)}
              />
              <p className="text-sm text-[#6B6B85] text-center max-w-xs">
                JPG, PNG o WEBP · Hasta 5MB. Se mostrará en tu carta de perfil y en planes.
              </p>
            </div>
          </div>
        )}

        {step === 'permisos' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white text-display tracking-tight mb-1.5">Permisos necesarios</h1>
              <p className="text-[#A0A0B8]">Puedes aceptarlos ahora o más adelante cuando los necesites</p>
            </div>
            <div className="space-y-4">
              {[
                { icon: '📍', title: 'Ubicación', desc: 'Para centrar el mapa y verificar que estás en el local' },
                { icon: '🔔', title: 'Notificaciones', desc: 'Para alertas de locales que sigues y del sistema' },
                { icon: '📷', title: 'Cámara y galería', desc: 'Para tu foto de perfil' },
              ].map(p => (
                <div key={p.title} className="flex gap-4 p-4 glass rounded-xl">
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
              <h1 className="text-3xl font-bold text-white text-display tracking-tight mb-1.5">Casi listo</h1>
              <p className="text-[#A0A0B8]">Acepta para crear tu cuenta</p>
            </div>
            <label className="flex items-start gap-4 p-4 glass rounded-xl cursor-pointer">
              <div
                onClick={() => setForm(f => ({ ...f, aceptar_terminos: !f.aceptar_terminos }))}
                className={cn(
                  'w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
                  form.aceptar_terminos ? 'bg-[#E94560] border-[#E94560]' : 'border-white/10'
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

      {/* Botón siguiente (solo en pasos del asistente, no en métodos ni SMS) */}
      {enAsistente && step !== 'telefono' && step !== 'sms' && (
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
              className="w-full mt-3 text-sm text-[#6B6B85] hover:text-white transition-colors"
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
