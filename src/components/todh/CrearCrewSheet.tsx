'use client'
import { useMemo, useState } from 'react'
import { X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { JUEGOS_LIST } from '@/lib/torneos/sample'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { CREW_USUARIO, TAG_RE, MAX_CREWS_POR_JUEGO } from '@/lib/torneos/crews'
import { GameIcon } from '@/components/todh/GameIcon'
import { useT } from '@/lib/i18n'

// ─────────────────────────────────────────────────────────────────────────────
// Hoja «Crear una crew» (F6, desde Chat): nombre, tag autovalidado (EXACTAMENTE
// 4 letras A-Z, sin números — el dígito inicial queda para los tags de usuario,
// único), juego (una crew = un juego), color del tag y miembros entre TUS
// amigos. Al crear, el store abre además su grupo de chat vinculado.
// El límite de 2 crews por juego se valida aquí con mensaje claro.
// ─────────────────────────────────────────────────────────────────────────────

const EMOJIS = ['⚔️', '🌙', '🔥', '🐉', '👑', '🦅', '⚡', '🎯']
const COLORES = ['#B6FF3A', '#9B5DE5', '#FF4655', '#4F8EF7', '#E0BE63', '#2EC4B6']

function avatarColor(name: string) {
  const c = ['#E63E54', '#F4912B', '#4F8EF7', '#9B5DE5', '#2EC4B6', '#B6FF3A']
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return c[h % c.length]
}

export function CrearCrewSheet({ onClose }: { onClose: () => void }) {
  const { t: tr } = useT()
  const amigos = useDemoStore(s => s.amigos)
  const crews = useDemoStore(s => s.crews)
  const ocultos = useDemoStore(s => s.juegosOcultos)
  const crearCrew = useDemoStore(s => s.crearCrew)

  const [nombre, setNombre] = useState('')
  const [tag, setTag] = useState('')
  const [juego, setJuego] = useState<string | null>(null)
  const [emoji, setEmoji] = useState('⚔️')
  const [color, setColor] = useState(COLORES[0])
  const [sel, setSel] = useState<Set<string>>(new Set())

  const juegos = useMemo(() => JUEGOS_LIST.filter(j => !ocultos.includes(j.id)), [ocultos])

  const TAG = tag.trim().toUpperCase()
  const tagValido = TAG_RE.test(TAG)
  const tagOcupado = tagValido && crews.some(c => c.tag === TAG)
  // Límite spec §7.4: hasta 2 crews por juego por jugador.
  const lleno = !!juego && crews.filter(c => c.juego === juego && c.miembros.includes(CREW_USUARIO)).length >= MAX_CREWS_POR_JUEGO
  const puedeCrear = nombre.trim().length >= 2 && tagValido && !tagOcupado && !!juego && !lleno && sel.size > 0

  const crear = () => {
    if (!puedeCrear || !juego) return
    crearCrew({ nombre: nombre.trim(), tag: TAG, juego, emoji, color, miembros: [...sel] })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl bg-[#12161F] p-6 sm:rounded-3xl border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{tr('crew.nueva')}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          {/* Emblema provisional: emoji + color del tag */}
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)} className={cn('h-10 w-10 rounded-xl text-xl', emoji === e ? 'bg-[#B6FF3A]/20 ring-1 ring-[#B6FF3A]' : 'bg-white/5')}>{e}</button>
            ))}
          </div>

          <input value={nombre} onChange={e => setNombre(e.target.value)} maxLength={40} placeholder={tr('crew.nombrePh')}
            className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-[#B6FF3A]/60" />

          {/* Tag autovalidado: siempre en mayúsculas, único, #TAG en la vista */}
          <div>
            <p className="mb-1.5 text-sm font-medium text-[#A0A0B8]">{tr('crew.tagLabel')}</p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black" style={{ color }}>#</span>
                <input value={tag} onChange={e => setTag(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
                  maxLength={4} placeholder="NOCT"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-8 pr-4 font-black uppercase tracking-[0.2em] text-white outline-none focus:border-[#B6FF3A]/60" />
              </div>
              <div className="flex gap-1.5">
                {COLORES.map(c => (
                  <button key={c} onClick={() => setColor(c)} aria-label={`${tr('crew.colorLabel')} ${c}`}
                    className={cn('h-7 w-7 rounded-full transition-transform', color === c && 'ring-2 ring-white/70 scale-110')}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
            {tag.length > 0 && !tagValido
              ? <p className="mt-1.5 text-[11px] font-semibold text-[#FF8A8A]">{tr('crew.tagInvalido')}</p>
              : tagOcupado
                ? <p className="mt-1.5 text-[11px] font-semibold text-[#FF8A8A]">{tr('crew.tagOcupado')}</p>
                : <p className="mt-1.5 text-[11px] text-[#6B6B85]">{tr('crew.tagAyuda')}</p>}
          </div>

          {/* Juego: una crew pertenece a UN juego */}
          <div>
            <p className="mb-1.5 text-sm font-medium text-[#A0A0B8]">{tr('crew.juegoLabel')}</p>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
              {juegos.map(j => {
                const activo = juego === j.id
                return (
                  <button key={j.id} onClick={() => setJuego(j.id)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold transition-all border"
                    style={activo
                      ? { background: `${j.color}26`, color: j.color, borderColor: `${j.color}88` }
                      : { background: 'rgba(255,255,255,0.04)', color: '#B8B8CC', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <GameIcon juegoId={j.id} size={13} /> {j.corto}
                  </button>
                )
              })}
            </div>
            {lleno && <p className="mt-1.5 text-[11px] font-semibold text-[#FF8A8A]">{tr('crew.limite')}</p>}
          </div>

          {/* Miembros: entre tus amigos */}
          <div>
            <p className="mb-2 text-sm font-medium text-[#A0A0B8]">{tr('crew.miembrosLabel')}</p>
            {amigos.length === 0 ? (
              <p className="text-sm text-[#6B6B85]">{tr('crew.sinAmigos')}</p>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {amigos.map(a => {
                  const on = sel.has(a)
                  return (
                    <button key={a} onClick={() => setSel(prev => { const n = new Set(prev); if (n.has(a)) n.delete(a); else n.add(a); return n })}
                      className={cn('flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left', on ? 'border-[#B6FF3A] bg-[#B6FF3A]/10' : 'border-white/8 bg-white/[0.03]')}>
                      <span className="shrink-0 rounded-full flex items-center justify-center font-black text-[#0A0A0F]"
                        style={{ width: 32, height: 32, fontSize: 13, background: avatarColor(a) }}>{a[0].toUpperCase()}</span>
                      <span className="flex-1 truncate text-sm text-white">{a}</span>
                      {on && <Check size={16} className="text-[#B6FF3A]" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <button onClick={crear} disabled={!puedeCrear} className="h-12 w-full rounded-xl bg-[#B6FF3A] font-semibold text-[#0A0A0F] disabled:opacity-50">
            {tr('crew.crearBtn')}{TAG && tagValido ? ` · #${TAG}` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
