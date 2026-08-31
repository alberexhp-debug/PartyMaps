'use client'
import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { getTorneo, rankingPorJuego, bracketDe, type Jugador } from '@/lib/torneos/sample'
import { construirRondas, nombreRonda } from '@/lib/torneos/bracket'
import { torneosEfectivos } from '@/lib/torneos/efectivos'
import { useDemoStore, resolverSeeds, ID_CUENTA_PREFIJO } from '@/lib/stores/useDemoStore'
import { useSesionStore } from '@/lib/stores/useSesionStore'
import { TorneoArt } from '@/components/todh/GameKeyart'
import { VideoEmbed } from '@/components/todh/VideoEmbed'
import { ReglasTorneo } from '@/components/todh/ReglasTorneo'
import { MiniPerfil } from '@/components/todh/MiniPerfil'
import { MiniPerfilCuenta } from '@/components/todh/MiniPerfilCuenta'
import { ChatTorneoSheet } from '@/components/todh/ChatTorneo'
import { RangoChip } from '@/components/todh/RangoChip'
import { PersonajeChip } from '@/components/todh/PersonajeChip'
import { ScoutingSheet } from '@/components/todh/ScoutingSheet'
import { TierSheet, tieneAcceso } from '@/components/todh/TierSheet'
import { useT, conParams } from '@/lib/i18n'
import { ArrowLeft, Radio, CalendarClock, MapPin, Trophy, Users, ListTree, MessageSquare, Swords, Calendar, Search } from '@/components/todh/iconosTorneum'

// Mi partida en el bracket real (backlog A): TS no rastrea las asignaciones
// dentro del forEach, de ahí los tipos nombrados + aserción en el return.
type MiMatchActual = { rival: Jugador | null; ronda: string; mid: string; nMesa: number; vsParam: string }
type MiUltimoSet = { rival: Jugador; gane: boolean; yo: number; el: number }

// SALA LIVE de un torneo (para inscritos): antes de abrir enseña detalles y
// reglas; cuando el TO la abre (directo o bracket generado) enseña el bracket
// en vivo, los marcadores y tu próximo rival con su probabilidad — y al tocar
// un rival, su perfil (mains, récord, historial de torneos).
export default function SalaLivePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t: tr, idioma } = useT()
  const creados = useDemoStore(s => s.creados)
  const editados = useDemoStore(s => s.editados)
  const cancelados = useDemoStore(s => s.cancelados)
  const inscrito = useDemoStore(s => s.inscritos.includes(id))
  const gestion = useDemoStore(s => s.gestion[id])
  const perfilesCuentas = useDemoStore(s => s.perfilesCuentas)
  const tierUsuario = useDemoStore(s => s.tierUsuario)
  const [chatAbierto, setChatAbierto] = useState(false)
  const [selJugador, setSelJugador] = useState<Jugador | null>(null)
  // (D) Un rival de CUENTA abre su perfil público REAL (MiniPerfilCuenta), no
  // el mini-perfil de muestra con stats inventadas; y sin rango fabricado.
  const [verCuenta, setVerCuenta] = useState<string | null>(null)
  const esCuentaJugador = (j: Jugador) => j.id.startsWith(ID_CUENTA_PREFIJO)
  const abrirJugador = (j: Jugador) => {
    if (esCuentaJugador(j)) setVerCuenta(j.id.slice(ID_CUENTA_PREFIJO.length))
    else setSelJugador(j)
  }
  // Scouting v1: «Estudiar a {rival}» junto al próximo rival. Acceso contextual
  // desde la sala Live = Platino; sin él, el botón abre el TierSheet y, si el
  // usuario activa el tier ahí mismo, el scouting pendiente se abre al cerrar.
  const [scout, setScout] = useState<string | null>(null)
  const [tierScout, setTierScout] = useState(false)
  const scoutPendiente = useRef<string | null>(null)
  const estudiar = (nombre: string) => {
    if (tieneAcceso(tierUsuario, 'Platino')) setScout(nombre)
    else { scoutPendiente.current = nombre; setTierScout(true) }
  }

  const t = torneosEfectivos(creados, editados, cancelados, { conCancelados: true }).find(x => x.id === id) ?? getTorneo(id)
  const pool = useMemo(() => (t ? rankingPorJuego(t.juego) : []), [t])
  const miEmail = useSesionStore(s => s.sesion?.email?.toLowerCase() ?? null)

  // (A, 31-08) MI PARTIDA REAL: si mi cuenta está en los seeds del bracket del
  // mundo, la sala deja la maqueta y pinta MI estado — último set con marcador,
  // match actual (rival + ronda reales, con enlace a la mesa con mid para el
  // doble reporte) y el siguiente cruce (los vivos del match hermano). La mesa
  // es pseudo-asignada (índice del match): la real la reparte el modo directo.
  const vistaReal = useMemo(() => {
    if (!t || !gestion?.generado || !miEmail) return null
    const miId = ID_CUENTA_PREFIJO + miEmail
    if (!(gestion.seeds ?? []).includes(miId)) return null
    const seeds = resolverSeeds(gestion.seeds ?? [], pool, t.juego, perfilesCuentas)
    const rondas = construirRondas(seeds, gestion.winners ?? {})
    let actual: MiMatchActual | null = null
    let ultimo: MiUltimoSet | null = null
    let eliminado = false
    let candidatos: Jugador[] = []
    rondas.forEach((matches) => matches.forEach((m, mi) => {
      const lado = m.a?.id === miId ? 'a' : m.b?.id === miId ? 'b' : null
      if (!lado) return
      const rival = lado === 'a' ? m.b : m.a
      if (m.ganador) {
        const p = gestion.puntos?.[m.id]
        const gane = m.ganador === lado
        if (rival) ultimo = { rival, gane, yo: lado === 'a' ? (p?.a ?? 0) : (p?.b ?? 0), el: lado === 'a' ? (p?.b ?? 0) : (p?.a ?? 0) }
        if (!gane) eliminado = true
      } else {
        actual = {
          rival: rival ?? null,
          ronda: nombreRonda(matches.length, idioma),
          mid: m.id,
          nMesa: (mi % 8) + 1,
          vsParam: `${m.a?.nombre ?? '—'} vs ${m.b?.nombre ?? '—'}`,
        }
        const hermano = matches[mi % 2 === 0 ? mi + 1 : mi - 1]
        if (hermano) candidatos = [hermano.a, hermano.b].filter(Boolean) as Jugador[]
      }
    }))
    const final = rondas[rondas.length - 1]?.[0]
    const campeon = !!final?.ganador && (final.ganador === 'a' ? final.a : final.b)?.id === miId
    return { actual: actual as MiMatchActual | null, ultimo: ultimo as MiUltimoSet | null, candidatos, campeon, eliminado }
  }, [t, gestion, miEmail, pool, perfilesCuentas, idioma])

  // Marcadores en vivo: del bracket REAL si el TO lo generó; si no, muestra.
  const marcadores = useMemo(() => {
    if (!t) return []
    if (gestion?.generado) {
      const seeds = resolverSeeds(gestion.seeds ?? [], pool, t.juego, perfilesCuentas)
      return construirRondas(seeds, gestion.winners ?? {}).flatMap(matches =>
        matches.filter(m => m.a && m.b).map(m => ({
          id: m.id, ronda: nombreRonda(matches.length, idioma),
          a: m.a!.nombre, b: m.b!.nombre,
          sa: gestion.puntos?.[m.id]?.a ?? null, sb: gestion.puntos?.[m.id]?.b ?? null,
          ganador: m.ganador ?? null,
        })))
    }
    return bracketDe(t.id).flatMap(r => r.matches.filter(m => m.a !== '—' && m.b !== '—').map(m => ({
      id: m.id, ronda: r.nombre, a: m.a, b: m.b, sa: m.scoreA, sb: m.scoreB, ganador: m.ganador ?? null,
    })))
  }, [t, gestion, pool, idioma, perfilesCuentas])

  if (!t) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Trophy size={40} className="text-[#8B8BA8]" />
        <p className="text-lg font-bold text-white">{tr('ges.torneoNoEncontrado')}</p>
        <Link href="/live" className="px-4 h-10 inline-flex items-center rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-semibold">{tr('lv.volverLive')}</Link>
      </div>
    )
  }

  const abierta = !!t.enDirecto || !!gestion?.generado
  // Tu próximo rival (demo): el 2º del ranking del juego; los posibles después,
  // el 3º y el 4º — con probabilidad por rating (elo-like, pública y honesta).
  const rivalActual = pool[1]
  const ultimoRival = pool[4]
  const candA = pool[2]
  const candB = pool[3]

  // Bloque «tu cuadro»: datos REALES si mi cuenta juega este bracket; maqueta
  // de muestra si no (torneos sembrados donde el usuario no está en los seeds).
  const rivalCuadro = vistaReal ? (vistaReal.actual?.rival ?? null) : rivalActual
  const rondaCuadro = vistaReal ? (vistaReal.actual?.ronda ?? '') : nombreRonda(4, idioma)
  const mesaCuadro = vistaReal ? (vistaReal.actual?.nMesa ?? 0) : 3
  const parCandidatos: [Jugador, Jugador] | null = vistaReal
    ? (vistaReal.candidatos.length === 2 ? [vistaReal.candidatos[0], vistaReal.candidatos[1]] : null)
    : (candA && candB ? [candA, candB] : null)
  const pA = parCandidatos ? Math.round((parCandidatos[0].rating / (parCandidatos[0].rating + parCandidatos[1].rating)) * 100) : 50

  return (
    <div className="relative min-h-screen pb-16 max-w-xl mx-auto lg:max-w-none lg:mx-0">
      {/* Cabecera */}
      <div className="relative h-40 lg:h-52 overflow-hidden lg:rounded-b-3xl">
        <TorneoArt t={t} className="absolute inset-0" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(8,8,15,0.25) 10%, rgba(11,13,19,0.7) 60%, #0D0F15 96%)' }} />
        <div className="relative flex items-center justify-between px-4 pt-5 safe-top">
          <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
          <span className={`inline-flex items-center gap-1 px-2.5 h-9 rounded-xl text-[11px] font-bold uppercase tracking-wider ${abierta ? 'bg-[#E63E54] text-white' : 'bg-black/50 text-[#9FC2FF] border border-[#4F8EF7]/40'}`}>
            {abierta ? <><Radio size={12} className="animate-pulse-heat" /> {tr('lv.salaAbierta')}</> : <><CalendarClock size={12} /> {tr('md.proximo')}</>}
          </span>
        </div>
        <div className="absolute bottom-3 left-5 right-5 lg:left-8 lg:right-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold">{tr('lv.salaLive')}</p>
          <h1 className="text-xl lg:text-3xl font-bold text-white text-display tracking-tight leading-tight truncate">{t.nombre}</h1>
        </div>
      </div>

      <div className="px-5 lg:px-8 mt-4">
        {!inscrito ? (
          <div className="card-premium p-5 text-center">
            <Users size={24} className="mx-auto text-[#8B8BA8]" />
            <p className="mt-2 text-sm font-bold text-white">{tr('lv.soloInscritos')}</p>
            <p className="mt-1 text-[12px] text-[#8B8BA8]">{tr('lv.soloInscritosSub')}</p>
            <Link href={`/torneo/${t.id}`} className="mt-4 inline-flex h-10 px-4 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold items-center">{tr('lv.verInscribirme')}</Link>
          </div>
        ) : !abierta ? (
          /* ── Sala aún cerrada: detalles + reglas, a la espera del TO ── */
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start space-y-5 lg:space-y-0">
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-[#4F8EF7]/35 bg-[#4F8EF7]/[0.08] px-4 py-3.5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#4F8EF7]/20 text-[#7FB0FF] shrink-0"><CalendarClock size={18} /></span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{tr('lv.cerradaTitulo')}</p>
                  <p className="text-xs text-[#9FC2FF]">{tr('lv.cerradaSub')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Dato icon={<Calendar size={14} className="text-[#B6FF3A]" />} label={tr('torneo.cuando')} value={t.fechaLabel} />
                <Dato icon={<MapPin size={14} className="text-[#4F8EF7]" />} label={tr('torneo.donde')} value={t.online ? 'Online' : t.local} />
                <Dato icon={<Trophy size={14} className="text-[#9B82FF]" />} label={tr('torneo.formato')} value={t.formato} />
                <Dato icon={<Users size={14} className="text-[#E0BE63]" />} label={tr('adm.plazas')} value={`${t.inscritos}/${t.plazas}`} />
              </div>
              <button onClick={() => setChatAbierto(true)} className="w-full h-11 rounded-xl bg-white/6 border border-white/10 text-[#B8B8CC] text-sm font-semibold flex items-center justify-center gap-2 hover:text-white transition-colors"><MessageSquare size={15} /> {tr('lv.chatSala')}</button>
            </div>
            <ReglasTorneo t={t} abiertoInicial />
          </div>
        ) : (
          /* ── Sala ABIERTA: tus mesas, marcadores, bracket y la emisión ── */
          <>
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start space-y-5 lg:space-y-0">
            <div className="space-y-4">
              {/* Tu combate + próximos rivales con probabilidad */}
              {/* TUS MESAS, en grande: la última jugada y la siguiente — con la
                  orden clara de si te toca IR YA o esperar a que te avisen.
                  Con cuenta en el bracket real (vistaReal) los datos son TUYOS;
                  sin bracket real, la maqueta de siempre. */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B8BA8]">{vistaReal ? tr('lv.tuUltimoSet') : tr('lv.ultimaMesa')}</p>
                  {vistaReal ? (
                    vistaReal.ultimo ? (
                      <>
                        <p className="mt-1 text-3xl lg:text-4xl font-bold text-white text-display leading-none font-mono-num">{vistaReal.ultimo.yo}–{vistaReal.ultimo.el}</p>
                        <p className="mt-2 text-[13px] text-[#B8B8CC]">vs <span className="text-white font-bold">{vistaReal.ultimo.rival.nombre}</span></p>
                        <p className={`mt-0.5 text-sm font-bold font-mono-num ${vistaReal.ultimo.gane ? 'text-[#2ED47A]' : 'text-[#FF8A8A]'}`}>{vistaReal.ultimo.gane ? tr('lv.ganaste') : tr('lv.perdiste')}</p>
                      </>
                    ) : (
                      <>
                        <p className="mt-1 text-4xl lg:text-5xl font-bold text-[#5B5B70] text-display leading-none">—</p>
                        <p className="mt-2 text-[12px] text-[#8B8BA8]">{tr('lv.sinSets')}</p>
                      </>
                    )
                  ) : (
                    <>
                      <p className="mt-1 text-4xl lg:text-5xl font-bold text-white text-display leading-none">M1</p>
                      {ultimoRival && (
                        <>
                          <p className="mt-2 text-[13px] text-[#B8B8CC]">vs <span className="text-white font-bold">{ultimoRival.nombre}</span></p>
                          <p className="mt-0.5 text-sm font-bold text-[#2ED47A] font-mono-num">{tr('lv.ganaste')} 2–0</p>
                        </>
                      )}
                    </>
                  )}
                </div>
                {vistaReal?.campeon ? (
                  <div className="rounded-2xl border border-[#E0BE63]/60 bg-[#E0BE63]/[0.1] p-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#E0BE63]">{tr('lv.siguienteMesa')}</p>
                    <p className="mt-1 text-3xl lg:text-4xl font-bold text-[#E0BE63] text-display leading-none">🏆</p>
                    <p className="mt-2 text-sm font-black uppercase tracking-wide text-[#E0BE63]">{tr('lv.campeonTu')}</p>
                    <p className="mt-0.5 text-[11px] text-[#D9C58A]">{tr('lv.campeonSub')}</p>
                  </div>
                ) : vistaReal?.eliminado ? (
                  <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B8BA8]">{tr('lv.siguienteMesa')}</p>
                    <p className="mt-1 text-3xl lg:text-4xl font-bold text-[#8B8BA8] text-display leading-none">✕</p>
                    <p className="mt-2 text-sm font-bold text-[#B8B8CC]">{tr('lv.eliminadoTu')}</p>
                    <p className="mt-0.5 text-[11px] text-[#8B8BA8]">{tr('lv.eliminadoSub')}</p>
                  </div>
                ) : (
                  <div className={`rounded-2xl border p-4 text-center ${t.enDirecto ? 'border-[#B6FF3A]/60 bg-[#B6FF3A]/[0.09]' : 'border-[#FF8A5C]/40 bg-[#FF8A5C]/[0.06]'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${t.enDirecto ? 'text-[#B6FF3A]' : 'text-[#FF8A5C]'}`}>{tr('lv.siguienteMesa')}</p>
                    {vistaReal ? (
                      <>
                        <p className="mt-1 text-2xl lg:text-3xl font-bold text-white text-display leading-tight">{vistaReal.actual ? vistaReal.actual.ronda.replace('Semifinales', 'Semis') : '—'}</p>
                        {vistaReal.actual?.rival
                          ? <p className="mt-2 text-[13px] text-[#B8B8CC]">vs <span className="text-white font-bold">{vistaReal.actual.rival.nombre}</span> · {tr('adm.mesa')} {vistaReal.actual.nMesa}</p>
                          : vistaReal.actual && <p className="mt-2 text-[12px] text-[#B8B8CC]">{tr('lv.esperandoCruce')}</p>}
                        {t.enDirecto && vistaReal.actual?.rival ? (
                          <p className="mt-0.5 text-sm font-black uppercase tracking-wide text-[#B6FF3A] animate-pulse-heat">{tr('lv.veYa')}</p>
                        ) : (
                          <p className="mt-0.5 text-[12px] font-bold text-[#FF8A5C]">{tr('lv.esperaAviso')}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="mt-1 text-4xl lg:text-5xl font-bold text-white text-display leading-none">{t.enDirecto ? 'M3' : '—'}</p>
                        {rivalActual && <p className="mt-2 text-[13px] text-[#B8B8CC]">vs <span className="text-white font-bold">{rivalActual.nombre}</span> · {nombreRonda(4, idioma)}</p>}
                        {t.enDirecto ? (
                          <p className="mt-0.5 text-sm font-black uppercase tracking-wide text-[#B6FF3A] animate-pulse-heat">{tr('lv.veYa')}</p>
                        ) : (
                          <p className="mt-0.5 text-[12px] font-bold text-[#FF8A5C]">{tr('lv.esperaAviso')}</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              {t.enDirecto && (vistaReal
                ? (vistaReal.actual?.rival && (
                  <Link href={`/torneo/${t.id}/mesa?n=${vistaReal.actual.nMesa}&vs=${encodeURIComponent(vistaReal.actual.vsParam)}&mid=${vistaReal.actual.mid}`}
                    className="h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-bold text-sm flex items-center justify-center gap-2">
                    <MapPin size={16} /> {tr('lv.verMiMesa')}
                  </Link>
                ))
                : (
                  <Link href={`/torneo/${t.id}/mesa?n=3&vs=${encodeURIComponent(`Cuartos vs ${rivalActual?.nombre ?? 'rival'}`)}`}
                    className="h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-bold text-sm flex items-center justify-center gap-2">
                    <MapPin size={16} /> {tr('lv.verMiMesa')}
                  </Link>
                ))}

              {(!vistaReal || rivalCuadro) && (
              <div className="rounded-2xl border border-[#B6FF3A]/40 bg-[#B6FF3A]/[0.07] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#B6FF3A] flex items-center gap-2"><span className="dot-live" /> {tr('lv.tuCuadro')}</p>
                {rivalCuadro && (
                  <button onClick={() => abrirJugador(rivalCuadro)} className="mt-2.5 w-full flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3 text-left hover:bg-white/[0.08] transition-colors">
                    <Swords size={18} className="text-[#B6FF3A] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{tr('lv.ahoraTuVs')} {rivalCuadro.nombre} {rivalCuadro.bandera}</p>
                      <p className="text-[11px] text-[#8B8BA8] flex items-center gap-1.5">{rondaCuadro} · {tr('adm.mesa')} {mesaCuadro}{rivalCuadro.main && <> · <PersonajeChip juegoId={t.juego} nombre={rivalCuadro.main} /></>}</p>
                    </div>
                    {esCuentaJugador(rivalCuadro)
                      ? <span className="px-2 h-6 inline-flex items-center rounded-full text-[10px] font-bold bg-white/8 text-[#B8B8CC] border border-white/15 shrink-0">{tr('lv.nuevo')}</span>
                      : <RangoChip rating={rivalCuadro.rating} />}
                  </button>
                )}
                {rivalCuadro && (
                  <button onClick={() => estudiar(rivalCuadro.nombre)}
                    className="mt-2 w-full h-9 rounded-xl border border-[#67E8F9]/35 bg-[#67E8F9]/[0.08] text-[#67E8F9] text-[12px] font-bold flex items-center justify-center gap-1.5 hover:bg-[#67E8F9]/[0.14] transition-colors">
                    <Search size={13} /> {conParams(tr('sc.estudiar'), { rival: rivalCuadro.nombre })}
                  </button>
                )}
                {parCandidatos && (
                  <div className="mt-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">{tr('lv.despuesCruzas')}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ p: parCandidatos[0], prob: pA }, { p: parCandidatos[1], prob: 100 - pA }].map(({ p, prob }) => (
                        <button key={p.id} onClick={() => abrirJugador(p)} className="rounded-xl bg-white/5 border border-white/10 p-3 text-left hover:bg-white/[0.08] transition-colors">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[13px] font-bold text-white truncate">{p.nombre} {p.bandera}</p>
                            <span className="text-[12px] font-bold text-[#B6FF3A] font-mono-num shrink-0">{prob}%</span>
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-white/8 overflow-hidden"><div className="h-full rounded-full bg-[#B6FF3A]" style={{ width: `${prob}%` }} /></div>
                          <p className="mt-1.5 text-[10px] text-[#8B8BA8] flex items-center gap-1">{p.main && <><PersonajeChip juegoId={t.juego} nombre={p.main} /> · </>}{p.victorias}V-{p.derrotas}D</p>
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[10px] text-[#6B6B85]">{tr('lv.probNota')}</p>
                  </div>
                )}
              </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Link href={`/torneo/${t.id}/bracket`} className="h-11 rounded-xl bg-white/6 border border-white/10 text-white text-sm font-semibold flex items-center justify-center gap-2"><ListTree size={15} className="text-[#9B82FF]" /> {tr('lv.bracketCompleto')}</Link>
                <button onClick={() => setChatAbierto(true)} className="h-11 rounded-xl bg-white/6 border border-white/10 text-white text-sm font-semibold flex items-center justify-center gap-2"><MessageSquare size={15} /> Chat</button>
              </div>
              <ReglasTorneo t={t} />
            </div>

            {/* Marcadores en vivo */}
            <div>
              <p className="eyebrow eyebrow-muted mb-2.5">{tr('lv.marcadores')}{gestion?.generado ? tr('lv.bracketRealSuf') : ''}</p>
              <div className="space-y-1.5">
                {marcadores.length === 0 && <p className="text-sm text-[#8B8BA8] card-premium p-4 text-center">{tr('lv.sinCombates')}</p>}
                {marcadores.map(m => {
                  const jugado = m.ganador !== null || (m.sa !== null && m.sb !== null && m.sa !== m.sb)
                  return (
                    <div key={m.id} className="flex items-center gap-3 rounded-2xl bg-white/4 border border-white/8 px-3.5 py-2.5">
                      <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-[#8B8BA8] font-bold">{m.ronda.replace('Semifinales', 'Semis').replace('Gran Final', 'G. Final')}</span>
                      <p className="flex-1 min-w-0 text-sm font-semibold truncate">
                        <span className={m.ganador === 'a' ? 'text-[#B6FF3A]' : 'text-white'}>{m.a}</span>
                        <span className="text-[#6B6B85]"> vs </span>
                        <span className={m.ganador === 'b' ? 'text-[#B6FF3A]' : 'text-white'}>{m.b}</span>
                      </p>
                      {m.sa !== null && m.sb !== null
                        ? <span className={`text-sm font-bold font-mono-num shrink-0 ${jugado ? 'text-white' : 'text-[#E0BE63]'}`}>{m.sa}–{m.sb}</span>
                        : <span className="text-[10px] uppercase tracking-wide text-[#8B8BA8] font-bold shrink-0">{tr('sd.pendiente')}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* LA EMISIÓN, incrustada directamente al fondo de la sala (ya no hay
              botón intermedio): el vídeo del TO o, si aún no conectó, el hueco. */}
          <div className="mt-6">
            <p className="eyebrow eyebrow-muted mb-2.5 flex items-center gap-2"><Radio size={12} className="text-[#E63E54]" /> {tr('lv.emision')}{t.enDirecto && t.viendo ? ` · ${t.viendo} ${tr('directo.viendo')}` : ''}</p>
            {t.videoUrl ? (
              <VideoEmbed url={t.videoUrl} titulo={t.nombre} className="rounded-2xl border border-white/10" />
            ) : (
              <div className="relative aspect-video w-full rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
                <TorneoArt t={t} className="absolute inset-0 opacity-35" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
                  <span className="h-14 w-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"><Radio size={22} className="text-white" /></span>
                  <p className="text-sm font-semibold text-white">{t.enDirecto ? tr('lv.sinSenal') : tr('lv.emisionLlegara')}</p>
                  <p className="text-[11px] text-[#8B8BA8]">{tr('lv.incrustaSola')}</p>
                </div>
              </div>
            )}
          </div>
          </>
        )}
      </div>

      {chatAbierto && <ChatTorneoSheet torneoId={t.id} torneoNombre={t.nombre} onClose={() => setChatAbierto(false)} />}
      {selJugador && <MiniPerfil jugador={selJugador} onClose={() => setSelJugador(null)} />}
      {verCuenta && <MiniPerfilCuenta email={verCuenta} onClose={() => setVerCuenta(null)} />}
      {scout && <ScoutingSheet nombre={scout} juego={t.juego} onClose={() => setScout(null)} />}
      {tierScout && (
        <TierSheet requerido="Platino" onClose={() => {
          setTierScout(false)
          const p = scoutPendiente.current
          scoutPendiente.current = null
          // Si activó el tier desde el sheet, el estudio pendiente se abre ya.
          if (p && tieneAcceso(useDemoStore.getState().tierUsuario, 'Platino')) setScout(p)
        }} />
      )}
    </div>
  )
}

function Dato({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card-premium p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold mb-1">{icon}{label}</div>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  )
}
