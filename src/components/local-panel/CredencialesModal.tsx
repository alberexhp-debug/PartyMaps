'use client'
import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { X, Copy, KeyRound, ShieldCheck } from 'lucide-react'

/**
 * Muestra las credenciales (usuario + contraseña por defecto) para entregarlas
 * al trabajador. Se usa tras el alta y tras resetear la contraseña.
 */
export function CredencialesModal({ titulo, username, password, onClose }: {
  titulo?: string
  username: string
  password: string
  onClose: () => void
}) {
  const toast = useToast()
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])
  const copiar = async (txt: string, que: string) => {
    try { await navigator.clipboard.writeText(txt); toast.success(`${que} copiado`) }
    catch { toast.error('No se pudo copiar') }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl glass-strong p-6 sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-[#E94560]" />
            <h2 className="text-lg font-bold text-white">{titulo || 'Acceso del trabajador'}</h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>
        <p className="mb-4 text-sm text-[#A0A0B8]">Entrégale estos datos. Son de un solo uso: cambiará la contraseña y configurará su authenticator en el primer acceso.</p>

        <Campo label="Nombre de usuario" valor={username} onCopy={() => copiar(username, 'Usuario')} />
        <Campo label="Contraseña por defecto" valor={password} onCopy={() => copiar(password, 'Contraseña')} />

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#7C5CFF]/20 bg-[#7C5CFF]/8 p-3">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#9B82FF]" />
          <p className="text-xs text-[#B8B8CC]">En el primer acceso se le pedirá escanear un QR con Google Authenticator (o similar) y elegir una contraseña nueva.</p>
        </div>

        <div className="mt-5 flex gap-2">
          <Button fullWidth onClick={() => copiar(`Usuario: ${username}\nContraseña: ${password}`, 'Acceso')}>
            <Copy size={15} /> Copiar todo
          </Button>
          <Button variant="ghost" onClick={onClose}>Hecho</Button>
        </div>
      </div>
    </div>
  )
}

function Campo({ label, valor, onCopy }: { label: string; valor: string; onCopy: () => void }) {
  return (
    <div className="mb-2">
      <label className="text-xs text-[#8B8BA8]">{label}</label>
      <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        <code className="flex-1 break-all font-mono text-sm text-white">{valor}</code>
        <button onClick={onCopy} className="shrink-0 text-[#8B8BA8] hover:text-white" aria-label={`Copiar ${label}`}><Copy size={15} /></button>
      </div>
    </div>
  )
}
