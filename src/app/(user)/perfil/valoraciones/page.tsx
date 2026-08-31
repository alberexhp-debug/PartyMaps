'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Star } from '@/components/todh/iconosTorneum'
import { ClipboardCheck } from 'lucide-react'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { useEsCuentaFresca } from '@/lib/stores/useSesionStore'
import { useToast } from '@/components/ui/Toast'
import { StarRating } from '@/components/ui/StarRating'
import { GameIcon } from '@/components/todh/GameIcon'
import { useT } from '@/lib/i18n'
import {
  HISTORIAL_USUARIO, VALORACIONES_RECIBIDAS, resumenValoraciones, etiquetaHace,
  getTorneo, getOrganizador,
} from '@/lib/torneos/sample'

// Valoraciones del jugador (sección 6.3): se llega desde las estrellas del
// perfil. Recibidas = tu reputación (todas las que te dejaron otros jugadores);
// Enviadas = tus estrellas a organizadores, con las PENDIENTES rellenables
// aquí mismo (persisten en el store con valorarOrganizador).
export default function ValoracionesPage() {
  const { t: tr, idioma } = useT()
  const router = useRouter()
  const toast = useToast()
  const [tab, setTab] = useState<'recibidas' | 'enviadas'>('recibidas')
  const valoracionesTO = useDemoStore(s => s.valoracionesTO)
  const valorarOrganizador = useDemoStore(s => s.valorarOrganizador)
  // Cuenta nueva (fresca): sin la reputación de muestra de Álex — todo vacío.
  const fresca = useEsCuentaFresca()
  const recibidas = fresca ? [] : VALORACIONES_RECIBIDAS
  const { media, total } = fresca ? { media: 0, total: 0 } : resumenValoraciones()

  // Torneos jugados (únicos, el más reciente primero) con su organizador.
  const base = fresca ? [] : HISTORIAL_USUARIO
  const jugados = base.filter((h, i) => base.findIndex(x => x.torneoId === h.torneoId) === i)
  const conOrg = jugados.map(h => {
    const org = getOrganizador(getTorneo(h.torneoId)?.organizadorId ?? '')
    return { ...h, orgNombre: org?.nombre ?? 'Organizador' }
  })
  const pendientes = conOrg.filter(h => !valoracionesTO[h.torneoId])
  const enviadas = conOrg.filter(h => valoracionesTO[h.torneoId])

  const valorar = (torneoId: string, orgNombre: string, estrellas: number) => {
    valorarOrganizador(torneoId, orgNombre, estrellas)
    toast.success(`${tr('val.enviada')} · ${estrellas}★`)
  }

  return (
    <div className="relative min-h-screen pb-10">
      <div className="px-4 pt-5 pb-3 safe-top sticky top-0 z-10 bg-[#0D0F15]/92 backdrop-blur-md border-b border-white/6">
        <div className="flex items-center gap-3 lg:max-w-5xl lg:mx-auto">
          <button onClick={() => router.push('/perfil')} aria-label={tr('comun.atras')} className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold">{tr('val.eyebrow')}</p>
            <p className="text-base font-bold text-white">{tr('val.titulo')}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 lg:max-w-5xl lg:mx-auto">
        {/* Resumen de reputación */}
        <div className="card-premium p-5 flex items-center gap-5">
          <p className="text-5xl font-bold text-display font-mono-num text-white leading-none">{fresca ? '—' : media.toFixed(1)}</p>
          <div>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={16} className={i <= Math.round(media) ? 'fill-[#F39C12] text-[#F39C12]' : 'text-[#3A3A4E]'} />
              ))}
            </div>
            <p className="text-xs text-[#A0A0B8] mt-1.5">{fresca ? tr('pfl.sinValoraciones') : `${total} ${tr('pf.valoraciones')} ${tr('val.deJugadores')}`}</p>
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex rounded-xl border border-white/10 bg-white/4 p-1">
          {(['recibidas', 'enviadas'] as const).map(k => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex-1 h-9 rounded-lg text-[13px] font-bold transition-colors ${tab === k ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'text-[#8B8BA8]'}`}>
              {tr(k === 'recibidas' ? 'val.recibidas' : 'val.enviadas')}
              {k === 'enviadas' && pendientes.length > 0 && tab !== 'enviadas' && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#FF3D71] text-white text-[10px] font-bold">{pendientes.length}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'recibidas' ? (
          recibidas.length === 0 ? (
            <div className="card-premium p-8 text-center">
              <Star size={26} className="mx-auto text-[#8B8BA8]" />
              <p className="mt-3 text-[13px] text-[#8B8BA8]">{tr('val.vaciasAun')}</p>
            </div>
          ) : (
          <div className="card-premium overflow-hidden divide-y divide-white/5">
            {recibidas.map((v, i) => (
              <div key={`${v.de}-${i}`} className="px-4 py-3.5 stagger-item" style={{ ['--delay' as string]: `${Math.min(i, 10) * 45}ms` }}>
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C5CFF]/40 to-[#B6FF3A]/30 border border-white/10 flex items-center justify-center text-sm font-black text-white shrink-0">
                    {v.de[0]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{v.de}</p>
                    <p className="text-[11px] text-[#8B8BA8] truncate">{v.torneo} · {etiquetaHace(v.diasHace, idioma)}</p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {[1, 2, 3, 4, 5].map(i2 => (
                      <Star key={i2} size={12} className={i2 <= v.estrellas ? 'fill-[#F39C12] text-[#F39C12]' : 'text-[#3A3A4E]'} />
                    ))}
                  </div>
                </div>
                {v.texto && <p className="mt-2 text-[13px] text-[#B8B8CC] leading-snug pl-12">«{v.texto}»</p>}
              </div>
            ))}
          </div>
          )
        ) : (
          <>
            {/* Pendientes de rellenar (sección 6.6): torneos jugados sin valorar */}
            <div>
              <div className="flex items-center gap-2 mb-2"><ClipboardCheck size={15} className="text-[#B6FF3A]" /><p className="eyebrow eyebrow-muted">{tr('val.pendientes')}</p></div>
              {pendientes.length === 0 ? (
                <p className="text-[13px] text-[#8B8BA8] px-1">{tr('val.alDia')}</p>
              ) : (
                <>
                  <p className="text-[12px] text-[#8B8BA8] mb-2 px-1">{tr('val.pendientesSub')}</p>
                  <div className="card-premium overflow-hidden divide-y divide-white/5">
                    {pendientes.map(h => (
                      <div key={h.torneoId} className="flex items-center gap-3 px-4 py-3">
                        <GameIcon juegoId={h.juego} size={34} variant="tile" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{h.nombre}</p>
                          <p className="text-[11px] text-[#8B8BA8] truncate">{h.orgNombre} · {etiquetaHace(h.diasHace, idioma)}</p>
                        </div>
                        <StarRating value={0} size={17} onChange={v => valorar(h.torneoId, h.orgNombre, v)} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Ya enviadas */}
            <div>
              <div className="flex items-center gap-2 mb-2"><Star size={14} className="text-[#F39C12]" /><p className="eyebrow eyebrow-muted">{tr('val.tusEnviadas')}</p></div>
              {enviadas.length === 0 ? (
                <p className="text-[13px] text-[#8B8BA8] px-1">{tr('val.sinEnviadas')}</p>
              ) : (
                <div className="card-premium overflow-hidden divide-y divide-white/5">
                  {enviadas.map(h => (
                    <div key={h.torneoId} className="flex items-center gap-3 px-4 py-3">
                      <GameIcon juegoId={h.juego} size={34} variant="tile" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{h.nombre}</p>
                        <p className="text-[11px] text-[#8B8BA8] truncate">{h.orgNombre}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} size={13} className={i <= (valoracionesTO[h.torneoId] ?? 0) ? 'fill-[#F39C12] text-[#F39C12]' : 'text-[#3A3A4E]'} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
