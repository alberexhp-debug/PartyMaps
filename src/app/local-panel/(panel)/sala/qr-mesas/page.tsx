'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from '@/components/todh/iconosTorneum'
import { Printer } from 'lucide-react'

type MesaQR = { id: string; codigo: string; tipo: string; zona: string | null; qr_token: string }

function urlMesa(localId: string, m: MesaQR) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '')
  return `${base}/local/${localId}/bar?mesa=${m.qr_token}&mc=${encodeURIComponent(m.codigo)}`
}

function QrCard({ localId, nombre, mesa }: { localId: string; nombre: string; mesa: MesaQR }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let vivo = true
    import('qrcode').then(async ({ default: QRCode }) => {
      const u = await QRCode.toDataURL(urlMesa(localId, mesa), { width: 360, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } })
      if (vivo) setUrl(u)
    }).catch(() => {})
    return () => { vivo = false }
  }, [localId, mesa])
  return (
    <div className="qr-card bg-white border border-black/15 rounded-2xl p-4 flex flex-col items-center text-center break-inside-avoid">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50 truncate max-w-full">{nombre}</p>
      <p className="text-2xl font-black text-black mt-0.5">{mesa.codigo}</p>
      {mesa.zona && <p className="text-[11px] text-black/50 capitalize">{mesa.zona}</p>}
      <div className="my-2">
        {url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={url} alt={`QR setup ${mesa.codigo}`} width={150} height={150} />
          : <div className="w-[150px] h-[150px] bg-black/5 rounded" />}
      </div>
      <p className="text-sm font-semibold text-black">Escanea para el check-in de tu setup</p>
    </div>
  )
}

export default function QrMesasPage() {
  const router = useRouter()
  const [data, setData] = useState<{ local_id: string; local_nombre: string; mesas: MesaQR[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/local-panel/mesas/qr')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="p-4 md:p-8">
      <div className="no-print flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} aria-label="Volver" className="w-9 h-9 rounded-xl glass-strong flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
        <h1 className="text-2xl font-bold text-display text-white flex-1">QR de los setups</h1>
        <button onClick={() => window.print()} className="btn-primary text-sm"><Printer size={16} /> Imprimir</button>
      </div>
      <p className="no-print text-sm text-[#B8B8CC] mb-5 max-w-lg">
        Imprime esta hoja, recorta y plastifica una tarjeta por setup. Cada setup tiene su QR para el check-in
        desde el móvil; el check-in te llega a «Pedidos → Setups».
      </p>

      {loading ? (
        <p className="text-[#B8B8CC]">Cargando…</p>
      ) : !data?.mesas.length ? (
        <p className="text-[#B8B8CC]">No hay setups. Créalos en el Plano de «Setups».</p>
      ) : (
        <div className="qr-grid grid grid-cols-2 sm:grid-cols-3 gap-3">
          {data.mesas.map(m => <QrCard key={m.id} localId={data.local_id} nombre={data.local_nombre} mesa={m} />)}
        </div>
      )}
    </div>
  )
}
