'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Lock } from '@/components/todh/iconosTorneum'
import { Award } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { LOGROS_USUARIO, LOGROS_DESBLOQUEADOS, LOGROS_BLOQUEADOS } from '@/lib/torneos/logros'
import { useEsCuentaFresca } from '@/lib/stores/useSesionStore'

// Vitrina de logros (sección 6.4): desbloqueados a color y bloqueados en gris
// con candado y la condición para conseguirlos. Se llega desde la tira del perfil.
// Cuenta nueva (fresca): 0/11 — todos bloqueados todavía.
export default function LogrosPage() {
  const { t: tr } = useT()
  const router = useRouter()
  const fresca = useEsCuentaFresca()
  const desbloqueados = fresca ? [] : LOGROS_DESBLOQUEADOS
  const bloqueados = fresca ? LOGROS_USUARIO : LOGROS_BLOQUEADOS

  return (
    <div className="relative min-h-screen pb-10">
      <div className="px-4 pt-5 pb-3 safe-top sticky top-0 z-10 bg-[#0D0F15]/92 backdrop-blur-md border-b border-white/6">
        <div className="flex items-center gap-3 lg:max-w-5xl lg:mx-auto">
          <button onClick={() => router.push('/perfil')} aria-label={tr('comun.atras')} className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold">{tr('logros.eyebrow')}</p>
            <p className="text-base font-bold text-white">
              {tr('perfil.logros')} <span className="text-[#B6FF3A]">· {desbloqueados.length} {tr('logros.de')} {LOGROS_USUARIO.length}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5 lg:max-w-5xl lg:mx-auto">
        <section>
          <div className="flex items-center gap-2 mb-2"><Award size={15} className="text-[#E0BE63]" /><p className="eyebrow eyebrow-muted">{tr('logros.desbloqueados')}</p></div>
          {desbloqueados.length === 0 && (
            <p className="text-[13px] text-[#8B8BA8] px-1">{tr('logros.ningunoAun')}</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {desbloqueados.map(({ id, icon: Icon, color, titulo, condicion }, i) => (
              <div key={id} className="card-premium p-4 flex flex-col items-center text-center gap-2 stagger-item" style={{ ['--delay' as string]: `${i * 45}ms` }}>
                <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${color}1A`, border: `1px solid ${color}40` }}>
                  <Icon size={22} style={{ color }} />
                </span>
                <p className="text-[13px] font-bold text-white leading-tight">{tr(titulo)}</p>
                <p className="text-[11px] text-[#8B8BA8] leading-snug">{tr(condicion)}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-2"><Lock size={14} className="text-[#6B6B85]" /><p className="eyebrow eyebrow-muted">{tr('logros.bloqueados')}</p></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {bloqueados.map(({ id, icon: Icon, titulo, condicion }, i) => (
              <div key={id} className="card-premium p-4 flex flex-col items-center text-center gap-2 opacity-80 stagger-item" style={{ ['--delay' as string]: `${i * 45}ms` }}>
                <span className="relative w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10">
                  <Icon size={22} className="text-[#565670]" />
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#1D2230] border border-white/15 flex items-center justify-center">
                    <Lock size={10} className="text-[#8B8BA8]" />
                  </span>
                </span>
                <p className="text-[13px] font-bold text-[#8B8BA8] leading-tight">{tr(titulo)}</p>
                <p className="text-[11px] text-[#6B6B85] leading-snug">{tr(condicion)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
