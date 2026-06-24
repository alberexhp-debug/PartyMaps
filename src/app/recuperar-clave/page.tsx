'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase/client'
import { PageLoader } from '@/components/ui/Spinner'
import { Lock, Eye, EyeOff } from 'lucide-react'

/**
 * Página a la que llega el usuario tras pulsar el enlace de "recuperar contraseña".
 * El enlace pasa por /auth/callback (que crea una sesión de recuperación) y
 * aterriza aquí. Aquí fija su NUEVA contraseña de forma segura.
 */
export default function RecuperarClavePage() {
  const router = useRouter()
  const toast = useToast()
  const [cargando, setCargando] = useState(true)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [verPass, setVerPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Solo se puede estar aquí con una sesión activa (la de recuperación).
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      setCargando(false)
    })
  }, [router])

  const guardar = async () => {
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return }
    if (password !== password2) { setError('Las contraseñas no coinciden'); return }
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      toast.error('No se pudo cambiar la contraseña. Pide el enlace de nuevo.')
      setLoading(false)
      return
    }
    toast.success('Contraseña actualizada')
    router.push('/mapa')
  }

  if (cargando) return <PageLoader />

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#07070D] px-5 py-10">
      <div className="pointer-events-none absolute -top-40 -left-40 h-[30rem] w-[30rem] rounded-full bg-[#B6FF3A]/22 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[30rem] w-[30rem] rounded-full bg-[#7C5CFF]/20 blur-[120px]" />

      <div className="card-premium w-full max-w-[26rem] rounded-3xl p-6 sm:p-8 animate-slide-up">
        <div className="mb-6">
          <p className="eyebrow mb-2">Recuperar acceso</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white text-display tracking-tight">
            Nueva contraseña
          </h1>
          <p className="mt-1.5 text-[15px] text-[#A0A0B8]">Elige una contraseña nueva para tu cuenta</p>
        </div>

        <div className="space-y-3">
          <Input
            type={verPass ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Nueva contraseña (mín. 6)"
            value={password}
            onChange={e => setPassword(e.target.value)}
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
          />
          <Input
            type={verPass ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repite la contraseña"
            value={password2}
            onChange={e => setPassword2(e.target.value)}
            error={error}
            icon={<Lock size={16} />}
            onKeyDown={e => { if (e.key === 'Enter') guardar() }}
          />
          <Button fullWidth size="lg" onClick={guardar} loading={loading}>
            Guardar y entrar
          </Button>
        </div>
      </div>
    </div>
  )
}
