'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { Lock, Eye, EyeOff, ShieldCheck, Copy, Check } from 'lucide-react'
import type { UsuarioLocal, Local } from '@/types'

type TrabajadorConLocal = UsuarioLocal & { locales: Local }

export default function PrimerAccesoPage() {
  const router = useRouter()
  const toast = useToast()
  const { setTrabajador, setLocal } = useLocalPanelStore()
  const [cargando, setCargando] = useState(true)
  const [trab, setTrab] = useState<TrabajadorConLocal | null>(null)
  const [fase, setFase] = useState<'password' | 'totp'>('password')

  // Cambio de contraseña
  const [pass1, setPass1] = useState('')
  const [pass2, setPass2] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [guardandoPass, setGuardandoPass] = useState(false)

  // Authenticator
  const [qrSrc, setQrSrc] = useState('')
  const [secret, setSecret] = useState('')
  const [codigo, setCodigo] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  const entrar = useCallback(async (t: TrabajadorConLocal) => {
    // Recarga la ficha con los flags ya actualizados.
    const { data } = await supabase.from('usuario_local').select('*, locales!local_id!inner(*)')
      .ilike('email', t.email.trim()).eq('activo', true).maybeSingle()
    const fresco = (data as TrabajadorConLocal | null) ?? t
    setTrabajador(fresco)
    setLocal(fresco.locales)
    const { homeDeRol } = await import('@/lib/permisosLocal')
    toast.success('¡Listo! Bienvenido a TODH')
    router.push(`/local-panel/${homeDeRol(fresco.rol)}`)
  }, [router, setLocal, setTrabajador, toast])

  // Carga la sesión + ficha y decide qué falta.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { router.replace('/local-panel/login'); return }
      const { data } = await supabase.from('usuario_local').select('*, locales!local_id!inner(*)')
        .ilike('email', user.email.trim()).eq('activo', true).maybeSingle()
      if (!data) { await supabase.auth.signOut(); router.replace('/local-panel/login'); return }
      const t = data as TrabajadorConLocal
      setTrab(t)
      if (!t.debe_cambiar_password && t.totp_activado) { entrar(t); return } // nada pendiente
      setFase(t.debe_cambiar_password ? 'password' : 'totp')
      setCargando(false)
    })()
  }, [router, entrar])

  // Genera el QR del authenticator al entrar en esa fase (una sola vez:
  // el efecto puede re-dispararse por deps, pero el secreto se pide una vez).
  const iniciado = useRef(false)
  useEffect(() => {
    if (fase !== 'totp' || !trab || trab.totp_activado || iniciado.current) return
    iniciado.current = true
    ;(async () => {
      const res = await fetch('/api/local-panel/cuenta/totp/iniciar', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error || 'No se pudo iniciar el authenticator'); return }
      setSecret(data.secret)
      const QRCode = (await import('qrcode')).default
      setQrSrc(await QRCode.toDataURL(data.otpauth, { width: 460, margin: 1, color: { dark: '#0B0B16', light: '#FAFAFC' }, errorCorrectionLevel: 'M' }))
    })()
  }, [fase, trab, toast])

  const guardarPassword = async () => {
    if (pass1.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return }
    if (pass1 !== pass2) { toast.error('Las contraseñas no coinciden'); return }
    setGuardandoPass(true)
    const { error } = await supabase.auth.updateUser({ password: pass1 })
    if (error) { setGuardandoPass(false); toast.error('No se pudo cambiar la contraseña'); return }
    await fetch('/api/local-panel/cuenta/password-cambiada', { method: 'POST' })
    setGuardandoPass(false)
    const actualizado = trab ? { ...trab, debe_cambiar_password: false } : null
    setTrab(actualizado)
    if (actualizado && !actualizado.totp_activado) setFase('totp')
    else if (actualizado) entrar(actualizado)
  }

  const confirmarTotp = async () => {
    if (codigo.length !== 6) { toast.error('Introduce los 6 dígitos'); return }
    setConfirmando(true)
    const res = await fetch('/api/local-panel/cuenta/totp/confirmar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: codigo }),
    })
    const data = await res.json().catch(() => ({}))
    setConfirmando(false)
    if (!res.ok || !data.valid) { toast.error(data.error || 'Código incorrecto'); return }
    if (trab) entrar({ ...trab, totp_activado: true })
  }

  const copiarSecret = async () => {
    try { await navigator.clipboard.writeText(secret); toast.success('Clave copiada') } catch { toast.error('No se pudo copiar') }
  }

  if (cargando) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#B6FF3A]" /></div>
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute top-0 -left-32 h-96 w-96 rounded-full bg-[#7C5CFF]/30 opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -right-32 h-96 w-96 rounded-full bg-[#B6FF3A]/25 opacity-20 blur-3xl" />

      <div className="relative mb-6 text-center">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-[#9B82FF]">Primer acceso</p>
        <h1 className="text-display text-2xl font-bold tracking-tight text-white">
          {trab?.nombre ? `Hola, ${trab.nombre.split(' ')[0]}` : 'Configura tu acceso'}
        </h1>
        <p className="mt-2 text-sm text-[#A0A0B8]">
          {fase === 'password' ? 'Elige una contraseña nueva' : 'Protege tu cuenta con un authenticator'}
        </p>
      </div>

      {/* Indicador de pasos */}
      <div className="relative mb-6 flex items-center gap-2">
        <Paso n={1} label="Contraseña" activo={fase === 'password'} hecho={fase === 'totp'} />
        <div className="h-px w-8 bg-white/15" />
        <Paso n={2} label="Authenticator" activo={fase === 'totp'} hecho={false} />
      </div>

      {fase === 'password' ? (
        <div className="relative w-full max-w-sm space-y-4">
          <Input
            label="Nueva contraseña" type={showPass ? 'text' : 'password'} icon={<Lock size={16} />}
            value={pass1} onChange={e => setPass1(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password"
            iconRight={<button type="button" onClick={() => setShowPass(!showPass)}>{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
          />
          <Input
            label="Repite la contraseña" type={showPass ? 'text' : 'password'} icon={<Lock size={16} />}
            value={pass2} onChange={e => setPass2(e.target.value)} placeholder="••••••••" autoComplete="new-password"
            onKeyDown={e => { if (e.key === 'Enter') guardarPassword() }}
          />
          <Button fullWidth size="lg" loading={guardandoPass} onClick={guardarPassword}>Continuar</Button>
        </div>
      ) : (
        <div className="relative w-full max-w-sm space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="mb-3 text-sm text-[#B8B8CC]">Escanea este código con <span className="font-semibold text-white">Google Authenticator</span>, Authy o similar:</p>
            {qrSrc
              ? <img src={qrSrc} alt="Código QR del authenticator" className="mx-auto h-48 w-48 rounded-xl bg-white p-2" />
              : <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-xl bg-white/5"><div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-[#7C5CFF]" /></div>}
            {secret && (
              <div className="mt-3">
                <p className="mb-1 text-[10px] text-[#6B6B85]">¿No puedes escanear? Introduce esta clave a mano:</p>
                <button onClick={copiarSecret} className="mx-auto flex max-w-full items-center gap-1.5 break-all rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-white hover:bg-white/10">
                  <Copy size={12} className="shrink-0" /> {secret}
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#A0A0B8]">Código de 6 dígitos</label>
            <input
              value={codigo}
              onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => { if (e.key === 'Enter') confirmarTotp() }}
              inputMode="numeric" autoFocus placeholder="000000"
              className="h-14 w-full rounded-xl border border-white/10 bg-white/5 text-center text-2xl font-bold tracking-[0.5em] text-white outline-none focus:border-[#7C5CFF]/60"
            />
          </div>
          <Button fullWidth size="lg" loading={confirmando} onClick={confirmarTotp}>
            <ShieldCheck size={16} /> Activar y entrar
          </Button>
        </div>
      )}
    </div>
  )
}

function Paso({ n, label, activo, hecho }: { n: number; label: string; activo: boolean; hecho: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
        hecho ? 'bg-[#7C5CFF] text-white' : activo ? 'border border-[#7C5CFF] text-[#9B82FF]' : 'border border-white/15 text-[#6B6B85]'}`}>
        {hecho ? <Check size={14} /> : n}
      </span>
      <span className={`text-xs ${activo || hecho ? 'text-white' : 'text-[#6B6B85]'}`}>{label}</span>
    </div>
  )
}
