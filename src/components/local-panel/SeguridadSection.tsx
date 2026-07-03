'use client'
import { useState } from 'react'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { ShieldCheck, ShieldAlert, Copy } from 'lucide-react'

/**
 * Verificación en dos pasos (2FA) OPCIONAL para la cuenta del local (§2.4).
 * Reusa el flujo TOTP de empleados/RRPP: /cuenta/totp/iniciar + /confirmar, y un
 * /desactivar propio. Si se pierde el móvil, el admin puede reiniciarlo (§5.2).
 */
export function SeguridadSection() {
  const { trabajador, setTrabajador } = useLocalPanelStore()
  const toast = useToast()
  const [activado, setActivado] = useState(!!trabajador?.totp_activado)
  const [fase, setFase] = useState<'idle' | 'setup'>('idle')
  const [secret, setSecret] = useState('')
  const [qrSrc, setQrSrc] = useState('')
  const [code, setCode] = useState('')
  const [cargando, setCargando] = useState(false)

  const iniciar = async () => {
    setCargando(true)
    const r = await fetch('/api/local-panel/cuenta/totp/iniciar', { method: 'POST' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { setCargando(false); toast.error(j.error || 'No se pudo iniciar'); return }
    setSecret(j.secret)
    try {
      const QRCode = (await import('qrcode')).default
      setQrSrc(await QRCode.toDataURL(j.otpauth, { width: 320, margin: 1, color: { dark: '#0F1219', light: '#FAFAFC' } }))
    } catch { /* el secreto manual sigue valiendo */ }
    setCargando(false)
    setFase('setup')
  }

  const confirmar = async () => {
    setCargando(true)
    const r = await fetch('/api/local-panel/cuenta/totp/confirmar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code.trim() }),
    })
    const j = await r.json().catch(() => ({}))
    setCargando(false)
    if (!r.ok || !j.valid) { toast.error(j.error || 'Código incorrecto o caducado'); return }
    setActivado(true); setFase('idle'); setCode(''); setSecret(''); setQrSrc('')
    if (trabajador) setTrabajador({ ...trabajador, totp_activado: true })
    toast.success('Verificación en dos pasos activada')
  }

  const desactivar = async () => {
    if (!confirm('¿Desactivar la verificación en dos pasos? Tu cuenta quedará solo con contraseña.')) return
    setCargando(true)
    const r = await fetch('/api/local-panel/cuenta/totp/desactivar', { method: 'POST' })
    setCargando(false)
    if (!r.ok) { toast.error('No se pudo desactivar'); return }
    setActivado(false)
    if (trabajador) setTrabajador({ ...trabajador, totp_activado: false })
    toast.success('Verificación en dos pasos desactivada')
  }

  const copiar = async () => { try { await navigator.clipboard.writeText(secret); toast.success('Clave copiada') } catch { /* sin portapapeles */ } }

  return (
    <div className="space-y-4 max-w-md">
      <div className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${activado ? 'bg-[#27AE60]/15' : 'bg-[#F39C12]/15'}`}>
          {activado ? <ShieldCheck size={20} className="text-[#27AE60]" /> : <ShieldAlert size={20} className="text-[#F39C12]" />}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-white">
            Verificación en dos pasos{activado && <span className="text-[#27AE60] text-sm font-normal"> · Activa</span>}
          </p>
          <p className="text-sm text-[#8B8BA8] mt-0.5">Un código de tu app de authenticator además de la contraseña. Muy recomendable para la cuenta del local.</p>
        </div>
      </div>

      {fase === 'idle' && !activado && (
        <Button loading={cargando} onClick={iniciar}><ShieldCheck size={16} /> Activar verificación en dos pasos</Button>
      )}
      {fase === 'idle' && activado && (
        <button onClick={desactivar} disabled={cargando} className="text-sm text-[#B6FF3A] hover:underline">Desactivar</button>
      )}

      {fase === 'setup' && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3">
          <p className="text-sm text-white font-semibold">1. Escanéalo con tu app (Google Authenticator, Authy…)</p>
          {qrSrc && <div className="bg-white rounded-xl p-2 w-fit mx-auto">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={qrSrc} alt="QR del authenticator" width={180} height={180} /></div>}
          {secret && (
            <button onClick={copiar} className="mx-auto flex items-center gap-1.5 text-xs text-[#B8B8CC] hover:text-white">
              <Copy size={12} /> <span className="font-mono tracking-wider">{secret}</span>
            </button>
          )}
          <p className="text-sm text-white font-semibold pt-1">2. Escribe el código de 6 dígitos</p>
          <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" inputMode="numeric"
            className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white text-center text-xl tracking-[0.4em] outline-none focus:border-[#B6FF3A]/60" />
          <div className="flex gap-2">
            <button onClick={() => { setFase('idle'); setCode('') }} className="flex-1 h-11 rounded-xl border border-white/10 text-sm text-[#B8B8CC] hover:text-white">Cancelar</button>
            <Button className="flex-1" loading={cargando} disabled={code.length !== 6} onClick={confirmar}>Confirmar y activar</Button>
          </div>
        </div>
      )}
    </div>
  )
}
