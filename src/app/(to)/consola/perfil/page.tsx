'use client'
import Link from 'next/link'
import { organizadorEfectivo, JUEGOS } from '@/lib/torneos/sample'
import { useOrgId } from '@/lib/stores/useDemoStore'
import { useT } from '@/lib/i18n'
import { CabeceraConsola } from '@/components/todh/CabeceraConsola'
import { GameIcon } from '@/components/todh/GameIcon'
import { Star, MapPin, BadgeCheck, Megaphone, ChevronRight, Trophy, Users, Pencil } from 'lucide-react'
import { useDemoStore } from '@/lib/stores/useDemoStore'

// Perfil del TO dentro de la consola: la cara del organizador (la identidad
// que antes encabezaba la consola vive aquí). Se EDITA desde el apartado
// Perfil (/perfil/organizador, decisión Albert 30-08); aquí solo se consulta
// y se enlaza el editor.
export default function PerfilTOPage() {
  const { t: tr } = useT()
  const orgId = useOrgId()
  // Suscripción a los overrides editables: la vista refresca al guardar.
  useDemoStore(s => s.perfilesOrg)
  const org = organizadorEfectivo(orgId)

  return (
    <div className="relative min-h-screen pb-10 max-w-xl mx-auto lg:max-w-none lg:mx-0">
      <CabeceraConsola titulo={tr('cm.perfil')} />

      <div className="px-5 lg:px-0">
        {/* Identidad: lo que antes encabezaba la consola */}
        <div className="card-premium p-4 mt-5">
          <div className="flex items-center gap-3.5">
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-2xl font-black text-[#0A0A0F] shrink-0" style={{ background: org.color }}>{org.nombre[0]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-white text-display leading-tight inline-flex items-center gap-1.5">
                {org.nombre}
                {org.verificado && <BadgeCheck size={16} className="text-[#4F8EF7] shrink-0" />}
              </p>
              {org.handle && <p className="text-xs text-[#8B8BA8]">{org.handle}</p>}
              <p className="text-xs text-[#8B8BA8] inline-flex items-center gap-1 mt-0.5">
                <Star size={11} className="text-[#E0BE63]" /> {org.rating} · {org.tier} · {org.seguidores.toLocaleString('es')} {tr('to.seguidores').toLowerCase()}
              </p>
            </div>
            <Link href="/perfil/organizador" aria-label={tr('pfo.editar')} title={tr('pfo.editar')}
              className="h-9 w-9 rounded-xl glass-strong flex items-center justify-center text-[#B8B8CC] hover:text-white transition-colors shrink-0">
              <Pencil size={15} />
            </Link>
          </div>
          {org.bio && <p className="mt-3 text-[13px] text-[#B8B8CC] leading-relaxed">{org.bio}</p>}
          <p className="mt-2 text-[11px] text-[#8B8BA8] inline-flex items-center gap-1"><MapPin size={11} /> {org.ciudad}</p>
        </div>

        {/* Trayectoria en dos cifras */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="card-premium p-3.5">
            <Trophy size={15} className="text-[#E0BE63] mb-1.5" />
            <p className="text-xl font-bold text-white font-mono-num leading-none">{org.torneosOrg}</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#8B8BA8] font-semibold mt-1">{tr('pf.torneosOrg')}</p>
          </div>
          <div className="card-premium p-3.5">
            <Users size={15} className="text-[#9B82FF] mb-1.5" />
            <p className="text-xl font-bold text-white font-mono-num leading-none">{org.seguidores.toLocaleString('es')}</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#8B8BA8] font-semibold mt-1">{tr('to.seguidores')}</p>
          </div>
        </div>

        {/* Juegos que organiza */}
        {org.juegos.length > 0 && (
          <>
            <p className="eyebrow eyebrow-muted mt-6 mb-2.5">{tr('pf.juegos')}</p>
            <div className="flex flex-wrap gap-1.5">
              {org.juegos.map(j => JUEGOS[j] && (
                <span key={j} className="px-2.5 h-8 inline-flex items-center gap-1.5 rounded-full text-[12px] font-bold border"
                  style={{ background: `${JUEGOS[j].color}1A`, color: JUEGOS[j].color, borderColor: `${JUEGOS[j].color}40` }}>
                  <GameIcon juegoId={j} size={14} /> {JUEGOS[j].corto}
                </span>
              ))}
            </div>
          </>
        )}

        {/* Tu página pública: lo que de verdad ven los jugadores */}
        <Link href="/mi-pagina" className="mt-6 card-premium card-int p-4 flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: '#E0BE631A', border: '1px solid #E0BE6340' }}>
            <Megaphone size={18} className="text-[#E0BE63]" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-white">{tr('pf.verPagina')}</span>
            <span className="mt-0.5 block text-[11px] text-[#8B8BA8]">{tr('com.paginaPublicaDesc')}</span>
          </span>
          <ChevronRight size={16} className="text-[#6B6B85] shrink-0" />
        </Link>

        {/* Comunidad: resumen y puerta a /consola/comunidad (perfil + comunidad) */}
        <p className="eyebrow eyebrow-muted mt-6 mb-2.5">{tr('to.comunidad')}</p>
        <Link href="/consola/comunidad" className="card-premium card-int p-4 flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: '#E0BE631A', border: '1px solid #E0BE6340' }}>
            <Users size={18} className="text-[#E0BE63]" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-white">
              {org.seguidores.toLocaleString('es')} {tr('to.seguidores').toLowerCase()} · <Star size={12} className="inline align-[-1px] text-[#E0BE63]" /> {org.rating}
              {org.valoraciones > 0 && <span className="text-[11px] font-semibold text-[#8B8BA8]"> ({org.valoraciones})</span>}
            </span>
            <span className="mt-0.5 block text-[11px] text-[#8B8BA8]">{tr('cx.verComunidad')}</span>
          </span>
          <ChevronRight size={16} className="text-[#6B6B85] shrink-0" />
        </Link>
      </div>
    </div>
  )
}
