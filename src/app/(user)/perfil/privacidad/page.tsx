'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { ArrowLeft, Download, Trash2, Shield, AlertTriangle } from '@/components/todh/iconosTorneum'
import { useT } from '@/lib/i18n'

export default function PrivacidadPage() {
  const { t: tr } = useT()
  const router = useRouter()
  const toast = useToast()
  const { usuario, setUsuario, isLoading } = useAuthStore()
  const [descargando, setDescargando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    if (isLoading) return            // esperar a que AuthProvider resuelva la sesión
    if (!usuario) router.push('/login')
  }, [usuario, isLoading, router])

  if (!usuario) return null

  const descargar = async () => {
    setDescargando(true)
    try {
      const res = await fetch('/api/perfil/exportar')
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mis-datos-todh-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
      toast.success(tr('priv.descargaIniciada'))
    } catch {
      toast.error(tr('priv.errorDescarga'))
    }
    setDescargando(false)
  }

  const eliminar = async () => {
    setEliminando(true)
    const res = await fetch('/api/perfil/eliminar', { method: 'POST' })
    if (!res.ok) { toast.error(tr('priv.errorEliminar')); setEliminando(false); return }
    await supabase.auth.signOut().catch(() => {})
    setUsuario(null)
    toast.success(tr('priv.cuentaEliminada'))
    router.push('/login')
  }

  return (
    <div className="min-h-screen p-5 pb-24 max-w-lg mx-auto lg:max-w-none lg:mx-0 space-y-5">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-[#8B8BA8] hover:text-white transition-colors">
        <ArrowLeft size={15} /> {tr('priv.volver')}
      </button>

      <div className="flex items-center gap-2.5">
        <Shield size={22} className="text-[#4F8EF7]" />
        <h1 className="text-2xl font-bold text-white text-display tracking-tight">{tr('perfil.privacidad')}</h1>
      </div>

      {/* Descargar mis datos */}
      <div className="card-premium p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Download size={18} className="text-[#4F8EF7]" />
          <h2 className="font-semibold text-white">{tr('priv.descargarTitulo')}</h2>
        </div>
        <p className="text-sm text-[#A0A0B8]">
          {tr('priv.descargarTexto')}
        </p>
        <Button variant="outline" loading={descargando} onClick={descargar}>
          <Download size={16} /> {tr('priv.descargarBtn')}
        </Button>
      </div>

      {/* El consentimiento de «marketing por local» era del paradigma nocturno
          (promos de discotecas): eliminado en Torneum — limpieza 31-08. */}

      {/* Eliminar cuenta */}
      <div className="rounded-2xl border border-[#B6FF3A]/25 bg-[#B6FF3A]/[0.05] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Trash2 size={18} className="text-[#B6FF3A]" />
          <h2 className="font-semibold text-white">{tr('priv.eliminarTitulo')}</h2>
        </div>
        <p className="text-sm text-[#A0A0B8]">
          {tr('priv.eliminarTexto')} <span className="text-white font-medium">{tr('priv.irreversible')}</span>{tr('priv.eliminarTexto2')}
        </p>

        {!confirmar ? (
          <Button variant="danger" onClick={() => setConfirmar(true)}>
            <Trash2 size={16} /> {tr('priv.eliminarTitulo')}
          </Button>
        ) : (
          <div className="rounded-xl border border-[#B6FF3A]/40 bg-[#B6FF3A]/10 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-[#B6FF3A] mt-0.5 shrink-0" />
              <p className="text-sm text-white">{tr('priv.seguro')}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="danger" fullWidth loading={eliminando} onClick={eliminar}>{tr('priv.siEliminar')}</Button>
              <Button variant="ghost" onClick={() => setConfirmar(false)}>{tr('adm.cancelar')}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
