'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, Play, TrendingDown, Trophy } from 'lucide-react'
import { GameIcon } from '@/components/todh/GameIcon'
import { MisSetsVOD } from '@/components/todh/MisSetsVOD'
import { useT, conParams } from '@/lib/i18n'
import { JUEGOS, HISTORIAL_USUARIO, etiquetaHace, diasSinJugar, DIAS_INACTIVIDAD } from '@/lib/torneos/sample'
import { useEsCuentaFresca } from '@/lib/stores/useSesionStore'

// Historial COMPLETO del jugador, agrupado por juego (sección 6.2): cada juego
// con su icono, sus torneos y cuándo se jugaron; si un juego supera los 45 días
// sin jugarse, el grupo lo avisa en ámbar (misma lógica que la Identidad).
// VODs N1: una entrada con emisión enseña el chip «▶ n sets en vídeo», que
// despliega los sets del usuario con salto al minuto dentro del VOD.
export default function HistorialPage() {
  const { t: tr, idioma } = useT()
  const router = useRouter()
  // Acordeón de sets en vídeo (clave = nombre de la ENTRADA, único en el historial)
  const [vodAbierto, setVodAbierto] = useState<string | null>(null)

  // Cuenta nueva (fresca): sin el historial de muestra de Álex — estado vacío.
  const fresca = useEsCuentaFresca()
  const historial = fresca ? [] : HISTORIAL_USUARIO

  // Juegos ordenados por partida más reciente; entradas ya vienen ordenadas.
  const juegos = Array.from(new Set(historial.map(h => h.juego)))

  return (
    <div className="relative min-h-screen pb-10">
      <div className="px-4 pt-5 pb-3 safe-top sticky top-0 z-10 bg-[#0D0F15]/92 backdrop-blur-md border-b border-white/6">
        <div className="flex items-center gap-3 lg:max-w-6xl lg:mx-auto">
          <button onClick={() => router.push('/perfil')} aria-label={tr('comun.atras')} className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold">{tr('hist.eyebrow')}</p>
            <p className="text-base font-bold text-white">{tr('hist.titulo')} <span className="text-[#B6FF3A]">· {historial.length}</span></p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0 lg:items-start lg:max-w-6xl lg:mx-auto">
        {juegos.length === 0 && (
          <div className="card-premium p-8 text-center lg:col-span-2">
            <Trophy size={28} className="mx-auto text-[#8B8BA8]" />
            <p className="mt-3 text-sm font-bold text-white">{tr('pfl.historialVacio')}</p>
            <p className="mt-1 text-[12px] text-[#8B8BA8]">{tr('pfl.historialVacioSub')}</p>
            <Link href="/explorar" className="mt-4 inline-flex h-10 px-4 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold items-center">{tr('inicio.explorar')}</Link>
          </div>
        )}
        {juegos.map(juegoId => {
          const entradas = historial.filter(h => h.juego === juegoId)
          const j = JUEGOS[juegoId]
          const dias = diasSinJugar(juegoId)
          const inactivo = dias != null && dias > DIAS_INACTIVIDAD
          return (
            <section key={juegoId} className="card-premium overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/6">
                <GameIcon juegoId={juegoId} size={38} variant="tile" />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-white truncate">{j?.nombre ?? juegoId}</p>
                  <p className="text-[11px] text-[#8B8BA8]">
                    {entradas.length} {tr('hist.torneos')} · {tr('hist.ultimoHace')} {etiquetaHace(entradas[0].diasHace, idioma)}
                  </p>
                </div>
                {inactivo && (
                  <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10px] font-bold bg-[#FFB03A]/12 text-[#FFB03A] border border-[#FFB03A]/35 shrink-0" title={tr('inact.decae')}>
                    <TrendingDown size={11} /> {dias} {tr('hist.dias')}
                  </span>
                )}
              </div>
              <div className="divide-y divide-white/5">
                {entradas.map(h => {
                  // Sets con cámara de ESTA entrada (no por torneoId: el Weekly
                  // #40 comparte t1 con el #41 y no lleva VOD).
                  const nEnVideo = h.vodUrl ? (h.misSets ?? []).filter(s => s.desdeSeg != null).length : 0
                  return (
                    <div key={h.nombre}>
                      <Link href={`/torneo/${h.torneoId}/resultados`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{h.nombre}</p>
                          <p className="text-[11px] text-[#8B8BA8]">{etiquetaHace(h.diasHace, idioma)}</p>
                        </div>
                        <span className="text-sm font-bold text-[#E0BE63] shrink-0">{h.puesto}</span>
                        <ChevronRight size={14} className="text-[#6B6B85] shrink-0" />
                      </Link>
                      {nEnVideo > 0 && (
                        <div className="px-4 pb-3 -mt-1">
                          <button onClick={() => setVodAbierto(vodAbierto === h.nombre ? null : h.nombre)}
                            className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-bold border transition-colors ${vodAbierto === h.nombre ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border-[#B6FF3A]/50' : 'bg-white/5 text-[#B8B8CC] border-white/10'}`}>
                            <Play size={10} className={vodAbierto === h.nombre ? 'fill-[#B6FF3A]' : 'fill-[#B8B8CC]'} /> {conParams(tr('vod.setsEnVideo'), { n: nEnVideo })}
                          </button>
                          {vodAbierto === h.nombre && (
                            <div className="mt-2 animate-slide-up-sm">
                              <MisSetsVOD vodUrl={h.vodUrl!} sets={h.misSets!} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
