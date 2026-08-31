'use client'
import { useEffect, useRef } from 'react'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { useSesionStore } from '@/lib/stores/useSesionStore'
import { supabaseTorneum } from '@/lib/supabase/torneum'

// ─────────────────────────────────────────────────────────────────────────────
// Fase A del backend real (31-08): el PERFIL de una cuenta REAL vive en la
// tabla usuarios de Supabase y sobrevive a dispositivos.
// · PULL al entrar: usuarios → stores de la demo (foto, banner, bio, país,
//   tag, mains, favoritos y nombre de la sesión).
// · PUSH con debounce: cuando esos campos cambian en la demo, se suben.
// Solo actúa con sesion.real; las cuentas demo ni lo notan. Montado en los
// layouts (user) y (to), como BuzonCuenta. Tolerante a red caída: si Supabase
// no responde se sigue en local y se reintenta en el próximo cambio.
// ─────────────────────────────────────────────────────────────────────────────

type PerfilRemoto = {
  nombre: string; tag: string | null; foto: string | null; banner: string | null
  bio: string | null; pais: string; mains: Record<string, string[]>; juegos_favoritos: string[]
}

export function PerfilRealSync() {
  const sesion = useSesionStore(s => s.sesion)
  const fotoPerfil = useDemoStore(s => s.fotoPerfil)
  const bannerPerfil = useDemoStore(s => s.bannerPerfil)
  const bioPerfil = useDemoStore(s => s.bioPerfil)
  const paisJugador = useDemoStore(s => s.paisJugador)
  const userTag = useDemoStore(s => s.userTag)
  const mainsPerfil = useDemoStore(s => s.mainsPerfil)
  const juegosFavoritos = useDemoStore(s => s.juegosFavoritos)

  const traido = useRef<string | null>(null)   // email ya sincronizado (pull)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // PULL: una vez por sesión real, la base manda sobre el estado local.
  useEffect(() => {
    const email = sesion?.real ? sesion.email : null
    if (!email || traido.current === email) return
    const sb = supabaseTorneum()
    if (!sb) return
    let cancelado = false
    ;(async () => {
      const { data, error } = await sb.from('usuarios')
        .select('nombre,tag,foto,banner,bio,pais,mains,juegos_favoritos')
        .limit(1).maybeSingle<PerfilRemoto>()
      if (cancelado || error || !data) return
      traido.current = email
      const st = useDemoStore.getState()
      useDemoStore.setState({
        ...(data.foto !== undefined ? { fotoPerfil: data.foto } : {}),
        ...(data.banner !== undefined ? { bannerPerfil: data.banner } : {}),
        bioPerfil: data.bio ?? '',
        paisJugador: data.pais || st.paisJugador,
        ...(data.tag ? { userTag: data.tag } : {}),
        ...(data.mains && Object.keys(data.mains).length ? { mainsPerfil: data.mains } : {}),
        ...(data.juegos_favoritos?.length ? { juegosFavoritos: data.juegos_favoritos } : {}),
      })
      if (data.nombre && data.nombre !== sesion?.nombre) {
        const ses = useSesionStore.getState().sesion
        if (ses?.real) useSesionStore.setState({ sesion: { ...ses, nombre: data.nombre } })
      }
    })()
    return () => { cancelado = true }
  }, [sesion])

  // PUSH: cambios de identidad → usuarios (debounce 1,5 s). El RLS limita el
  // UPDATE a la propia fila (auth_id = auth.uid()), sin ids por medio.
  useEffect(() => {
    if (!sesion?.real || traido.current !== sesion.email) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const sb = supabaseTorneum()
      if (!sb) return
      const uid = (await sb.auth.getUser()).data.user?.id
      if (!uid) return
      await sb.from('usuarios').update({
        foto: fotoPerfil, banner: bannerPerfil, bio: bioPerfil,
        pais: paisJugador, ...(userTag ? { tag: userTag } : {}),
        mains: mainsPerfil, juegos_favoritos: juegosFavoritos,
      }).eq('auth_id', uid)   // mejor esfuerzo: si falla, reintenta el próximo cambio
    }, 1500)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [sesion, fotoPerfil, bannerPerfil, bioPerfil, paisJugador, userTag, mainsPerfil, juegosFavoritos])

  return null
}
