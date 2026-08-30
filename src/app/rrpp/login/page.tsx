'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase/client'
import { User, Lock, Megaphone, ArrowLeft, ShieldCheck } from 'lucide-react'
import { pareceEmail, emailSinteticoRrpp } from '@/lib/equipo'

export default function RRPPLoginPage() {
  const router = useRouter()
  const toast = useToast()
  const [paso, setPaso] = useState<'cred' | 'totp'>('cred')
  const [identificador, setIdentificador] = useState('')
  const [password, setPassword] = useState('')
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)

  const entrar = async () => {
    if (!identificador || !password) { toast.error('Completa todos los campos'); return }
    setLoading(true)
    // Usuario (sin @) → email sintético interno. Email (con @) → tal cual (RRPP antiguos).
    const email = pareceEmail(identificador) ? identificador.trim() : emailSinteticoRrpp(identificador)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const rate = /rate limit|too many|429/i.test(error.message)
      toast.error(rate ? 'Demasiados intentos. Espera un minuto.' : 'Usuario o contraseña incorrectos')
      setLoading(false); return
    }
    const res = await fetch('/api/rrpp/perfil')
    if (!res.ok) { await supabase.auth.signOut(); toast.error('Esta cuenta no es de RRPP'); setLoading(false); return }
    const { rrpp } = await res.json().catch(() => ({}))
    if (!rrpp) { await supabase.auth.signOut(); toast.error('Esta cuenta no es de RRPP'); setLoading(false); return }

    const esUsuarioRrpp = !!rrpp.username
    if (esUsuarioRrpp && (rrpp.debe_cambiar_password || !rrpp.totp_activado)) {
      setLoading(false); router.push('/rrpp/primer-acceso'); return
    }
    if (esUsuarioRrpp && rrpp.totp_activado) { setPaso('totp'); setCodigo(''); setLoading(false); return }
    setLoading(false); router.push('/rrpp')
  }

  const verificarCodigo = async () => {
    if (codigo.length !== 6) { toast.error('Introduce los 6 dígitos'); return }
    setLoading(true)
    const res = await fetch('/api/rrpp/verificar-totp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: codigo }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok || !data.valid) { toast.error('Código incorrecto o caducado'); return }
    router.push('/rrpp')
  }

  const volver = async () => { await supabase.auth.signOut(); setPaso('cred'); setCodigo('') }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0D0F15] p-6">
      <div className="pointer-events-none absolute -top-40 -left-40 h-[30rem] w-[30rem] rounded-full bg-[#B6FF3A]/22 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[30rem] w-[30rem] rounded-full bg-[#7C5CFF]/20 blur-[120px]" />

      <div className="relative mb-8 text-center">
        <div className="holo-bg mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl shadow-[0_12px_30px_-8px_rgba(182, 255, 58,0.6)]">
          <Megaphone size={28} className="text-white" />
        </div>
        <p className="eyebrow eyebrow-rose mb-2">Organizador</p>
        <h1 className="text-display text-3xl font-bold tracking-tight text-white">Consola del TO</h1>
        <p className="mt-2 text-sm text-[#A0A0B8]">
          {paso === 'cred' ? 'Accede con tu usuario o email' : 'Introduce el código de tu authenticator'}
        </p>
      </div>

      {paso === 'cred' ? (
        <div className="card-premium animate-slide-up relative w-full max-w-sm space-y-4 rounded-3xl p-6 sm:p-8">
          <Input label="Usuario o email" type="text" icon={<User size={16} />} value={identificador}
            onChange={e => setIdentificador(e.target.value)} placeholder="tu_usuario" autoComplete="username" />
          <Input label="Contraseña" type="password" icon={<Lock size={16} />} value={password}
            onChange={e => setPassword(e.target.value)} autoComplete="current-password"
            onKeyDown={e => { if (e.key === 'Enter') entrar() }} />
          <Button fullWidth size="lg" loading={loading} onClick={entrar}>Entrar</Button>
        </div>
      ) : (
        <div className="card-premium animate-slide-up relative w-full max-w-sm space-y-4 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-center gap-2 rounded-xl border border-[#7C5CFF]/20 bg-[#7C5CFF]/8 px-3 py-2.5">
            <ShieldCheck size={16} className="text-[#9B82FF]" />
            <span className="text-sm text-[#B8B8CC]">Verificación en dos pasos</span>
          </div>
          <input value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={e => { if (e.key === 'Enter') verificarCodigo() }} inputMode="numeric" autoFocus placeholder="000000"
            className="h-14 w-full rounded-xl border border-white/10 bg-white/5 text-center text-2xl font-bold tracking-[0.5em] text-white outline-none focus:border-[#7C5CFF]/60" />
          <Button fullWidth size="lg" loading={loading} onClick={verificarCodigo}>Verificar y entrar</Button>
          <button onClick={volver} className="flex w-full items-center justify-center gap-1.5 text-sm text-[#8B8BA8] hover:text-white">
            <ArrowLeft size={14} /> Volver
          </button>
        </div>
      )}

      {paso === 'cred' && (
        <div className="relative mt-8 text-center">
          <p className="text-sm text-[#A0A0B8]">
            ¿Aún no eres RRPP en Torneum?{' '}
            <Link href="/login" className="font-semibold text-[#B6FF3A]">Entra como usuario</Link>
          </p>
        </div>
      )}
    </div>
  )
}
