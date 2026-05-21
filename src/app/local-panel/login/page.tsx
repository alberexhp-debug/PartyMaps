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
    router.push('/local-panel/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0D0D1A] flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-[#E94560] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#E94560]/30">
          <span className="text-2xl font-black text-white">FV</span>
        </div>
        <h1 className="text-2xl font-black text-white">Panel del local</h1>
        <p className="text-[#505065] text-sm mt-1">Gestiona tu local desde aquí</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
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
        <Button fullWidth loading={loading} onClick={login}>
          Acceder al panel
        </Button>
      </div>

      <div className="mt-6 text-center space-y-2">
        <p className="text-sm text-[#505065]">
          ¿Tu local aún no está en PartyMaps?{' '}
          <Link href="/local-panel/registro" className="text-[#E94560] font-medium">Regístralo gratis</Link>
        </p>
        <p className="text-xs text-[#505065]">
          ¿Problemas para acceder?{' '}
          <span className="text-[#4F8EF7]">soporte@partymaps.com</span>
        </p>
      </div>
    </div>
  )
}
