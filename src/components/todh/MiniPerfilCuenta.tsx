'use client'
import { X, UserRound } from 'lucide-react'
import { useDemoStore, nombreCuentaDemo, tagCuentaDemo } from '@/lib/stores/useDemoStore'
import { useT } from '@/lib/i18n'

// ── Mundo compartido (30-08): mini-perfil PÚBLICO de una cuenta Torneum ──
// Lo que otra cuenta ve al tocar a Javier/Lucía/David…: nombre, tag, foto y
// bio publicados por su dueño (perfilesCuentas del mundo). SIN stats falsas:
// una cuenta nueva no tiene historial y se dice tal cual.

function colorDe(nombre: string) {
  const c = ['#E63E54', '#F4912B', '#4F8EF7', '#9B5DE5', '#2EC4B6', '#B6FF3A']
  let h = 0
  for (const ch of nombre) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return c[h % c.length]
}

// Avatar de cuenta: la foto publicada de su perfil o su inicial.
export function AvatarCuenta({ email, size = 40 }: { email: string; size?: number }) {
  const perfiles = useDemoStore(s => s.perfilesCuentas)
  const nombre = nombreCuentaDemo(email, perfiles)
  const foto = perfiles[email]?.foto
  if (foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt={nombre} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  }
  return (
    <span className="shrink-0 rounded-full flex items-center justify-center font-black text-[#0A0A0F]"
      style={{ width: size, height: size, fontSize: size * 0.4, background: colorDe(nombre) }}>
      {(nombre.trim()[0] || '?').toUpperCase()}
    </span>
  )
}

export function MiniPerfilCuenta({ email, onClose }: { email: string; onClose: () => void }) {
  const { t: tr } = useT()
  const perfiles = useDemoStore(s => s.perfilesCuentas)
  const nombre = nombreCuentaDemo(email, perfiles)
  const tag = tagCuentaDemo(email, perfiles)
  const bio = perfiles[email]?.bio?.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden animate-slide-up-sm sm:animate-pop">
        <div className="relative h-20" style={{ background: 'radial-gradient(120% 140% at 0% 0%, #B6FF3A33 0%, #B6FF3A11 40%, transparent 75%), #0E1119' }}>
          <button onClick={onClose} aria-label="Cerrar" className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/30 flex items-center justify-center text-white"><X size={16} /></button>
        </div>
        <div className="px-5 pb-6 -mt-9">
          <div className="flex items-end gap-3">
            <span className="rounded-2xl overflow-hidden border-4 border-[#141822]"><AvatarCuenta email={email} size={68} /></span>
            <div className="pb-1 min-w-0">
              <p className="text-lg font-bold text-white text-display leading-tight truncate">
                {nombre} <span className="text-[13px] font-bold text-[#8B8BA8] font-mono-num">#{tag}</span>
              </p>
              <span className="inline-flex items-center gap-1 mt-0.5 px-2 h-5 rounded-full bg-[#B6FF3A]/12 border border-[#B6FF3A]/35 text-[#B6FF3A] text-[10px] font-bold">
                <UserRound size={10} /> {tr('mc.cuentaTorneum')}
              </span>
            </div>
          </div>
          {bio && <p className="mt-3 text-sm text-[#B8B8CC] leading-relaxed">{bio}</p>}
          {/* Sin stats inventadas: las cuentas empiezan de cero y se dice claro */}
          <div className="mt-3 card-premium px-3.5 py-3">
            <p className="text-[12px] text-[#8B8BA8]">{tr('mc.sinHistorial')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
