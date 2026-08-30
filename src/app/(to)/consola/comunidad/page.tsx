'use client'
import { useState } from 'react'
import Link from 'next/link'
import { organizadorEfectivo } from '@/lib/torneos/sample'
import { torneosEfectivos } from '@/lib/torneos/efectivos'
import { useDemoStore, useOrgId } from '@/lib/stores/useDemoStore'
import { useT } from '@/lib/i18n'
import { CabeceraConsola } from '@/components/todh/CabeceraConsola'
import { Users, TrendingUp, Star, Megaphone, Radio, ChevronRight, Check, Trophy, UsersRound } from 'lucide-react'

// Comunidad del TO (spec Consola punto 5): grupos y amigos REALES del store,
// difusión de la página de eventos (un clic → enlace copiado), los dos
// escaparates hacia fuera (página de eventos pública = /mi-pagina, y el Live)
// y los datos/estadísticas del organizador. Solo LEE del store.

// Misma receta de color determinista que /amigos (iniciales de los avatares).
function avatarColor(name: string) {
  const c = ['#E63E54', '#F4912B', '#4F8EF7', '#9B5DE5', '#2EC4B6', '#B6FF3A']
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return c[h % c.length]
}

export default function ComunidadTOPage() {
  const { t: tr } = useT()
  const orgId = useOrgId()
  const org = organizadorEfectivo(orgId)
  const grupos = useDemoStore(s => s.gruposChat)
  const amigos = useDemoStore(s => s.amigos)
  const creados = useDemoStore(s => s.creados)
  const editados = useDemoStore(s => s.editados)
  const cancelados = useDemoStore(s => s.cancelados)
  // Nuevos del mes: misma estimación demo que el KPI de la consola
  const nuevosMes = Math.round(org.seguidores * 0.04)
  const vivos = torneosEfectivos(creados, editados, cancelados)
    .filter(t => t.organizadorId === org.id)
  const inscritosTotales = vivos.reduce((a, t) => a + t.inscritos, 0)

  // Difundir: copia el enlace de la página de eventos pública y confirma 2 s
  const [copiado, setCopiado] = useState<string | null>(null)
  const difundir = async (grupoId: string) => {
    try { await navigator.clipboard.writeText(`${location.origin}/mi-pagina`) } catch { /* demo: sin permiso de portapapeles */ }
    setCopiado(grupoId)
    setTimeout(() => setCopiado(v => (v === grupoId ? null : v)), 2000)
  }

  return (
    <div className="relative min-h-screen pb-10 max-w-xl mx-auto lg:max-w-none lg:mx-0">
      <CabeceraConsola titulo={tr('to.comunidad')} />

      <div className="px-5 lg:px-0 lg:max-w-6xl">
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
          <section>
            {/* Grupos reales del store: tu canal directo para difundir torneos */}
            <p className="eyebrow eyebrow-muted mt-5 mb-2.5">{tr('amigos.grupos')}</p>
            {grupos.length === 0 ? (
              <Link href="/amigos" className="card-premium card-int p-4 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-[#8B8BA8] shrink-0"><UsersRound size={18} /></span>
                <p className="flex-1 text-[13px] text-[#8B8BA8] leading-snug">{tr('com2.sinGrupos')}</p>
                <ChevronRight size={16} className="text-[#6B6B85] shrink-0" />
              </Link>
            ) : (
              <div className="space-y-2">
                {grupos.map(g => (
                  <div key={g.id} className="card-premium p-3.5 flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-xl">{g.emoji || '🎮'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{g.nombre}</p>
                      <p className="text-[11px] text-[#8B8BA8]">{g.miembros.length} {tr('com2.miembros')}</p>
                    </div>
                    <button onClick={() => difundir(g.id)}
                      className={`inline-flex shrink-0 items-center gap-1 px-2.5 h-8 rounded-lg text-[12px] font-bold transition-colors ${copiado === g.id ? 'bg-white/8 text-[#B6FF3A]' : 'bg-[#B6FF3A]/15 text-[#B6FF3A] hover:bg-[#B6FF3A]/25'}`}>
                      {copiado === g.id ? <><Check size={13} /> {tr('com2.copiado')}</> : <><Megaphone size={13} /> {tr('com.difundir')}</>}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Amigos reales del store */}
            <p className="eyebrow eyebrow-muted mt-6 mb-2.5">{tr('amigos.titulo')}</p>
            <Link href="/amigos" className="card-premium card-int p-3.5 flex items-center gap-3">
              <span className="flex shrink-0 -space-x-2">
                {amigos.slice(0, 5).map(n => (
                  <span key={n} className="inline-flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-[#12151d] text-[12px] font-black text-[#0A0A0F]"
                    style={{ background: avatarColor(n) }}>
                    {(n.trim()[0] || '?').toUpperCase()}
                  </span>
                ))}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-white">{amigos.length} {tr('amigos.titulo').toLowerCase()}</span>
                <span className="mt-0.5 block text-[11px] text-[#8B8BA8] truncate">{amigos.slice(0, 3).join(', ')}{amigos.length > 3 ? '…' : ''} · {tr('com2.verTodos')}</span>
              </span>
              <ChevronRight size={16} className="text-[#6B6B85] shrink-0" />
            </Link>
          </section>

          <section>
            {/* Escaparates: la página de eventos pública (/mi-pagina) y el Live */}
            <p className="eyebrow eyebrow-muted mt-6 lg:mt-5 mb-2.5">{tr('com.difundir')}</p>
            <div className="space-y-2.5">
              <Link href="/mi-pagina" className="card-premium card-int p-4 flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: '#E0BE631A', border: '1px solid #E0BE6340' }}>
                  <Megaphone size={18} className="text-[#E0BE63]" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-white">{tr('com.paginaPublica')}</span>
                  <span className="mt-0.5 block text-[11px] text-[#8B8BA8]">{tr('com2.eventosPublica')} · {tr('com.paginaPublicaDesc').toLowerCase()}</span>
                </span>
                <ChevronRight size={16} className="text-[#6B6B85] shrink-0" />
              </Link>
              <Link href="/modo-directo" className="card-premium card-int p-4 flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: '#E0BE631A', border: '1px solid #E0BE6340' }}>
                  <Radio size={18} className="text-[#E0BE63]" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-white">{tr('nav.live')}</span>
                  <span className="mt-0.5 block text-[11px] text-[#8B8BA8]">{tr('com.liveDesc')}</span>
                </span>
                <ChevronRight size={16} className="text-[#6B6B85] shrink-0" />
              </Link>
            </div>

            {/* Datos y estadísticas del organizador */}
            <p className="eyebrow eyebrow-muted mt-6 mb-2.5">{tr('com2.datos')}</p>
            <div className="grid grid-cols-2 gap-2.5">
              <MiniStat icon={<Users size={15} className="text-[#9B82FF]" />} value={org.seguidores.toLocaleString('es')} label={tr('to.seguidores')} />
              <MiniStat icon={<TrendingUp size={15} className="text-[#4F8EF7]" />} value={`+${nuevosMes}`} label={tr('to.nuevosSeguidores')} />
              <MiniStat icon={<Star size={15} className="text-[#E0BE63]" />} value={org.valoraciones > 0 ? String(org.rating) : '—'}
                sufijo={org.valoraciones > 0 ? `· ${org.valoraciones} ${tr('com2.valoracionesN')}` : undefined} label={tr('com.valoracionMedia')} />
              <MiniStat icon={<Trophy size={15} className="text-[#B6FF3A]" />} value={String(org.torneosOrg)} label={tr('pf.torneosOrg')} />
              <MiniStat icon={<UsersRound size={15} className="text-[#FF8A5C]" />} value={String(inscritosTotales)} label={tr('com2.inscritosTotales')} />
              <MiniStat icon={<Megaphone size={15} className="text-[#E0BE63]" />} value={String(grupos.length)} label={tr('amigos.grupos')} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function MiniStat({ icon, value, sufijo, label }: { icon: React.ReactNode; value: string; sufijo?: string; label: string }) {
  return (
    <div className="card-premium p-3.5">
      <span className="mb-1.5 block">{icon}</span>
      <p className="text-xl font-bold text-white font-mono-num leading-none">
        {value}{sufijo && <span className="ml-1 text-[10px] font-semibold text-[#8B8BA8]">{sufijo}</span>}
      </p>
      <p className="text-[10px] uppercase tracking-[0.12em] text-[#8B8BA8] font-semibold mt-1">{label}</p>
    </div>
  )
}
