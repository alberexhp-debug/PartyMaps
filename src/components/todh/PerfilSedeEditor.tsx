'use client'
import { useRef } from 'react'
import { useDemoStore, type PerfilSede } from '@/lib/stores/useDemoStore'
import { comprimirImagen } from '@/components/todh/EditarPerfilSheet'
import { BANNERS_PRESET, fondoBanner } from '@/components/todh/bannerPresets'
import { juegosJugables, juegosSugeridos, juegosJugablesEfectivos } from '@/components/todh/DispoSede'
import { GameIcon } from '@/components/todh/GameIcon'
import { useToast } from '@/components/ui/Toast'
import { useT, type ClaveI18n } from '@/lib/i18n'
import { JUEGOS_LIST, type Local } from '@/lib/torneos/sample'
import { Trash2 } from '@/components/todh/iconosTorneum'
import { ImagePlus } from 'lucide-react'

// «Tu página» del panel de sede (pedido Albert 31-08): el local personaliza su
// página pública — logo, banner, galería de fotos, consolas/equipo con
// CANTIDAD y ajuste fino de los juegos disponibles para torneos. Todo guarda
// al momento (perfilesSede, clave de MUNDO: lo ven jugadores y TOs al abrir
// /local/[id] o la mini-ficha).

// Catálogo fijo de consolas/equipo con cantidad (etiquetas cortas para chips).
export const EQUIPOS_SEDE: { id: string; clave: ClaveI18n; emoji: string }[] = [
  { id: 'ps5', clave: 'sp.eqPs5', emoji: '🎮' },
  { id: 'switch', clave: 'sp.eqSwitch', emoji: '🕹️' },
  { id: 'pc', clave: 'sp.eqPc', emoji: '🖥️' },
  { id: 'xbox', clave: 'sp.eqXbox', emoji: '🎮' },
  { id: 'monitor', clave: 'sp.eqMonitor', emoji: '🖵' },
  { id: 'streamkit', clave: 'sp.eqStream', emoji: '📹' },
]

const MAX_GALERIA = 6

export function PerfilSedeEditor({ local }: { local: Local }) {
  const { t: tr } = useT()
  const toast = useToast()
  const perfil = useDemoStore(s => s.perfilesSede[local.id])
  const editar = useDemoStore(s => s.editarPerfilSede)
  const dispo = useDemoStore(s => s.dispoSedes[local.id])
  const mesasStore = useDemoStore(s => s.mesasSede[local.id])
  const mesas = mesasStore ?? local.mesas
  const inputFoto = useRef<HTMLInputElement>(null)
  const inputBanner = useRef<HTMLInputElement>(null)
  const inputGaleria = useRef<HTMLInputElement>(null)

  const guardar = (patch: Partial<PerfilSede>) => editar(local.id, patch)

  const cargar = async (file: File | undefined, destino: 'foto' | 'banner' | 'galeria') => {
    if (!file) return
    try {
      const dataUrl = await comprimirImagen(file, 512, 200)
      if (destino === 'foto') guardar({ foto: dataUrl })
      else if (destino === 'banner') guardar({ banner: dataUrl })
      else {
        const galeria = perfil?.galeria ?? []
        if (galeria.length >= MAX_GALERIA) return
        guardar({ galeria: [...galeria, dataUrl] })
      }
    } catch {
      toast.error(tr('pfl.errorImagen'))
    }
  }

  // Equipos: stepper de cantidad por id del catálogo
  const equipos = perfil?.equipos ?? {}
  const cambiarEquipo = (id: string, delta: number) => {
    const v = Math.max(0, Math.min(99, (equipos[id] ?? 0) + delta))
    guardar({ equipos: { ...equipos, [id]: v } })
  }

  // Juegos: los del punto de partida (jugables) se QUITAN con juegosQuitados;
  // el resto del catálogo se AÑADE con juegosExtra. El chip enseña el efectivo.
  const base = juegosJugables(dispo, mesas)
  const efectivos = juegosJugablesEfectivos(dispo, mesas, perfil)
  const toggleJuego = (id: string) => {
    const esBase = base.some(j => j.id === id)
    const activo = efectivos.some(j => j.id === id)
    if (esBase) {
      const quitados = perfil?.juegosQuitados ?? []
      guardar({ juegosQuitados: activo ? [...quitados, id] : quitados.filter(x => x !== id) })
    } else {
      const extra = perfil?.juegosExtra ?? []
      guardar({ juegosExtra: activo ? extra.filter(x => x !== id) : [...extra, id] })
    }
  }

  const galeria = perfil?.galeria ?? []

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Vista previa: banner + logo, como los verá cualquiera en /local/[id] */}
      <div className="card-premium overflow-hidden">
        <div aria-hidden data-banner={perfil?.banner ? '1' : undefined} className="h-16"
          style={{ background: perfil?.banner ? fondoBanner(perfil.banner) : `radial-gradient(120% 140% at 0% 0%, ${local.color} 0%, ${local.color}44 40%, transparent 75%), #12161F` }} />
        <div className="p-4 -mt-9 flex items-center gap-3.5">
          {perfil?.foto
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={perfil.foto} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-[#12161F] shrink-0" />
            : <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-xl font-black text-[#0A0A0F] border-2 border-[#12161F] shrink-0" style={{ background: local.color }}>{local.nombre[0]}</span>}
          <div className="min-w-0">
            <p className="text-base font-bold text-white text-display leading-tight truncate">{local.nombre}</p>
            <p className="text-xs text-[#8B8BA8]">{tr('sp.previa')}</p>
          </div>
        </div>
      </div>

      <div className="card-premium p-4">
        {/* Logo + banner */}
        <label className="block text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">{tr('sp.foto')}</label>
        <div className="flex items-center gap-2">
          <input ref={inputFoto} type="file" accept="image/*" className="hidden" onChange={e => cargar(e.target.files?.[0], 'foto')} />
          <button onClick={() => inputFoto.current?.click()} className="h-10 px-3.5 rounded-xl bg-white/6 border border-white/12 text-[13px] font-bold text-white inline-flex items-center gap-2"><ImagePlus size={15} /> {tr('sp.subir')}</button>
          {perfil?.foto && <button onClick={() => guardar({ foto: null })} aria-label={tr('sp.quitar')} className="h-10 w-10 rounded-xl bg-white/6 border border-white/12 text-[#8B8BA8] hover:text-[#FF8A8A] inline-flex items-center justify-center"><Trash2 size={15} /></button>}
        </div>

        <label className="block mt-4 text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">{tr('sp.banner')}</label>
        <div className="flex flex-wrap items-center gap-2">
          {BANNERS_PRESET.map(b => (
            <button key={b.id} onClick={() => guardar({ banner: b.css })} aria-label={b.nombre} title={b.nombre}
              className={`h-9 w-14 rounded-lg transition-all ${perfil?.banner === b.css ? 'ring-2 ring-white ring-offset-2 ring-offset-[#12161F]' : 'opacity-80 hover:opacity-100'}`}
              style={{ background: b.css }} />
          ))}
          <input ref={inputBanner} type="file" accept="image/*" className="hidden" onChange={e => cargar(e.target.files?.[0], 'banner')} />
          <button onClick={() => inputBanner.current?.click()} className="h-9 px-3 rounded-lg bg-white/6 border border-white/12 text-[12px] font-bold text-white inline-flex items-center gap-1.5"><ImagePlus size={14} /> {tr('sp.subir')}</button>
          {perfil?.banner && <button onClick={() => guardar({ banner: null })} aria-label={tr('sp.quitarBanner')} className="h-9 w-9 rounded-lg bg-white/6 border border-white/12 text-[#8B8BA8] hover:text-[#FF8A8A] inline-flex items-center justify-center"><Trash2 size={14} /></button>}
        </div>

        {/* Galería del local */}
        <label className="block mt-5 text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">{tr('sp.galeria')} · {galeria.length}/{MAX_GALERIA}</label>
        <div className="flex flex-wrap gap-2">
          {galeria.map((img, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="w-20 h-14 rounded-lg object-cover border border-white/10" />
              <button onClick={() => guardar({ galeria: galeria.filter((_, j) => j !== i) })} aria-label={`${tr('sp.quitar')} ${i + 1}`}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#1D2230] border border-white/20 text-[#8B8BA8] hover:text-[#FF8A8A] flex items-center justify-center text-[10px]">✕</button>
            </div>
          ))}
          {galeria.length < MAX_GALERIA && (
            <>
              <input ref={inputGaleria} type="file" accept="image/*" className="hidden" onChange={e => cargar(e.target.files?.[0], 'galeria')} />
              <button onClick={() => inputGaleria.current?.click()} aria-label={tr('sp.anadirFoto')}
                className="w-20 h-14 rounded-lg border border-dashed border-white/20 text-[#8B8BA8] hover:text-white hover:border-white/40 flex items-center justify-center"><ImagePlus size={16} /></button>
            </>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-[#6B6B85]">{tr('sp.galeriaNota')}</p>
      </div>

      {/* Consolas y equipo con cantidad */}
      <div className="card-premium p-4">
        <p className="text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-2.5">{tr('sp.equipos')}</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {EQUIPOS_SEDE.map(eq => {
            const n = equipos[eq.id] ?? 0
            return (
              <div key={eq.id} className={`rounded-xl border px-3 py-2.5 flex items-center gap-2 ${n > 0 ? 'border-[#B6FF3A]/35 bg-[#B6FF3A]/[0.05]' : 'border-white/10 bg-white/[0.03]'}`}>
                <span className="text-base shrink-0">{eq.emoji}</span>
                <span className="flex-1 min-w-0 text-[12px] font-bold text-white truncate">{tr(eq.clave)}</span>
                <button onClick={() => cambiarEquipo(eq.id, -1)} aria-label={`${tr('sp.menos')} ${tr(eq.clave)}`} className="h-7 w-7 rounded-lg bg-white/6 text-[#B8B8CC] hover:text-white font-bold">−</button>
                <span className={`w-6 text-center text-sm font-bold font-mono-num ${n > 0 ? 'text-[#B6FF3A]' : 'text-[#5B5B70]'}`}>{n}</span>
                <button onClick={() => cambiarEquipo(eq.id, 1)} aria-label={`${tr('sp.mas')} ${tr(eq.clave)}`} className="h-7 w-7 rounded-lg bg-white/6 text-[#B8B8CC] hover:text-white font-bold">+</button>
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-[11px] text-[#6B6B85]">{tr('sp.equiposNota')}</p>
      </div>

      {/* Juegos disponibles para torneos */}
      <div className="card-premium p-4">
        <p className="text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-2.5">{tr('sp.juegos')}</p>
        <div className="flex flex-wrap gap-1.5">
          {JUEGOS_LIST.map(j => {
            const activo = efectivos.some(x => x.id === j.id)
            return (
              <button key={j.id} onClick={() => toggleJuego(j.id)} aria-pressed={activo} aria-label={`Juego ${j.corto}`}
                className="px-2.5 h-8 rounded-full text-[12px] font-bold border transition-all inline-flex items-center gap-1.5"
                style={activo ? { background: `${j.color}22`, color: j.color, borderColor: `${j.color}77` } : { background: 'rgba(255,255,255,.05)', color: '#9A9AAE', borderColor: 'transparent' }}>
                <GameIcon juegoId={j.id} size={13} /> {j.corto}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[11px] text-[#6B6B85]">{tr('sp.juegosNota')} {juegosSugeridos(dispo, mesas).map(j => j.corto).join(' · ')}</p>
      </div>
    </div>
  )
}
