'use client'
import { Play } from '@/components/todh/iconosTorneum'
import { Tv } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { urlConTiempo, formatoTiempo } from '@/lib/torneos/video'
import type { SetEnVOD } from '@/lib/torneos/sample'

// VODs N1 — los sets del usuario dentro de la emisión de un torneo. Diseño
// defensivo: la FILA (ronda · rival · marcador) es el producto y vive de datos
// propios; el vídeo es capa extra. «▶ Ver mi set» solo existe si el set tiene
// offset (`desdeSeg`); un set sin cámara se lista en gris con «sin emisión»
// (gestión de expectativa: en un torneo grande casi nada pasa por el stream).
// Con `onVer` el salto lo resuelve el padre (p.ej. re-montar VideoEmbed con
// tSeg); sin él, el botón es un enlace externo al VOD con t= en el minuto.
export function MisSetsVOD({ vodUrl, sets, onVer }: { vodUrl: string; sets: SetEnVOD[]; onVer?: (seg: number) => void }) {
  const { t: tr } = useT()
  if (sets.length === 0) return null

  return (
    <div className="rounded-xl bg-white/4 border border-white/8 overflow-hidden">
      <div className="divide-y divide-white/5">
        {sets.map(s => {
          const enVideo = s.desdeSeg != null
          const stream = /stream/i.test(s.mesa)
          return (
            <div key={`${s.ronda}-${s.rival}`} className={`flex items-center gap-2.5 px-3 py-2.5 ${enVideo ? '' : 'opacity-55'}`}>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">
                  {s.ronda} <span className="text-[#8B8BA8] font-normal">· vs</span> {s.rival}
                  <span className={`ml-2 font-bold font-mono-num ${s.gane ? 'text-[#B6FF3A]' : 'text-[#FF6076]'}`}>{s.marcador} {s.gane ? '✓' : '✗'}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-[#8B8BA8] flex items-center gap-1.5">
                  {stream ? (
                    <span className="inline-flex items-center gap-1 font-bold text-[#C9A6FF]"><Tv size={10} /> {s.mesa}</span>
                  ) : (
                    <span>{s.mesa}</span>
                  )}
                  {enVideo && <span className="font-mono-num text-[#B8B8CC]">· {formatoTiempo(s.desdeSeg!)}</span>}
                </p>
              </div>
              {enVideo ? (
                onVer ? (
                  <button onClick={() => onVer(s.desdeSeg!)}
                    className="shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-[#B6FF3A]/12 border border-[#B6FF3A]/35 text-[#B6FF3A] text-[11px] font-bold">
                    <Play size={11} className="fill-[#B6FF3A]" /> {tr('vod.verMiSet')}
                  </button>
                ) : (
                  <a href={urlConTiempo(vodUrl, s.desdeSeg)} target="_blank" rel="noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-[#B6FF3A]/12 border border-[#B6FF3A]/35 text-[#B6FF3A] text-[11px] font-bold">
                    <Play size={11} className="fill-[#B6FF3A]" /> {tr('vod.verMiSet')}
                  </a>
                )
              ) : (
                <span className="shrink-0 text-[11px] text-[#6B6B85] font-semibold">{tr('vod.sinEmision')}</span>
              )}
            </div>
          )
        })}
      </div>
      {/* Copy honesto: el offset viene del stream, no del reloj del set */}
      <p className="px-3 py-1.5 text-[10px] text-[#6B6B85] border-t border-white/5">{tr('vod.aprox')}</p>
    </div>
  )
}
