'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAdminStore } from '@/lib/stores/useAdminStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { Mail, Lock, Shield } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const toast = useToast()
  const { setAdmin } = useAdminStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totp, setTotp] = useState('')
  const [paso, setPaso] = useState<'credentials' | 'totp'>('credentials')
  const [loading, setLoading] = useState(false)
  const [adminData, setAdminData] = useState<{ id: string; email: string; nombre: string; rol: 'super_admin' | 'admin' | 'soporte' } | null>(null)

  const verificarCredenciales = async () => {
    if (!email || !password) { toast.error('Completa todos los campos'); return }
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { toast.error('Credenciales incorrectas'); setLoading(false); return }

    const { data: admin } = await supabase.from('administradores')
      .select('*').eq('email', email).eq('activo', true).single()

    if (!admin) {
      await supabase.auth.signOut()
      toast.error('No tienes acceso de administrador')
      setLoading(false)
      return
    }

    setAdminData(admin)
    setPaso('totp')
    setLoading(false)
  }

  const verificarTOTP = async () => {
    if (!totp || totp.length !== 6) { toast.error('Código de 6 dígitos'); return }
    setLoading(true)

    const res = await fetch('/api/admin/verificar-totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totp, adminId: adminData?.id }),
    })
    const data = await res.json()

    if (!res.ok || !data.valid) {
      toast.error('Código incorrecto o expirado')
      setLoading(false)
      return
    }

    await supabase.from('administradores').update({ ultimo_acceso: new Date().toISOString() }).eq('id', adminData!.id)
    setAdmin(adminData as typeof adminData & { activo: boolean; created_at: string })
    router.push('/admin/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0D0D1A] flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-[#4F8EF7] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#4F8EF7]/30">
          <Shield size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-white">Panel de administración</h1>
        <p className="text-[#505065] text-sm mt-1">Acceso restringido al equipo de Fourvenues</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {paso === 'credentials' ? (
          <>
            <Input label="Email" type="email" icon={<Mail size={16} />}
              value={email} onChange={e => setEmail(e.target.value)} />
            <Input label="Contraseña" type="password" icon={<Lock size={16} />}
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') verificarCredenciales() }} />
            <Button fullWidth loading={loading} onClick={verificarCredenciales}>
              Continuar
            </Button>
          </>
        ) : (
          <>
            <div className="p-4 bg-[#1A1A2E] rounded-xl border border-[#4F8EF7]/30 text-center">
              <Shield size={24} className="text-[#4F8EF7] mx-auto mb-2" />
              <p className="text-white font-semibold text-sm">Verificación en dos pasos</p>
              <p className="text-[#505065] text-xs mt-1">Introduce el código de tu app de autenticación</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#A0A0B8]">Código TOTP (6 dígitos)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totp}
                onChange={e => setTotp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-4 py-4 bg-[#1A1A2E] border border-[#2A2A3E] rounded-xl text-white text-2xl font-mono tracking-[0.5em] text-center outline-none focus:border-[#4F8EF7]/50"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') verificarTOTP() }}
              />
            </div>
            <Button fullWidth loading={loading} onClick={verificarTOTP}>
              <Shield size={16} />
              Verificar y entrar
            </Button>
            <button onClick={() => setPaso('credentials')} className="w-full text-sm text-[#505065] hover:text-white">
              ← Volver
            </button>
          </>
        )}
      </div>
    </div>
  )
}
