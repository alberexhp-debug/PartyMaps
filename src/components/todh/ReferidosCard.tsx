'use client'
import { useState } from 'react'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { Gift, Copy, Check, Lock } from 'lucide-react'

// Invita y gana (plan de lanzamiento): escalones 1/3/5 con anti-fraude —
// un referido solo cuenta cuando JUEGA su primer torneo, no al registrarse.
const NIVELES: { n: 1 | 3 | 5; premio: string; emoji: string }[] = [
  { n: 1, premio: 'Entrada de espectador gratis', emoji: '👀' },
  { n: 3, premio: 'Inscripción estándar gratis', emoji: '🎮' },
  { n: 5, premio: 'Acceso a un torneo Oro', emoji: '🏆' },
]

export function ReferidosCard() {
  const { codigo, jugados, canjeados } = useDemoStore(s => s.referidos)
  const canjear = useDemoStore(s => s.canjearReferido)
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(`https://tourneum.app/r/${codigo}`)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch { /* sin permisos */ }
  }

  return (
    <div className="card-premium ring-grad p-4 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-[#B6FF3A]/8 blur-2xl" />
      <div className="relative flex items-center gap-2 mb-1">
        <Gift size={15} className="text-[#B6FF3A]" />
        <p className="eyebrow eyebrow-muted">Invita y gana</p>
      </div>
      <p className="text-[13px] text-[#B8B8CC]">Comparte tu código: cada amigo cuenta cuando <strong className="text-white">juega su primer torneo</strong>.</p>

      {/* Código */}
      <button onClick={copiar} className="mt-3 w-full flex items-center justify-between rounded-xl border border-dashed border-[#B6FF3A]/45 bg-[#B6FF3A]/6 px-4 h-12">
        <span className="font-mono text-[15px] font-black tracking-[0.14em] text-[#B6FF3A]">{codigo}</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
          {copiado ? <><Check size={14} className="text-[#B6FF3A]" /> Copiado</> : <><Copy size={14} /> Copiar enlace</>}
        </span>
      </button>

      {/* Progreso */}
      <div className="mt-3.5 flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-white/8 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#B6FF3A] to-[#7ED957] transition-all" style={{ width: `${Math.min(100, (jugados / 5) * 100)}%` }} />
        </div>
        <span className="text-xs font-bold text-white font-mono-num shrink-0">{jugados}/5</span>
      </div>

      {/* Escalones */}
      <div className="mt-3 space-y-1.5">
        {NIVELES.map(({ n, premio, emoji }) => {
          const canjeado = canjeados.includes(n)
          const disponible = jugados >= n && !canjeado
          return (
            <div key={n} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border ${canjeado ? 'bg-white/[0.03] border-white/8' : disponible ? 'bg-[#B6FF3A]/8 border-[#B6FF3A]/35' : 'bg-white/[0.03] border-white/8 opacity-60'}`}>
              <span className="text-base">{emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-semibold ${canjeado ? 'text-[#8B8BA8] line-through' : 'text-white'}`}>{premio}</p>
                <p className="text-[10px] text-[#8B8BA8]">{n} {n === 1 ? 'amigo que juegue' : 'amigos que jueguen'}</p>
              </div>
              {canjeado
                ? <span className="text-[10px] font-bold text-[#8B8BA8] inline-flex items-center gap-1"><Check size={12} /> Canjeado</span>
                : disponible
                ? <button onClick={() => canjear(n)} className="h-7 px-2.5 rounded-lg bg-[#B6FF3A] text-[#0A0A0F] text-[11px] font-black">Canjear</button>
                : <Lock size={13} className="text-[#5A5A70]" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
