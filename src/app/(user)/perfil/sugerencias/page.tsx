'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { ChevronLeft, Lightbulb, MapPin } from 'lucide-react'
import { tiempoRelativo } from '@/lib/utils'

interface SugerenciaConLocal {
  id: string
  contenido: string
  estado: 'nueva' | 'leida' | 'respondida'
  created_at: string
  locales?: { nombre: string; ciudad: string; id: string } | null
}

const ESTADO_LABEL: Record<string, { label: string; color: string }> = {
  nueva:       { label: 'Enviada',      color: '#505065' },
  leida:       { label: 'Leída',        color: '#4F8EF7' },
  respondida:  { label: 'Respondida',   color: '#27AE60' },
}

export default function MisSugerenciasPage() {
  const router = useRouter()
  const { usuario } = useAuthStore()
  const [sugerencias, setSugerencias] = useState<SugerenciaConLocal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!usuario) { router.push('/login'); return }
    supabase
      .from('sugerencias')
      .select('id, contenido, estado, created_at, locales:local_id(id, nombre, ciudad)')
      .eq('usuario_id', usuario.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setSugerencias(data as unknown as SugerenciaConLocal[])
        setLoading(false)
      })
  }, [usuario, router])

  return (
    <div className="min-h-screen bg-[#0D0D1A] pb-24">
      <div className="px-4 py-3 flex items-center gap-3 safe-top">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-[#A0A0B8]">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-white">Mis sugerencias</h1>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-[#1A1A2E] rounded-2xl animate-pulse" />)
        ) : sugerencias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <Lightbulb size={36} className="text-[#505065]" />
            <p className="text-sm text-[#A0A0B8]">No has enviado sugerencias todavía.</p>
            <p className="text-xs text-[#505065]">
              Desde el perfil de cualquier local puedes proponer ideas al equipo.
            </p>
          </div>
        ) : sugerencias.map(s => {
          const estado = ESTADO_LABEL[s.estado] ?? ESTADO_LABEL.nueva
          return (
            <div key={s.id} className="bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                {s.locales ? (
                  <Link href={`/local/${s.locales.id}`}
                    className="flex items-center gap-1.5 text-sm font-semibold text-white hover:text-[#E94560]">
                    <MapPin size={12} className="text-[#505065]" />
                    {s.locales.nombre}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-white">Local</span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: `${estado.color}20`, color: estado.color }}>
                  {estado.label}
                </span>
              </div>
              <p className="text-sm text-[#A0A0B8] leading-relaxed">{s.contenido}</p>
              <p className="text-[10px] text-[#505065]">{tiempoRelativo(s.created_at)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
