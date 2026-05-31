'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase/client'
import { useGestorStore } from '@/lib/stores/useGestorStore'
import { Mail, Lock, Briefcase } from 'lucide-react'

export default function GestorLoginPage() {
  const router = useRouter()
  const toast = useToast()
  const setGestor = useGestorStore(s => s.setGestor)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const entrar = async () => {
    if (!email || !password) { toast.error('Completa todos los campos'); return }
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (authError) { toast.error('Credenciales incorrectas'); setLoading(false); return }

    const { data: gestor } = await supabase
      .from('gestores')
      .select('*')
      .eq('email', email.trim())
      .eq('activo', true)
      .maybeSingle()

    if (!gestor) {
      await supabase.auth.signOut()
      toast.error('No tienes acceso de Gestor de Rumbo')
      setLoading(false)
      return
    }

    setGestor(gestor)
    router.push('/gestor/dashboard')
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden bg-[#07070D]">
      <div className="pointer-events-none absolute -top-40 -left-40 h-[30rem] w-[30rem] rounded-full bg-[#7C5CFF]/22 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[30rem] w-[30rem] rounded-full bg-[#E94560]/20 blur-[120px]" />

      <div className="relative mb-8 text-center">
        <div className="w-16 h-16 holo-bg rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-[0_12px_30px_-8px_rgba(124,92,255,0.6)]">
          <Briefcase size={28} className="text-white" />
        </div>
        <p className="eyebrow mb-2">Equipo Rumbo</p>
        <h1 className="text-3xl font-bold text-white text-display tracking-tight">Panel de Gestor</h1>
        <p className="text-[#A0A0B8] text-sm mt-2">Acceso para RumboGestor</p>
      </div>

      <div className="relative card-premium w-full max-w-sm rounded-3xl p-6 sm:p-8 space-y-4 animate-slide-up">
        <Input
          label="Email"
          type="email"
          icon={<Mail size={16} />}
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Input
          label="Contraseña"
          type="password"
          icon={<Lock size={16} />}
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') entrar() }}
        />
        <Button fullWidth size="lg" loading={loading} onClick={entrar}>
          Entrar
        </Button>
      </div>
    </div>
  )
}
