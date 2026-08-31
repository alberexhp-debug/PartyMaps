'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { UserPlus, Check, Clock, ArrowRight } from '@/components/todh/iconosTorneum'
import { LogIn } from 'lucide-react'
import { useT, conParams } from '@/lib/i18n'

type Estado = 'cargando' | 'enviada' | 'aceptada' | 'login' | 'error' | 'yo'

/**
 * Enlace de invitación a amistad: /amigo/[id].
 * Si el visitante está logueado, envía la solicitud al usuario [id] (y la
 * acepta si ya había una en sentido contrario). Si no, le invita a entrar.
 */
export default function AmigoInvitePage() {
  const { t: tr } = useT()
  const { id } = useParams<{ id: string }>()
  const { usuario, isLoading } = useAuthStore()
  const [estado, setEstado] = useState<Estado>('cargando')
  const [nombre, setNombre] = useState('')

  useEffect(() => {
    if (isLoading) return
    if (!usuario) { setEstado('login'); return }
    if (usuario.id === id) { setEstado('yo'); return }
    fetch('/api/amigos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destino_id: id }),
    })
      .then(async r => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .then(({ ok, d }) => {
        if (!ok) { setEstado('error'); return }
        setNombre(d.nombre || '')
        setEstado(d.estado === 'aceptada' ? 'aceptada' : 'enviada')
      })
      .catch(() => setEstado('error'))
  }, [isLoading, usuario, id])

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      {estado === 'cargando' && <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-[#B6FF3A]" />}

      {estado === 'enviada' && (
        <Card icon={<Clock size={30} className="text-[#F39C12]" />} titulo={tr('inv.enviadaT')}
          texto={conParams(tr('inv.enviadaC'), { nombre: nombre || tr('inv.tuAmigo') })}
          cta={{ href: '/amigos', label: tr('inv.verAmigos') }} />
      )}
      {estado === 'aceptada' && (
        <Card icon={<Check size={30} className="text-[#27AE60]" />} titulo={tr('inv.aceptadaT')}
          texto={conParams(tr('inv.aceptadaC'), { nombre: nombre || tr('inv.tuAmigo') })}
          cta={{ href: '/amigos', label: tr('inv.verAmigos') }} />
      )}
      {estado === 'yo' && (
        <Card icon={<UserPlus size={30} className="text-[#B6FF3A]" />} titulo={tr('inv.yoT')}
          texto={tr('inv.yoC')}
          cta={{ href: '/amigos', label: tr('inv.irAmigos') }} />
      )}
      {estado === 'login' && (
        <Card icon={<LogIn size={30} className="text-[#B6FF3A]" />} titulo={tr('inv.loginT')}
          texto={tr('inv.loginC')}
          cta={{ href: '/login', label: tr('inv.entrar') }} />
      )}
      {estado === 'error' && (
        <Card icon={<UserPlus size={30} className="text-[#8B8BA8]" />} titulo={tr('inv.errorT')}
          texto={tr('inv.errorC')}
          cta={{ href: '/mapa', label: tr('inv.irMapa') }} />
      )}
    </div>
  )
}

function Card({ icon, titulo, texto, cta }: { icon: React.ReactNode; titulo: string; texto: string; cta: { href: string; label: string } }) {
  return (
    <div className="w-full max-w-xs space-y-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/5 border border-white/10">{icon}</div>
      <div>
        <h1 className="text-xl font-black text-white">{titulo}</h1>
        <p className="mt-1.5 text-sm text-[#A0A0B8]">{texto}</p>
      </div>
      <Link href={cta.href} className="inline-flex items-center gap-1.5 rounded-xl bg-[#B6FF3A] px-5 py-2.5 text-sm font-semibold text-[#0A0A0F]">
        {cta.label} <ArrowRight size={15} />
      </Link>
    </div>
  )
}
