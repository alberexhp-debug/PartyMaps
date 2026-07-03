'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, MapPin } from 'lucide-react'

type Invitacion = {
  id: string; email: string; nombre: string | null; telefono: string | null;
  estado: string; expira_at: string;
  comision_pct_sugerida: number | null; tope_por_venta_sugerido: number | null;
  mensaje: string | null;
  locales: { id: string; nombre: string; foto_url: string | null } | null;
}

export default function PaginaInvitacion({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [invitacion, setInvitacion] = useState<Invitacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aceptando, setAceptando] = useState(false)

  useEffect(() => { void cargar() }, [token])

  async function cargar() {
    setLoading(true)
    const r = await fetch(`/api/rrpp/invitacion/${token}`)
    const j = await r.json()
    if (!r.ok) setError(j.error || 'Error')
    else setInvitacion(j.invitacion)
    setLoading(false)
  }

  async function aceptar() {
    setError(null); setAceptando(true)
    const r = await fetch(`/api/rrpp/invitacion/${token}`, { method: 'POST', credentials: 'include' })
    const j = await r.json()
    setAceptando(false)
    if (!r.ok) {
      if (j.code === 'NEED_LOGIN') {
        router.push(`/login?redirect=${encodeURIComponent(`/r/invitacion/${token}`)}`)
        return
      }
      setError(j.error || 'Error')
      return
    }
    router.push(j.redirect || '/rrpp')
  }

  if (loading) return <div className="p-6 text-center text-secondary">Cargando invitación…</div>
  if (error) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-display text-2xl mb-2">No podemos abrir la invitación</h1>
        <p className="text-secondary text-sm">{error}</p>
      </div>
    </div>
  )
  if (!invitacion) return null

  const local = invitacion.locales

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto p-4 sm:p-8 space-y-5">
        <Sparkles className="w-12 h-12 text-rose-400" />
        <div>
          <h1 className="text-display text-3xl">Te invitan a ser RRPP</h1>
          <p className="text-secondary text-sm mt-1">
            Una invitación para llevar gente y cobrar comisión por cada venta atribuida a ti.
          </p>
        </div>

        {local && (
          <div className="card-premium p-3 flex items-center gap-3">
            {local.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={local.foto_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-rose-300" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-tertiary text-xs">Te invita</p>
              <p className="text-display text-lg truncate">{local.nombre}</p>
            </div>
          </div>
        )}

        {invitacion.comision_pct_sugerida !== null && (
          <div className="card-premium p-3 grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-tertiary text-xs">Comisión propuesta</p>
              <p className="text-display text-xl">{invitacion.comision_pct_sugerida}%</p>
            </div>
            <div>
              <p className="text-tertiary text-xs">Tope por venta</p>
              <p className="text-display text-xl">
                {invitacion.tope_por_venta_sugerido ? `${invitacion.tope_por_venta_sugerido}€` : '—'}
              </p>
            </div>
          </div>
        )}

        {invitacion.mensaje && (
          <div className="card-premium p-3">
            <p className="text-tertiary text-xs mb-1">Mensaje del local</p>
            <p className="text-sm whitespace-pre-wrap">{invitacion.mensaje}</p>
          </div>
        )}

        <div className="space-y-2 text-sm text-secondary">
          <p>Para aceptar, inicia sesión con <strong>{invitacion.email}</strong>.</p>
          <p className="text-tertiary text-xs">
            Tourneum no procesa pagos entre tú y el local — solo refleja lo que te corresponde.
            La comisión final la pactáis vosotros desde tu panel.
          </p>
        </div>

        <button onClick={aceptar} disabled={aceptando} className="btn-primary w-full">
          {aceptando ? 'Aceptando…' : 'Aceptar invitación'}
        </button>
      </div>
    </div>
  )
}
