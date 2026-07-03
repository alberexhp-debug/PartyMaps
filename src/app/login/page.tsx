'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase/client'
import { normalizarTelefono, validarTelefono } from '@/lib/utils'
import {
  Mail, Lock, Phone, Eye, EyeOff, Store, Megaphone,
  ChevronRight, ChevronLeft, MapPin, Ticket, Sparkles,
} from 'lucide-react'

type Metodo = 'correo' | 'telefono'
type FaseTel = 'numero' | 'codigo'

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

export default function LoginPage() {
  const router = useRouter()
  const toast = useToast()

  const [metodo, setMetodo] = useState<Metodo>('correo')
  const [faseTel, setFaseTel] = useState<FaseTel>('numero')

  // Correo
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPass, setVerPass] = useState(false)

  // Teléfono
  const [prefijo, setPrefijo] = useState('+34')
  const [telefono, setTelefono] = useState('')
  const [codigo, setCodigo] = useState('')

  const [loadingCorreo, setLoadingCorreo] = useState(false)
  const [loadingTel, setLoadingTel] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error, setError] = useState('')

  const telCompleto = normalizarTelefono(telefono, prefijo)

  // Avisos llegados del callback de OAuth
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'oauth') {
      toast.error('No se pudo completar el acceso con Google. Inténtalo de nuevo.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Acciones ----
  const loginConGoogle = async () => {
    setLoadingGoogle(true)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/explorar` },
    })
    if (err) {
      toast.error('No se pudo conectar con Google')
      setLoadingGoogle(false)
    }
    // Si va bien, el navegador redirige a Google.
  }

  const loginConCorreo = async () => {
    if (!email.trim()) { setError('Introduce tu correo'); return }
    if (!password) { setError('Introduce tu contraseña'); return }
    setError('')
    setLoadingCorreo(true)
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (err) toast.error('Correo o contraseña incorrectos')
    else router.push('/explorar')
    setLoadingCorreo(false)
  }

  const recuperarPassword = async () => {
    if (!email.trim()) { setError('Escribe tu correo y pulsa de nuevo'); return }
    setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/recuperar-clave`,
    })
    if (err) toast.error('No se pudo enviar el correo de recuperación')
    else toast.success('Si el correo existe, te hemos enviado un enlace para entrar')
  }

  const enviarSMS = async () => {
    if (!validarTelefono(telefono)) { setError('Introduce un número válido'); return }
    setError('')
    setLoadingTel(true)
    const { error: err } = await supabase.auth.signInWithOtp({ phone: telCompleto })
    if (err) {
      toast.error(err.message || 'Error al enviar el SMS')
    } else {
      toast.success('Código enviado')
      setFaseTel('codigo')
    }
    setLoadingTel(false)
  }

  const verificarSMS = async () => {
    if (codigo.length !== 6) { setError('El código tiene 6 dígitos'); return }
    setError('')
    setLoadingTel(true)
    const { error: err } = await supabase.auth.verifyOtp({
      phone: telCompleto, token: codigo, type: 'sms',
    })
    if (err) toast.error('Código incorrecto o expirado')
    else router.push('/explorar')
    setLoadingTel(false)
  }

  const cambiarMetodo = (m: Metodo) => {
    setError('')
    setMetodo(m)
    setFaseTel('numero')
  }

  const selectPrefijo = (
    <select
      value={prefijo}
      onChange={e => setPrefijo(e.target.value)}
      className="h-12 bg-white/5 border border-white/10 rounded-xl text-white px-3 text-sm focus:border-[#B6FF3A]/60 outline-none transition-colors"
    >
      <option value="+34">🇪🇸 +34</option>
      <option value="+1">🇺🇸 +1</option>
      <option value="+44">🇬🇧 +44</option>
      <option value="+33">🇫🇷 +33</option>
    </select>
  )

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0D0F15] lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Halos de fondo (cubren toda la pantalla) */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[34rem] w-[34rem] rounded-full bg-[#B6FF3A]/25 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[34rem] w-[34rem] rounded-full bg-[#7C5CFF]/22 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-48 left-1/4 h-[30rem] w-[30rem] rounded-full bg-[#4F8EF7]/14 blur-[120px]" />

      {/* ====== Showcase (solo escritorio) ====== */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-14 xl:p-16">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent" />
        {/* Marca */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B6FF3A] shadow-[0_8px_28px_-8px_rgba(182,255,58,0.6)]">
            <span className="text-lg font-black text-[#0A0A0F] text-display">T</span>
          </div>
          <span className="text-2xl font-black text-display uppercase tracking-[0.22em] text-white">Tourneum</span>
        </div>

        {/* Mensaje */}
        <div className="relative max-w-md">
          <p className="eyebrow mb-4">La competición empieza aquí</p>
          <h1 className="text-5xl xl:text-6xl font-bold leading-[1.04] text-white text-display tracking-tight">
            Todos los torneos,<br />en una sola<br />app.
          </h1>
          <p className="mt-6 text-lg text-[#B8B8CC] leading-relaxed">
            Encuentra torneos de tu juego cerca, apúntate y paga sin líos.
            Bracket en vivo y ranking.
          </p>

          <ul className="mt-10 space-y-4">
            {[
              { icon: <MapPin size={18} />, t: 'Torneos de tu juego cerca de ti, en directo' },
              { icon: <Ticket size={18} />, t: 'Apúntate y paga desde la app; check-in con QR' },
              { icon: <Sparkles size={18} />, t: 'Compite, sube en el ranking y gana premios' },
            ].map((f, i) => (
              <li key={i} className="flex items-center gap-3.5 text-[#D4D4E4]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 text-[#B6FF3A] border border-white/10">
                  {f.icon}
                </span>
                <span className="text-[15px]">{f.t}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-[#6B6B85] tracking-wide">© Tourneum · Que gane el mejor</p>
      </aside>

      {/* ====== Formulario ====== */}
      <main className="relative flex min-h-screen flex-col items-center justify-center px-5 py-10 sm:px-8">
        {/* Marca compacta (solo móvil) */}
        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B6FF3A] shadow-[0_10px_30px_-8px_rgba(182,255,58,0.6)]">
            <span className="text-xl font-black text-[#0A0A0F] text-display">T</span>
          </div>
          <span className="text-xl font-black text-display uppercase tracking-[0.22em] text-white">Tourneum</span>
        </div>

        {/* Tarjeta de acceso */}
        <div className="card-premium w-full max-w-[26rem] rounded-3xl p-6 sm:p-8 animate-slide-up">
          <div className="mb-6">
            <p className="eyebrow mb-2">Acceder</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white text-display tracking-tight">
              Bienvenido de nuevo
            </h2>
            <p className="mt-1.5 text-[15px] text-[#A0A0B8]">Entra y sigue compitiendo</p>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={loginConGoogle}
            disabled={loadingGoogle}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white text-[15px] font-semibold text-[#1D222C] transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-60"
          >
            <GoogleIcon />
            {loadingGoogle ? 'Conectando…' : 'Continuar con Google'}
          </button>

          {/* Separador */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#6B6B85]">o con tu cuenta</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          {/* Selector de método */}
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
            {(['correo', 'telefono'] as Metodo[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => cambiarMetodo(m)}
                className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all ${
                  metodo === m ? 'bg-white/12 text-white shadow-sm' : 'text-[#8B8BA8] hover:text-white'
                }`}
              >
                {m === 'correo' ? <Mail size={15} /> : <Phone size={15} />}
                {m === 'correo' ? 'Correo' : 'Teléfono'}
              </button>
            ))}
          </div>

          {/* --- Correo --- */}
          {metodo === 'correo' && (
            <div className="space-y-3">
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                icon={<Mail size={16} />}
              />
              <Input
                type={verPass ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                error={error}
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
                onKeyDown={e => { if (e.key === 'Enter') loginConCorreo() }}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={recuperarPassword}
                  className="text-xs font-medium text-[#A0A0B8] transition-colors hover:text-white"
                >
                  ¿Has olvidado tu contraseña?
                </button>
              </div>
              <Button fullWidth size="lg" onClick={loginConCorreo} loading={loadingCorreo}>
                Entrar
              </Button>
            </div>
          )}

          {/* --- Teléfono --- */}
          {metodo === 'telefono' && faseTel === 'numero' && (
            <div className="space-y-3">
              <div className="flex gap-3">
                {selectPrefijo}
                <Input
                  className="flex-1"
                  type="tel"
                  inputMode="tel"
                  placeholder="600 000 000"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  error={error}
                  icon={<Phone size={16} />}
                />
              </div>
              <Button fullWidth size="lg" onClick={enviarSMS} loading={loadingTel}>
                Enviar código SMS
              </Button>
            </div>
          )}

          {metodo === 'telefono' && faseTel === 'codigo' && (
            <div className="space-y-3">
              <p className="text-sm text-[#A0A0B8]">
                Código enviado a <span className="text-white">{prefijo} {telefono}</span>
              </p>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                value={codigo}
                onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                error={error}
                className="text-center text-2xl tracking-[0.5em] font-bold"
                onKeyDown={e => { if (e.key === 'Enter') verificarSMS() }}
              />
              <Button fullWidth size="lg" onClick={verificarSMS} loading={loadingTel}>
                Entrar
              </Button>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setError(''); setFaseTel('numero') }}
                  className="flex items-center gap-1 text-sm text-[#A0A0B8] transition-colors hover:text-white"
                >
                  <ChevronLeft size={15} /> Cambiar número
                </button>
                <button
                  type="button"
                  onClick={enviarSMS}
                  disabled={loadingTel}
                  className="text-sm text-[#A0A0B8] transition-colors hover:text-white"
                >
                  Reenviar código
                </button>
              </div>
            </div>
          )}

          {/* Crear cuenta */}
          <p className="mt-6 text-center text-sm text-[#8B8BA8]">
            ¿No tienes una cuenta?{' '}
            <Link href="/registro" className="font-semibold text-[#B6FF3A] hover:text-[#A6EE2B]">
              Crea tu cuenta
            </Link>
          </p>
        </div>

        {/* ====== Accesos para profesionales ====== */}
        <div className="mt-6 w-full max-w-[26rem]">
          <div className="mb-3 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/8" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6B6B85]">
              ¿Organizas torneos o tienes local?
            </span>
            <span className="h-px flex-1 bg-white/8" />
          </div>

          <div className="space-y-2.5">
            <Link
              href="/local-panel/login"
              className="glass group flex items-center gap-3.5 rounded-2xl px-4 py-3.5 transition-all hover:bg-white/10"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C5CFF]/15 text-[#9B82FF] border border-white/10">
                <Store size={18} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-white">¿Tienes un local?</span>
                <span className="block text-xs text-[#8B8BA8]">Ofrece tu sala para torneos</span>
              </span>
              <ChevronRight size={18} className="text-[#6B6B85] transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
            </Link>

            <Link
              href="/rrpp/login"
              className="glass group flex items-center gap-3.5 rounded-2xl px-4 py-3.5 transition-all hover:bg-white/10"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B6FF3A]/15 text-[#A6EE2B] border border-white/10">
                <Megaphone size={18} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-white">¿Eres organizador (TO)?</span>
                <span className="block text-xs text-[#8B8BA8]">Accede a tu panel de torneos</span>
              </span>
              <ChevronRight size={18} className="text-[#6B6B85] transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
            </Link>
          </div>
        </div>

        {/* Pie */}
        <p className="mt-8 max-w-[26rem] text-center text-[10px] uppercase tracking-[0.2em] text-[#6B6B85]">
          Al continuar aceptas los{' '}
          <Link href="/terminos" className="text-[#A0A0B8] hover:text-white">Términos</Link> y la{' '}
          <Link href="/privacidad" className="text-[#A0A0B8] hover:text-white">Privacidad</Link>
        </p>
      </main>
    </div>
  )
}
