'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { NotificacionEnviada } from '@/types'
import { Bell, Send, Users, Eye, Clock, Zap } from 'lucide-react'
import { formatearFecha } from '@/lib/utils'

const LIMITES_TIER: Record<string, number> = {
  basico: 2,
  pro: 999,
  destacado: 999,
}

export default function NotificacionesPage() {
  const toast = useToast()
  const { local, trabajador } = useLocalPanelStore()
  const [titulo, setTitulo] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [enlace, setEnlace] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [historial, setHistorial] = useState<NotificacionEnviada[]>([])
  const [numSuscriptores, setNumSuscriptores] = useState(0)
  const [enviadasSemana, setEnviadasSemana] = useState(0)

  const ROLES_PERMITIDOS = ['dueno', 'gestor']
  const puedeEnviar = trabajador && ROLES_PERMITIDOS.includes(trabajador.rol)
  const limiteSemanal = LIMITES_TIER[local?.tier || 'basico'] ?? 2
  const restantes = Math.max(0, limiteSemanal - enviadasSemana)
  const haAlcanzadoLimite = restantes === 0 && local?.tier === 'basico'

  useEffect(() => {
    if (!local) return
    const lunes = new Date()
    lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7))
    lunes.setHours(0, 0, 0, 0)

    Promise.all([
      supabase.from('notificaciones_enviadas').select('*').eq('local_id', local.id)
        .order('enviada_at', { ascending: false }).limit(20),
      supabase.from('suscripciones').select('id', { count: 'exact' })
        .eq('local_id', local.id).eq('silenciada', false),
      supabase.from('notificaciones_enviadas').select('id', { count: 'exact' })
        .eq('local_id', local.id).eq('tipo', 'manual')
        .gte('enviada_at', lunes.toISOString()),
    ]).then(([notifRes, subRes, semanaRes]) => {
      if (notifRes.data) setHistorial(notifRes.data)
      setNumSuscriptores(subRes.count || 0)
      setEnviadasSemana(semanaRes.count || 0)
    })
  }, [local])

  const enviar = async () => {
    if (!titulo.trim() || !cuerpo.trim()) { toast.error('Título y mensaje son obligatorios'); return }
    if (!puedeEnviar) { toast.error('No tienes permisos para enviar notificaciones'); return }
    if (numSuscriptores === 0) { toast.info('No tienes suscriptores activos'); return }
    if (haAlcanzadoLimite) {
      toast.error(`Has alcanzado el límite de ${limiteSemanal} notificaciones/semana del tier básico. Sube a Pro para envíos ilimitados.`)
      return
    }

    setEnviando(true)

    // Register in DB (actual FCM push would go through an API route)
    const { error } = await supabase.from('notificaciones_enviadas').insert({
      local_id: local!.id,
      titulo: titulo.trim(),
      cuerpo: cuerpo.trim(),
      enlace: enlace.trim() || null,
      num_destinatarios: numSuscriptores,
      num_aperturas: 0,
      tipo: 'manual',
    })

    if (error) { toast.error('Error al registrar la notificación'); setEnviando(false); return }

    toast.success(`Notificación enviada a ${numSuscriptores} suscriptores`)
    setTitulo('')
    setCuerpo('')
    setEnlace('')
    setEnviadasSemana(c => c + 1)

    // Reload historial
    const { data } = await supabase.from('notificaciones_enviadas').select('*')
      .eq('local_id', local!.id).order('enviada_at', { ascending: false }).limit(20)
    if (data) setHistorial(data)
    setEnviando(false)
  }

  if (!local) return null

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Notificaciones</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#4F8EF7]/10 border border-[#4F8EF7]/30 rounded-xl">
          <Users size={14} className="text-[#4F8EF7]" />
          <span className="text-sm font-semibold text-[#4F8EF7]">{numSuscriptores} suscriptores</span>
        </div>
      </div>

      {!puedeEnviar && (
        <div className="flex items-center gap-2 p-3 bg-[#F39C12]/10 border border-[#F39C12]/30 rounded-xl text-sm text-[#F39C12]">
          Solo el dueño o gestor puede enviar notificaciones
        </div>
      )}

      {/* Contador semanal */}
      {local.tier === 'basico' && (
        <div className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
          haAlcanzadoLimite
            ? 'bg-[#E94560]/10 border-[#E94560]/30 text-[#E94560]'
            : 'bg-[#1A1A2E] border-[#2A2A3E] text-[#A0A0B8]'
        }`}>
          <div className="flex items-center gap-2 text-sm">
            <Zap size={14} />
            <span>
              <strong className="text-white">{enviadasSemana}/{limiteSemanal}</strong> envíos manuales esta semana (tier Básico)
            </span>
          </div>
          {haAlcanzadoLimite && (
            <span className="text-xs">Sube a Pro para envíos ilimitados</span>
          )}
        </div>
      )}

      {/* Formulario */}
      <div className="bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] p-4 space-y-4">
        <h2 className="font-bold text-white">Nueva notificación</h2>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#A0A0B8]">Título *</label>
          <input
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            maxLength={80}
            placeholder="Ej: ¡Esta noche tenemos DJ set!"
            className="w-full px-4 py-3 bg-[#0D0D1A] border border-[#2A2A3E] rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50"
          />
          <p className="text-xs text-right text-[#505065]">{titulo.length}/80</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#A0A0B8]">Mensaje *</label>
          <textarea
            value={cuerpo}
            onChange={e => setCuerpo(e.target.value)}
            rows={3}
            maxLength={200}
            placeholder="Mensaje breve y directo..."
            className="w-full px-4 py-3 bg-[#0D0D1A] border border-[#2A2A3E] rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50 resize-none"
          />
          <p className="text-xs text-right text-[#505065]">{cuerpo.length}/200</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#A0A0B8]">Enlace (opcional)</label>
          <input
            value={enlace}
            onChange={e => setEnlace(e.target.value)}
            placeholder="https://... o /local/..."
            className="w-full px-4 py-3 bg-[#0D0D1A] border border-[#2A2A3E] rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50"
          />
        </div>

        <Button
          fullWidth
          loading={enviando}
          disabled={!puedeEnviar || !titulo.trim() || !cuerpo.trim() || haAlcanzadoLimite}
          onClick={enviar}
        >
          <Send size={16} />
          {haAlcanzadoLimite ? 'Límite semanal alcanzado' : `Enviar a ${numSuscriptores} personas`}
        </Button>
      </div>

      {/* Historial */}
      {historial.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[#A0A0B8] uppercase tracking-wider">Historial</h2>
          {historial.map(n => (
            <div key={n.id} className="bg-[#1A1A2E] rounded-xl border border-[#2A2A3E] p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{n.titulo}</p>
                  <p className="text-xs text-[#A0A0B8] mt-0.5">{n.cuerpo}</p>
                </div>
                <Bell size={14} className="text-[#505065] shrink-0 mt-0.5" />
              </div>
              <div className="flex items-center gap-4 text-xs text-[#505065]">
                <span className="flex items-center gap-1">
                  <Users size={10} /> {n.num_destinatarios}
                </span>
                <span className="flex items-center gap-1">
                  <Eye size={10} /> {n.num_aperturas}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={10} /> {formatearFecha(n.enviada_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
