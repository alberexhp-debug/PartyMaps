'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { User, Lock, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { pareceEmail, emailSinteticoDeUsuario } from '@/lib/equipo'
import type { UsuarioLocal, Local } from '@/types'

type TrabajadorConLocal = UsuarioLocal & { locales: Local }

export default function LocalPanelLoginPage() {
  const router = useRouter()
  const toast = useToast()
  const { setTrabajador, setLocal } = useLocalPanelStore()
  const [paso, setPaso] = useState<'cred' | 'totp'>('cred')
  const [identificador, setIdentificador] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  // Trabajador resuelto entre el paso de credenciales y el de código.
  const [pendiente, setPendiente] = useState<TrabajadorConLocal | null>(null)

  const finalizar = (trab: TrabajadorConLocal) => {
    setTrabajador(trab)
    setLocal(trab.locales)
    import('@/lib/permisosLocal').then(({ homeDeRol }) => {
      router.push(`/local-panel/${homeDeRol(trab.rol)}`)
    })
  }

  const login = async () => {
    if (!identificador || !password) { toast.error('Completa todos los campos'); return }
    setLoading(true)

    // Usuario (sin @) → email sintético interno. Email (con @) → tal cual (dueños).
    const email = pareceEmail(identificador) ? identificador.trim() : emailSinteticoDeUsuario(identificador)

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      const rate = /rate limit|too many|429/i.test(authError.message)
      toast.error(rate ? 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.' : 'Usuario o contraseña incorrectos')
      setLoading(false)
      return
    }

    const emailLookup = (authData.user?.email ?? email).trim()
    const { data: trabajador, error: trabajadorError } = await supabase
      .from('usuario_local')
      .select('*, locales!local_id!inner(*)')
      .ilike('email', emailLookup)
      .eq('activo', true)
      .maybeSingle()

    if (trabajadorError || !trabajador) {
      await supabase.auth.signOut()
      toast.error('No tienes acceso a ningún local')
      setLoading(false)
      return
    }

    const t = trabajador as TrabajadorConLocal
    const esTrabajadorUsuario = !!t.username

    // Primer acceso: cambiar contraseña por defecto y/o configurar authenticator.
    if (esTrabajadorUsuario && (t.debe_cambiar_password || !t.totp_activado)) {
      setLoading(false)
      router.push('/local-panel/primer-acceso')
      return
    }

    // 2FA activo: pedir el código del authenticator.
    if (esTrabajadorUsuario && t.totp_activado) {
      setPendiente(t)
      setPaso('totp')
      setCodigo('')
      setLoading(false)
      return
    }

    // Dueños / cuentas por email sin 2FA: acceso directo.
    finalizar(t)
  }

  const verificarCodigo = async () => {
    if (codigo.length !== 6) { toast.error('Introduce los 6 dígitos'); return }
    setLoading(true)
    const res = await fetch('/api/local-panel/verificar-totp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: codigo }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok || !data.valid) { toast.error('Código incorrecto o caducado'); return }
    if (pendiente) finalizar(pendiente)
  }

  const volver = async () => {
    await supabase.auth.signOut()
    setPaso('cred'); setPendiente(null); setCodigo('')
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute top-0 -left-32 h-96 w-96 rounded-full bg-[#E94560]/30 opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -right-32 h-96 w-96 rounded-full bg-[#D4A84B]/25 opacity-20 blur-3xl" />

      <div className="relative mb-8 text-center">
        <div className="holo-bg mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl shadow-[0_12px_30px_-8px_rgba(124,92,255,0.6)]">
          <span className="text-xl font-black text-white">R</span>
        </div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-[#E94560]">Negocio</p>
        <h1 className="text-display text-3xl font-bold tracking-tight text-white">Panel del local</h1>
        <p className="mt-2 text-sm text-[#A0A0B8]">
          {paso === 'cred' ? 'Accede con tu usuario o email' : 'Introduce el código de tu authenticator'}
        </p>
      </div>

      {paso === 'cred' ? (
        <div className="relative w-full max-w-sm space-y-4">
          <Input
            label="Usuario o email"
            type="text"
            icon={<User size={16} />}
            value={identificador}
            onChange={e => setIdentificador(e.target.value)}
            placeholder="tu_usuario"
            autoComplete="username"
          />
          <Input
            label="Contraseña"
            type={showPass ? 'text' : 'password'}
            icon={<Lock size={16} />}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            iconRight={
              <button type="button" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            onKeyDown={e => { if (e.key === 'Enter') login() }}
          />
          <Button fullWidth size="lg" loading={loading} onClick={login}>
            Acceder al panel
          </Button>
        </div>
      ) : (
        <div className="relative w-full max-w-sm space-y-4">
          <div className="flex items-center justify-center gap-2 rounded-xl border border-[#7C5CFF]/20 bg-[#7C5CFF]/8 px-3 py-2.5">
            <ShieldCheck size={16} className="text-[#9B82FF]" />
            <span className="text-sm text-[#B8B8CC]">Verificación en dos pasos</span>
          </div>
          <input
            value={codigo}
            onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={e => { if (e.key === 'Enter') verificarCodigo() }}
            inputMode="numeric"
            autoFocus
            placeholder="000000"
            className="h-14 w-full rounded-xl border border-white/10 bg-white/5 text-center text-2xl font-bold tracking-[0.5em] text-white outline-none focus:border-[#7C5CFF]/60"
          />
          <Button fullWidth size="lg" loading={loading} onClick={verificarCodigo}>
            Verificar y entrar
          </Button>
          <button onClick={volver} className="flex w-full items-center justify-center gap-1.5 text-sm text-[#8B8BA8] hover:text-white">
            <ArrowLeft size={14} /> Volver
          </button>
        </div>
      )}

      {paso === 'cred' && (
        <div className="relative mt-8 space-y-2 text-center">
          <p className="text-sm text-[#A0A0B8]">
            ¿Tu local aún no está en Rumbo?{' '}
            <Link href="/local-panel/registro" className="font-semibold text-[#E94560]">Regístralo gratis</Link>
            {' '}·{' '}
            <Link href="/para-locales" className="font-semibold text-[#A0A0B8] hover:text-white">Más información</Link>
          </p>
          <p className="text-xs text-[#6B6B85]">
            ¿Problemas para acceder?{' '}
            <span className="text-[#4F8EF7]">soporte@partymaps.com</span>
          </p>
        </div>
      )}
    </div>
  )
}
