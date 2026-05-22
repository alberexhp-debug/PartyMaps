'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase/client'
import { normalizarTelefono, validarTelefono } from '@/lib/utils'
import { Phone, ChevronLeft, Lock } from 'lucide-react'
import Link from 'next/link'

type Step = 'telefono' | 'sms' | 'password'

export default function LoginPage() {
  const router = useRouter()
  const toast = useToast()
  const [step, setStep] = useState<Step>('telefono')
  const [loading, setLoading] = useState(false)
  const [prefijo, setPrefijo] = useState('+34')
  const [telefono, setTelefono] = useState('')
  const [codigo, setCodigo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const telCompleto = normalizarTelefono(telefono, prefijo)

  const enviarSMS = async () => {
    if (!validarTelefono(telefono)) { setError('Introduce un número válido'); return }
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithOtp({ phone: telCompleto })
    if (err) {
      console.error('[signInWithOtp]', err)
      toast.error(err.message || 'Error al enviar el SMS')
    } else { toast.success('Código enviado'); setStep('sms') }
    setLoading(false)
  }

  const verificarSMS = async () => {
    if (codigo.length !== 6) { setError('El código tiene 6 dígitos'); return }
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.verifyOtp({
      phone: telCompleto,
      token: codigo,
      type: 'sms',
    })
    if (err) {
      toast.error('Código incorrecto o expirado')
    } else {
      router.push('/explorar')
    }
    setLoading(false)
  }

  const loginConPassword = async () => {
    if (!validarTelefono(telefono)) { setError('Introduce un número válido'); return }
    if (!password) { setError('Introduce la contraseña'); return }
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({
      phone: telCompleto,
      password,
    })
    if (err) {
      toast.error('Teléfono o contraseña incorrectos')
    } else {
      router.push('/explorar')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0D0D1A] flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-12 pb-6">
        {step !== 'telefono' ? (
          <button onClick={() => setStep('telefono')} className="p-2 rounded-xl text-[#A0A0B8] hover:text-white hover:bg-[#1A1A2E]">
            <ChevronLeft size={22} />
          </button>
        ) : (
          <Link href="/bienvenida" className="p-2 rounded-xl text-[#A0A0B8] hover:text-white hover:bg-[#1A1A2E]">
            <ChevronLeft size={22} />
          </Link>
        )}
        <div className="w-10 h-10 rounded-xl bg-[#E94560] flex items-center justify-center">
          <span className="text-base font-bold text-white">PM</span>
        </div>
      </div>

      <div className="flex-1 px-6 pt-4 space-y-6">
        {step === 'telefono' && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Bienvenido/a de vuelta</h1>
              <p className="text-[#A0A0B8]">Introduce tu número para continuar</p>
            </div>
            <div className="flex gap-3">
              <select
                value={prefijo}
                onChange={e => setPrefijo(e.target.value)}
                className="h-12 bg-[#1A1A2E] border border-[#2A2A3E] rounded-xl text-white px-3 text-sm"
              >
                <option value="+34">🇪🇸 +34</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+33">🇫🇷 +33</option>
              </select>
              <Input
                className="flex-1"
                type="tel"
                placeholder="600 000 000"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                error={error}
                icon={<Phone size={16} />}
              />
            </div>
            <Button fullWidth onClick={enviarSMS} loading={loading}>
              Enviar código SMS
            </Button>
            <button
              type="button"
              onClick={() => { setError(''); setStep('password') }}
              className="w-full flex items-center justify-center gap-2 text-sm text-[#A0A0B8] hover:text-white transition-colors"
            >
              <Lock size={14} />
              Acceder con contraseña
            </button>
            <p className="text-center text-sm text-[#505065]">
              ¿No tienes cuenta?{' '}
              <Link href="/registro" className="text-[#E94560]">Regístrate gratis</Link>
            </p>
            <div className="pt-4 border-t border-[#2A2A3E]">
              <p className="text-xs text-center text-[#505065]">
                ¿No tienes acceso a tu número?{' '}
                <Link href="/soporte" className="text-[#4F8EF7]">Contacta con soporte</Link>
              </p>
            </div>
          </>
        )}

        {step === 'sms' && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Introduce el código</h1>
              <p className="text-[#A0A0B8]">
                Enviado a {prefijo} {telefono}
              </p>
            </div>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              value={codigo}
              onChange={e => setCodigo(e.target.value.slice(0, 6))}
              error={error}
              className="text-center text-2xl tracking-widest"
            />
            <Button fullWidth onClick={verificarSMS} loading={loading}>
              Entrar
            </Button>
            <button
              className="w-full text-sm text-[#A0A0B8] hover:text-white transition-colors"
              onClick={enviarSMS}
              disabled={loading}
            >
              Reenviar código
            </button>
          </>
        )}

        {step === 'password' && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Acceder con contraseña</h1>
              <p className="text-[#A0A0B8]">Introduce tu número y contraseña</p>
            </div>
            <div className="flex gap-3">
              <select
                value={prefijo}
                onChange={e => setPrefijo(e.target.value)}
                className="h-12 bg-[#1A1A2E] border border-[#2A2A3E] rounded-xl text-white px-3 text-sm"
              >
                <option value="+34">🇪🇸 +34</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+33">🇫🇷 +33</option>
              </select>
              <Input
                className="flex-1"
                type="tel"
                placeholder="600 000 000"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                icon={<Phone size={16} />}
              />
            </div>
            <Input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              error={error}
              icon={<Lock size={16} />}
              onKeyDown={e => { if (e.key === 'Enter') loginConPassword() }}
            />
            <Button fullWidth onClick={loginConPassword} loading={loading}>
              Entrar
            </Button>
            <button
              type="button"
              onClick={() => { setError(''); setStep('telefono') }}
              className="w-full text-sm text-[#A0A0B8] hover:text-white transition-colors"
            >
              ← Usar código SMS
            </button>
          </>
        )}
      </div>
    </div>
  )
}
