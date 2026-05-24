'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export default function LocalPanelLoginPage() {
  const router = useRouter()
  const toast = useToast()
  const { setTrabajador, setLocal } = useLocalPanelStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const login = async () => {
    if (!email || !password) { toast.error('Completa todos los campos'); return }
    setLoading(true)

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      toast.error('Credenciales incorrectas')
      setLoading(false)
      return
    }

    // Look up usuario_local
    const { data: trabajador, error: trabajadorError } = await supabase
      .from('usuario_local')
      .select('*, locales!inner(*)')
      .eq('email', email)
      .eq('activo', true)
      .single()

    if (trabajadorError || !trabajador) {
      await supabase.auth.signOut()
      toast.error('No tienes acceso a ningún local')
      setLoading(false)
      return
    }

    setTrabajador(trabajador)
    setLocal(trabajador.locales)
    const { homeDeRol } = await import('@/lib/permisosLocal')
    router.push(`/local-panel/${homeDeRol(trabajador.rol)}`)
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="absolute top-0 -left-32 w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none bg-[#E94560]/30" />
      <div className="absolute bottom-0 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none bg-[#D4A84B]/25" />

      <div className="relative mb-8 text-center">
        <div className="w-16 h-16 holo-bg rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-[0_12px_30px_-8px_rgba(124,92,255,0.6)]">
          <span className="text-xl font-black text-white">PM</span>
        </div>
        <p className="text-[10px] font-bold text-[#E94560] uppercase tracking-[0.25em] mb-2">Negocio</p>
        <h1 className="text-3xl font-bold text-white text-display tracking-tight">Panel del local</h1>
        <p className="text-[#A0A0B8] text-sm mt-2">Gestiona tu local desde aquí</p>
      </div>

      <div className="relative w-full max-w-sm space-y-4">
        <Input
          label="Email"
          type="email"
          icon={<Mail size={16} />}
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tu@email.com"
          autoComplete="email"
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

      <div className="relative mt-8 text-center space-y-2">
        <p className="text-sm text-[#A0A0B8]">
          ¿Tu local aún no está en PartyMaps?{' '}
          <Link href="/local-panel/registro" className="text-[#E94560] font-semibold">Regístralo gratis</Link>
        </p>
        <p className="text-xs text-[#6B6B85]">
          ¿Problemas para acceder?{' '}
          <span className="text-[#4F8EF7]">soporte@partymaps.com</span>
        </p>
      </div>
    </div>
  )
}
