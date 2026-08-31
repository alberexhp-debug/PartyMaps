'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Review } from '@/types'
import { tiempoRelativo } from '@/lib/utils'
import { Shield, Check, X, Star, AlertCircle } from '@/components/todh/iconosTorneum'
import { Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { registrarAuditoria } from '@/lib/auditoria'

type ReviewConExtra = Review & {
  usuarios?: { nombre: string }
  locales?: { nombre: string }
}

interface Reporte {
  id: string
  reportado_por: string
  tipo_contenido: string
  contenido_id: string
  motivo: string
  descripcion: string | null
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  created_at: string
  reportador?: { nombre: string }
}

type Tab = 'reviews' | 'reportes'

export default function ModeracionPage() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('reviews')
  const [reviews, setReviews] = useState<ReviewConExtra[]>([])
  const [reportes, setReportes] = useState<Reporte[]>([])
  const [loading, setLoading] = useState(true)

  async function cargar() {
    setLoading(true)
    const [revRes, repRes] = await Promise.all([
      supabase.from('reviews')
        .select('*, usuarios!usuario_id(nombre), locales!local_id(nombre)')
        .eq('censurada', true).order('created_at', { ascending: false }).limit(50),
      supabase.from('reportes_contenido')
        .select('id, reportado_por, tipo_contenido, contenido_id, motivo, descripcion, estado, created_at, reportador:usuarios!reportado_por(nombre)')
        .eq('estado', 'pendiente').order('created_at', { ascending: false }).limit(50),
    ])
    if (revRes.data) setReviews(revRes.data as ReviewConExtra[])
    if (repRes.data) setReportes(repRes.data as unknown as Reporte[])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  // ── Reviews ───────────────────────────────────────────────
  const aprobarReview = async (id: string) => {
    await supabase.from('reviews').update({ censurada: false, motivo_censura: null }).eq('id', id)
    await registrarAuditoria({ tipo_accion: 'review_restaurada', entidad_tipo: 'review', entidad_id: id })
    toast.success('Reseña restaurada')
    cargar()
  }
  const eliminarReview = async (id: string) => {
    await supabase.from('reviews').update({ censurada: true, motivo_censura: 'Censurada por moderación' }).eq('id', id)
    await registrarAuditoria({ tipo_accion: 'review_censurada', entidad_tipo: 'review', entidad_id: id })
    setReviews(prev => prev.filter(r => r.id !== id))
  }

  // ── Reportes ─────────────────────────────────────────────
  async function gestionarReporte(id: string, estado: 'aprobado' | 'rechazado') {
    const r = reportes.find(x => x.id === id)
    await supabase.from('reportes_contenido').update({
      estado,
      gestionado_at: new Date().toISOString(),
    }).eq('id', id)

    // Si aprobamos el reporte, censuramos el contenido reportado.
    if (estado === 'aprobado' && r && r.tipo_contenido === 'review') {
      await supabase.from('reviews').update({ censurada: true, motivo_censura: 'Reportada por usuarios' }).eq('id', r.contenido_id)
    }

    await registrarAuditoria({
      tipo_accion: `reporte_${estado}`,
      entidad_tipo: 'reporte',
      entidad_id: id,
      datos_nuevos: r ? { tipo_contenido: r.tipo_contenido, contenido_id: r.contenido_id, motivo: r.motivo } : null,
    })
    toast.success(estado === 'aprobado' ? 'Reporte aprobado y contenido censurado' : 'Reporte descartado')
    cargar()
  }

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 space-y-4">
      <div>
        <p className="text-[10px] font-bold text-[#4F8EF7] uppercase tracking-[0.25em] mb-1">Cola de revisión</p>
        <h1 className="text-3xl font-bold text-white text-display tracking-tight flex items-center gap-2">
          <Shield size={22} className="text-[#4F8EF7]" /> Moderación
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
        {[
          { id: 'reviews' as Tab,  label: 'Reseñas',  count: reviews.length },
          { id: 'reportes' as Tab, label: 'Reportes', count: reportes.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
              tab === t.id ? 'border-[#4F8EF7] text-white' : 'border-transparent text-[#6B6B85] hover:text-[#A0A0B8]')}>
            {t.label}
            {t.count > 0 && <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-[#F39C12]/20 text-[#F39C12]">{t.count}</span>}
          </button>
        ))}
      </div>

      {loading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 bg-white/6 rounded-2xl animate-pulse" />)}

      {!loading && tab === 'reviews' && (reviews.length === 0
        ? <Vacio mensaje="Sin reseñas en cola" />
        : reviews.map(r => (
          <div key={r.id} className="bg-white/6 rounded-2xl border border-[#F39C12]/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-[#6B6B85]">
                  <span className="text-white font-medium">{r.usuarios?.nombre || 'Usuario'}</span>
                  {' → '}
                  <span className="text-white font-medium">{r.locales?.nombre || 'Local'}</span>
                </p>
                <div className="flex gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} size={12} className={cn(n <= r.puntuacion ? 'text-[#F39C12] fill-current' : 'text-[#2A2A3E]')} />
                  ))}
                </div>
              </div>
              <span className="text-xs text-[#6B6B85]">{tiempoRelativo(r.created_at)}</span>
            </div>
            {r.comentario && <p className="text-sm text-[#A0A0B8] bg-white/5 rounded-xl p-3">{r.comentario}</p>}
            {r.motivo_censura && (
              <div className="flex items-center gap-2 text-xs text-[#F39C12]">
                <Flag size={12} /> {r.motivo_censura}
              </div>
            )}
            <BotonesAprobarRechazar onAprobar={() => aprobarReview(r.id)} onRechazar={() => eliminarReview(r.id)} />
          </div>
        )))}

      {!loading && tab === 'reportes' && (reportes.length === 0
        ? <Vacio mensaje="Sin reportes pendientes" />
        : reportes.map(r => (
          <div key={r.id} className="bg-white/6 rounded-2xl border border-[#B6FF3A]/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-[#6B6B85]">
                  Reportó <span className="text-white">{r.reportador?.nombre || 'Anónimo'}</span>
                </p>
                <p className="text-sm text-white mt-1">
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-white/5 text-[#B6FF3A]">{r.tipo_contenido}</span>
                  <span className="ml-2 text-xs text-[#6B6B85]">motivo: {r.motivo}</span>
                </p>
                {r.descripcion && <p className="text-xs text-[#A0A0B8] mt-2 bg-white/5 rounded p-2">{r.descripcion}</p>}
              </div>
              <span className="text-xs text-[#6B6B85]">{tiempoRelativo(r.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#F39C12]">
              <AlertCircle size={12} /> Aprobar oculta el contenido. Rechazar lo deja visible.
            </div>
            <BotonesAprobarRechazar
              onAprobar={() => gestionarReporte(r.id, 'aprobado')}
              onRechazar={() => gestionarReporte(r.id, 'rechazado')}
              labelOk="Aprobar reporte"
              labelKo="Descartar"
            />
          </div>
        )))}
    </div>
  )
}

function Vacio({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Shield size={36} className="text-green-400/60" />
      <p className="text-sm text-[#A0A0B8]">{mensaje}</p>
    </div>
  )
}

function BotonesAprobarRechazar({ onAprobar, onRechazar, labelOk = 'Aprobar', labelKo = 'Rechazar' }: {
  onAprobar: () => void; onRechazar: () => void; labelOk?: string; labelKo?: string
}) {
  return (
    <div className="flex gap-2">
      <button onClick={onAprobar}
        className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-xl text-xs text-green-400 hover:bg-green-500/20">
        <Check size={12} /> {labelOk}
      </button>
      <button onClick={onRechazar}
        className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 hover:bg-red-500/20">
        <X size={12} /> {labelKo}
      </button>
    </div>
  )
}
