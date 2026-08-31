'use client'
import { useRef, useState } from 'react'
import { X, RefreshCw, Trash2 } from '@/components/todh/iconosTorneum'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { claveDemoActual } from '@/lib/stores/useSesionStore'
import { useToast } from '@/components/ui/Toast'
import { BANNERS_PRESET, fondoBanner } from '@/components/todh/bannerPresets'
import { useT } from '@/lib/i18n'

// ─────────────────────────────────────────────────────────────────────────────
// Hoja «Editar perfil» (paquete Chat): foto propia (comprimida EN CLIENTE con
// canvas a ≤512px y ~≤200KB antes de guardarla como dataURL en el store),
// banner (subida igual o presets de gradiente con la estética de la app), bio
// de hasta 160 caracteres y regeneración del tag #XABCD (una sola vez).
// Todo persiste en useDemoStore (localStorage); si el dataURL no cabe en el
// almacenamiento, se avisa con toast en vez de fallar en silencio.
// ─────────────────────────────────────────────────────────────────────────────

// Reduce la imagen a maxPx de lado mayor y baja calidad JPEG hasta ~maxKB.
// (longitud de dataURL ≈ bytes × 4/3, de ahí el factor 1.37 del corte)
// Exportada: la reutilizan el editor de perfil de organizador y el panel de sede.
export async function comprimirImagen(file: File, maxPx: number, maxKB: number): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error('imagen ilegible'))
      i.src = url
    })
    const escala = Math.min(1, maxPx / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.width * escala))
    canvas.height = Math.max(1, Math.round(img.height * escala))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('sin canvas')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    let calidad = 0.85
    let out = canvas.toDataURL('image/jpeg', calidad)
    while (out.length > maxKB * 1024 * 1.37 && calidad > 0.3) {
      calidad -= 0.15
      out = canvas.toDataURL('image/jpeg', calidad)
    }
    return out
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function EditarPerfilSheet({ nombre, onClose }: { nombre: string; onClose: () => void }) {
  const { t: tr } = useT()
  const toast = useToast()
  const fotoPerfil = useDemoStore(s => s.fotoPerfil)
  const bannerPerfil = useDemoStore(s => s.bannerPerfil)
  const bioPerfil = useDemoStore(s => s.bioPerfil)
  const userTag = useDemoStore(s => s.userTag)
  const tagRegenerado = useDemoStore(s => s.tagRegenerado)
  const setFotoPerfil = useDemoStore(s => s.setFotoPerfil)
  const setBannerPerfil = useDemoStore(s => s.setBannerPerfil)
  const setBioPerfil = useDemoStore(s => s.setBioPerfil)
  const regenerarTag = useDemoStore(s => s.regenerarTag)

  // Borradores locales: se aplican al store solo al Guardar.
  const [foto, setFoto] = useState<string | null>(fotoPerfil)
  const [banner, setBanner] = useState<string | null>(bannerPerfil)
  const [bio, setBio] = useState(bioPerfil)
  const inputFoto = useRef<HTMLInputElement>(null)
  const inputBanner = useRef<HTMLInputElement>(null)

  const cargar = async (file: File | undefined, destino: 'foto' | 'banner') => {
    if (!file) return
    try {
      // La foto va a 512px como mucho; el banner es panorámico, mismo tope.
      const dataUrl = await comprimirImagen(file, 512, 200)
      if (destino === 'foto') setFoto(dataUrl)
      else setBanner(dataUrl)
    } catch {
      toast.error(tr('pfl.errorImagen'))
    }
  }

  const guardar = () => {
    try {
      setFotoPerfil(foto)
      setBannerPerfil(banner)
      setBioPerfil(bio)
      // localStorage puede quedarse sin sitio con los dataURL: si lo escrito no
      // llegó a persistir, se avisa (el estado en memoria sí queda aplicado).
      try {
        const crudo = localStorage.getItem(claveDemoActual())
        const persistido = crudo ? JSON.parse(crudo)?.state?.fotoPerfil : undefined
        if (foto && persistido !== foto) {
          toast.warning(tr('pfl.errorEspacio'))
          onClose()
          return
        }
      } catch { /* sin acceso a localStorage: no bloquea el guardado en memoria */ }
      toast.success(tr('pfl.guardado'))
      onClose()
    } catch {
      toast.error(tr('pfl.errorEspacio'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl bg-[#12161F] p-6 sm:rounded-3xl border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{tr('pfl.editarPerfil')}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-5">
          {/* Foto propia */}
          <div>
            <p className="mb-2 text-sm font-medium text-[#A0A0B8]">{tr('pfl.foto')}</p>
            <div className="flex items-center gap-3">
              <span className="h-16 w-16 shrink-0 rounded-2xl overflow-hidden ring-1 ring-white/12 bg-gradient-to-br from-[#B6FF3A] to-[#7C5CFF] flex items-center justify-center">
                {foto
                  /* eslint-disable-next-line @next/next/no-img-element */
                  ? <img src={foto} alt="" className="h-full w-full object-cover" />
                  : <span className="text-display text-2xl font-black text-white">{(nombre[0] || '?').toUpperCase()}</span>}
              </span>
              <input ref={inputFoto} type="file" accept="image/*" className="hidden" aria-label={tr('pfl.subirFoto')}
                onChange={e => { cargar(e.target.files?.[0], 'foto'); e.target.value = '' }} />
              <button onClick={() => inputFoto.current?.click()}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#B6FF3A]/15 text-[#B6FF3A] text-[12px] font-bold">
                <Upload size={13} /> {tr('pfl.subirFoto')}
              </button>
              {foto && (
                <button onClick={() => setFoto(null)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-white/10 text-[#8B8BA8] text-[12px] font-semibold hover:text-[#FF8A8A]">
                  <Trash2 size={13} /> {tr('sede.quitar')}
                </button>
              )}
            </div>
          </div>

          {/* Banner: presets con la estética de la app o subida propia */}
          <div>
            <p className="mb-2 text-sm font-medium text-[#A0A0B8]">{tr('pfl.banner')}</p>
            <div className="grid grid-cols-3 gap-2">
              {BANNERS_PRESET.map(b => (
                <button key={b.id} onClick={() => setBanner(b.css)} aria-label={`${tr('pfl.banner')} ${b.nombre}`}
                  className={cn('h-12 rounded-xl border transition-all', banner === b.css ? 'border-[#B6FF3A] ring-1 ring-[#B6FF3A]' : 'border-white/10 hover:border-white/25')}
                  style={{ background: b.css }} />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input ref={inputBanner} type="file" accept="image/*" className="hidden" aria-label={tr('pfl.subirBanner')}
                onChange={e => { cargar(e.target.files?.[0], 'banner'); e.target.value = '' }} />
              <button onClick={() => inputBanner.current?.click()}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-white/10 text-[#B8B8CC] text-[12px] font-semibold hover:text-white">
                <Upload size={13} /> {tr('pfl.subirBanner')}
              </button>
              {banner?.startsWith('data:') && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={banner} alt="" className="h-9 w-16 rounded-lg object-cover ring-1 ring-[#B6FF3A]/60" />
              )}
              {banner && (
                <button onClick={() => setBanner(null)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-white/10 text-[#8B8BA8] text-[12px] font-semibold hover:text-[#FF8A8A]">
                  <Trash2 size={13} /> {tr('sede.quitar')}
                </button>
              )}
            </div>
          </div>

          {/* Bio ≤160 */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-[#A0A0B8]">{tr('pfl.bio')}</p>
              <span className="text-[11px] text-[#6B6B85] font-mono-num">{bio.length}/160</span>
            </div>
            <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 160))} maxLength={160} rows={3}
              placeholder={tr('pfl.bioPh')}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#B6FF3A]/60 resize-none placeholder:text-[#6B6B85]" />
          </div>

          {/* Tag de usuario: fijo salvo UNA regeneración (los tags no se traducen) */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[#8B8BA8]">{tr('pfl.tuTag')}</p>
                <p className="text-base font-black text-white font-mono-num">{nombre}<span className="text-[#8B8BA8]">#{userTag ?? '·····'}</span></p>
              </div>
              <button onClick={() => { regenerarTag(); }} disabled={tagRegenerado}
                className={cn('inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-bold border transition-colors',
                  tagRegenerado ? 'border-white/8 text-[#6B6B85] cursor-not-allowed' : 'border-[#B6FF3A]/40 text-[#B6FF3A] hover:bg-[#B6FF3A]/10')}>
                <RefreshCw size={13} /> {tagRegenerado ? tr('pfl.tagYaRegenerado') : tr('pfl.regenerarTag')}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-[#6B6B85]">{tr('pfl.tagAyuda')}</p>
          </div>

          <button onClick={guardar} className="h-12 w-full rounded-xl bg-[#B6FF3A] font-semibold text-[#0A0A0F]">
            {tr('comun.guardar')}
          </button>
        </div>
      </div>
    </div>
  )
}
