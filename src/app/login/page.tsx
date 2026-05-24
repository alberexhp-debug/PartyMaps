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

  const selectPrefijo = (
    <select
      value={prefijo}
      onChange={e => setPrefijo(e.target.value)}
      className="h-12 bg-white/5 border border-white/10 rounded-xl text-white px-3 text-sm focus:border-[#E94560]/60 outline-none transition-colors"
    >
      <option value="+34">🇪🇸 +34</option>
      <option value="+1">🇺🇸 +1</option>
      <option value="+44">🇬🇧 +44</option>
      <option value="+33">🇫🇷 +33</option>
    </select>
  )

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <div className="absolute top-0 -left-32 w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none bg-[#E94560]/30" />
      <div className="absolute top-32 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none bg-[#7C5CFF]/30" />

      <div className="relative flex items-center gap-3 px-4 pt-10 pb-6 safe-top">
        {step !== 'telefono' ? (
          <button onClick={() => setStep('telefono')} className="p-2 rounded-xl text-[#A0A0B8] hover:text-white hover:bg-white/8 transition-colors">
            <ChevronLeft size={22} />
          </button>
        ) : (
          <Link href="/bienvenida" className="p-2 rounded-xl text-[#A0A0B8] hover:text-white hover:bg-white/8 transition-colors">
            <ChevronLeft size={22} />
          </Link>
        )}
        <div className="w-10 h-10 rounded-xl holo-bg flex items-center justify-center shadow-[0_4px_14px_-4px_rgba(124,92,255,0.6)]">
          <span className="text-sm font-black text-white">PM</span>
        </div>
      </div>

      <div className="relative flex-1 px-6 pt-6 space-y-6">
        {step === 'telefono' && (
          <>
            <div>
              <p className="text-[10px] font-bold text-[#E94560] uppercase tracking-[0.25em] mb-3">Acceder</p>
              <h1 className="text-3xl font-bold text-white text-display tracking-tight leading-tight">Bienvenido<br />de vuelta</h1>
              <p className="text-[#A0A0B8] mt-2">Introduce tu número para continuar</p>
            </div>
            <div className="flex gap-3">
              {selectPrefijo}
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
            <Button fullWidth size="lg" onClick={enviarSMS} loading={loading}>
              Enviar código SMS
            </Button>
            <button
              type="button"
              onClick={() => { setError(''); setStep('password') }}
              className="w-full flex items-center justify-center gap-2 text-sm text-[#A0A0B8] hover:text-white transition-colors py-2"
            >
              <Lock size={14} />
              Acceder con contraseña
            </button>
            <p className="text-center text-sm text-[#6B6B85]">
              ¿No tienes cuenta?{' '}
              <Link href="/registro" className="text-[#E94560] font-semibold">Regístrate gratis</Link>
            </p>
          </>
        )}

        {step === 'sms' && (
          <>
            <div>
              <p className="text-[10px] font-bold text-[#E94560] uppercase tracking-[0.25em] mb-3">Verificación</p>
              <h1 className="text-3xl font-bold text-white text-display tracking-tight">Introduce el código</h1>
              <p className="text-[#A0A0B8] mt-2">Enviado a {prefijo} {telefono}</p>
            </div>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              value={codigo}
              onChange={e => setCodigo(e.target.value.slice(0, 6))}
              error={error}
              className="text-center text-2xl tracking-[0.5em] font-bold"
            />
            <Button fullWidth size="lg" onClick={verificarSMS} loading={loading}>
              Entrar
            </Button>
            <button
              className="w-full text-sm text-[#A0A0B8] hover:text-white transition-colors py-2"
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
              <p className="text-[10px] font-bold text-[#E94560] uppercase tracking-[0.25em] mb-3">Acceso rápido</p>
              <h1 className="text-3xl font-bold text-white text-display tracking-tight">Con contraseña</h1>
              <p className="text-[#A0A0B8] mt-2">Introduce tu número y contraseña</p>
            </div>
            <div className="flex gap-3">
              {selectPrefijo}
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
            <Button fullWidth size="lg" onClick={loginConPassword} loading={loading}>
              Entrar
            </Button>
            <button
              type="button"
              onClick={() => { setError(''); setStep('telefono') }}
              className="w-full text-sm text-[#A0A0B8] hover:text-white transition-colors py-2"
            >
              ← Usar código SMS
            </button>
          </>
        )}
      </div>

      <div className="relative pb-8 pt-6 px-6 safe-bottom">
        <p className="text-center text-[10px] text-[#6B6B85] uppercase tracking-[0.2em]">
          Al continuar aceptas los <Link href="/terminos" className="text-[#A0A0B8] hover:text-white">Términos</Link> y <Link href="/privacidad" className="text-[#A0A0B8] hover:text-white">Privacidad</Link>
        </p>
      </div>
    </div>
  )
}
